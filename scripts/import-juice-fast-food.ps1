param(
  [string]$RestaurantId = "juice-fast-food",
  [string]$OwnerId = "owner_juice_fast_food",
  [string]$OwnerEmail = "juicefastfood@feastfleet.in",
  [string]$OwnerPassword = "Juice@12345",
  [string]$ExcelPath = "C:\Users\mradu\Downloads\converted_menu_template.xlsx",
  [string]$BannerPath = "C:\Users\mradu\OneDrive\Pictures\Screenshots 1\Screenshot 2026-05-18 135954.png",
  [string]$ProjectId = "feastfleet-54b7e",
  [string]$ApiKey = "AIzaSyAjz7-JdOVMYXHEsb-BOQ0V3MoaGH2Qo_Y"
)

$ErrorActionPreference = "Stop"

function Get-ColumnIndex {
  param([string]$CellRef)
  $letters = ($CellRef -replace '[0-9]', '').ToUpperInvariant()
  $index = 0
  foreach ($char in $letters.ToCharArray()) {
    $index = ($index * 26) + ([int][char]$char - [int][char]'A') + 1
  }
  return $index - 1
}

function Get-CellText {
  param($Cell, [xml]$SheetXml, [System.Xml.XmlNamespaceManager]$Ns, [array]$SharedStrings)
  $valueNode = $Cell.SelectSingleNode('x:v', $Ns)
  $inlineNode = $Cell.SelectSingleNode('x:is/x:t', $Ns)
  if ($inlineNode) { return [string]$inlineNode.'#text' }
  if (-not $valueNode) { return "" }
  $value = [string]$valueNode.'#text'
  if ($Cell.t -eq "s") { return [string]$SharedStrings[[int]$value] }
  return $value
}

function Read-XlsxRows {
  param([string]$Path)

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)

  try {
    $sharedStrings = @()
    $sharedEntry = $zip.GetEntry('xl/sharedStrings.xml')
    if ($sharedEntry) {
      $reader = [System.IO.StreamReader]::new($sharedEntry.Open())
      [xml]$sharedXml = $reader.ReadToEnd()
      $reader.Close()
      $sharedNs = [System.Xml.XmlNamespaceManager]::new($sharedXml.NameTable)
      $sharedNs.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
      foreach ($item in $sharedXml.SelectNodes('//x:si', $sharedNs)) {
        $parts = $item.SelectNodes('.//x:t', $sharedNs) | ForEach-Object { $_.'#text' }
        $sharedStrings += ($parts -join '')
      }
    }

    $sheetEntry = $zip.GetEntry('xl/worksheets/sheet1.xml')
    [xml]$sheetXml = ([System.IO.StreamReader]::new($sheetEntry.Open())).ReadToEnd()
    $sheetNs = [System.Xml.XmlNamespaceManager]::new($sheetXml.NameTable)
    $sheetNs.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')

    $rows = @()
    foreach ($row in $sheetXml.SelectNodes('//x:sheetData/x:row', $sheetNs)) {
      $values = @{}
      foreach ($cell in $row.SelectNodes('x:c', $sheetNs)) {
        $values[(Get-ColumnIndex $cell.r)] = Get-CellText $cell $sheetXml $sheetNs $sharedStrings
      }

      $maxColumn = if ($values.Keys.Count) { ($values.Keys | Measure-Object -Maximum).Maximum } else { -1 }
      $cells = @()
      for ($i = 0; $i -le $maxColumn; $i++) {
        $cells += if ($values.ContainsKey($i)) { $values[$i] } else { "" }
      }
      $rows += ,$cells
    }

    return $rows
  }
  finally {
    $zip.Dispose()
  }
}

function Convert-ToFirestoreValue {
  param($Value)

  if ($null -eq $Value) { return @{ nullValue = $null } }
  if ($Value -is [bool]) { return @{ booleanValue = $Value } }
  if ($Value -is [int] -or $Value -is [long]) { return @{ integerValue = [string]$Value } }
  if ($Value -is [double] -or $Value -is [decimal]) { return @{ doubleValue = [double]$Value } }
  if ($Value -is [array]) {
    return @{ arrayValue = @{ values = @($Value | ForEach-Object { Convert-ToFirestoreValue $_ }) } }
  }
  if ($Value -is [hashtable]) {
    return @{ mapValue = @{ fields = Convert-ToFirestoreFields $Value } }
  }

  return @{ stringValue = [string]$Value }
}

function Convert-ToFirestoreFields {
  param([hashtable]$Data)

  $fields = @{}
  foreach ($key in $Data.Keys) {
    $fields[$key] = Convert-ToFirestoreValue $Data[$key]
  }
  return $fields
}

function Set-FirestoreDocument {
  param([string]$Path, [hashtable]$Data)

  $encodedPath = ($Path -split '/' | ForEach-Object { [System.Uri]::EscapeDataString($_) }) -join '/'
  $url = "https://firestore.googleapis.com/v1/projects/$ProjectId/databases/(default)/documents/$encodedPath" + "?key=$ApiKey"
  $body = @{ fields = Convert-ToFirestoreFields $Data } | ConvertTo-Json -Depth 30
  Invoke-RestMethod -Method Patch -Uri $url -ContentType "application/json" -Body $body | Out-Null
}

function To-Bool {
  param($Value)
  return @("true", "yes", "1") -contains ([string]$Value).Trim().ToLowerInvariant()
}

if (-not (Test-Path -LiteralPath $ExcelPath)) {
  throw "Excel file not found: $ExcelPath"
}
if (-not (Test-Path -LiteralPath $BannerPath)) {
  throw "Banner image not found: $BannerPath"
}

$rows = Read-XlsxRows $ExcelPath
if ($rows.Count -lt 2) {
  throw "Excel file does not contain menu rows."
}

$headers = $rows[0] | ForEach-Object { ([string]$_).Trim() }
$menuItems = @()
for ($i = 1; $i -lt $rows.Count; $i++) {
  $row = $rows[$i]
  $record = @{}
  for ($j = 0; $j -lt $headers.Count; $j++) {
    if ($headers[$j]) { $record[$headers[$j]] = if ($j -lt $row.Count) { $row[$j] } else { "" } }
  }

  if (-not ([string]$record.name).Trim()) { continue }
  $itemNumber = $menuItems.Count + 1
  $menuItems += @{
    id = "$RestaurantId-$itemNumber"
    name = ([string]$record.name).Trim()
    description = ([string]$record.description).Trim()
    price = [double]$record.price
    category = if ([string]$record.category) { ([string]$record.category).Trim() } else { "General" }
    available = To-Bool $record.available
    veg = To-Bool $record.veg
    bestseller = To-Bool $record.bestseller
    spicy = To-Bool $record.spicy
    image = ([string]$record.imageUrl).Trim()
    imageUrl = ([string]$record.imageUrl).Trim()
    prepTime = [int]$record.prepTime
    isPopular = To-Bool $record.bestseller
    createdAt = (Get-Date).ToUniversalTime().ToString("o")
    updatedAt = (Get-Date).ToUniversalTime().ToString("o")
  }
}

$bannerBytes = [System.IO.File]::ReadAllBytes($BannerPath)
$bannerDataUrl = "data:image/png;base64," + [Convert]::ToBase64String($bannerBytes)
$now = (Get-Date).ToUniversalTime().ToString("o")

Set-FirestoreDocument "restaurants/$RestaurantId" @{
  name = "Juice & Fast Food"
  cuisine = "Fast Food"
  description = "Fresh juices, rolls, burgers, sandwiches and fast food."
  rating = 4.5
  reviewCount = 0
  deliveryTime = "20-35 min"
  hasOwnDelivery = $false
  deliveryFee = 30
  minOrder = 99
  address = "Restaurant address pending"
  lat = 0
  lng = 0
  image = $bannerDataUrl
  isOpen = $true
  isFeatured = $true
  tags = @("Fast Food", "Juices", "Rolls")
  offer = "Fresh ingredients. Great taste. Every time."
  ownerId = $OwnerId
  activeDays = @("sun", "mon", "tue", "wed", "thu", "fri", "sat")
  openingTime = "10:00"
  closingTime = "23:00"
  contactEmail = $OwnerEmail
  contactPhone = ""
  createdAt = $now
  updatedAt = $now
}

Set-FirestoreDocument "users/$OwnerId" @{
  id = $OwnerId
  name = "Juice & Fast Food HQ"
  email = $OwnerEmail
  password = $OwnerPassword
  role = "restaurant"
  restaurantId = $RestaurantId
  avatar = "JF"
  wallet = 0
  feastCoins = 0
  favourites = @()
  createdAt = $now
  updatedAt = $now
}

Set-FirestoreDocument "loginCredentials/$OwnerId" @{
  uid = $OwnerId
  email = $OwnerEmail
  password = $OwnerPassword
  role = "restaurant"
  name = "Juice & Fast Food HQ"
  avatar = "JF"
}

foreach ($item in $menuItems) {
  Set-FirestoreDocument "restaurants/$RestaurantId/menu/$($item.id)" $item
}

Write-Output "Imported restaurant '$RestaurantId'."
Write-Output "Menu items imported: $($menuItems.Count)"
Write-Output "Restaurant login: $OwnerEmail / $OwnerPassword"
