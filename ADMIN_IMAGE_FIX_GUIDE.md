# Quick Admin Reference: Fixing Menu Item Images

## Problem: Images Not Showing or Not Matching

### Step 1: Identify the Problem

**Check if item needs fixing:**
- Open menu item details
- If image is missing or generic food photo
- If image doesn't match the dish

### Step 2: Choose Your Solution

#### Solution A: Update Item Name or Category
**Easiest - No API Needed**

1. Edit menu item name to include a keyword from the list below
2. Edit category to match available categories  
3. Refresh page to see new image

**Recommended Item Names with Keywords:**
- "Double Afghani Chaap Roll" ✓ (contains "chaap roll")
- "Chicken Biryani" ✓ (contains "biryani")
- "Tandoori Chicken" ✓ (contains "tandoori chicken")
- "Paneer Tikka" ✓ (contains "paneer tikka")
- "Fried Rice" ✓ (contains "fried rice")

**Problem Names:**
- "Double Roll" ✗ (too generic, needs "chaap roll" or similar)
- "Special Dish" ✗ (not recognized)
- "Item #1" ✗ (no food keywords)

#### Solution B: Use API to Update Single Item
**Best for Quick Fixes**

```bash
# Update one menu item's image
curl -X POST http://localhost:5000/api/menu-images/update-item \
  -H "Content-Type: application/json" \
  -d '{
    "adminId": "YOUR_ADMIN_ID",
    "restaurantId": "YOUR_RESTAURANT_ID",
    "itemId": "MENU_ITEM_ID",
    "imageUrl": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500"
  }'
```

**Finding Your IDs:**
- `adminId`: Your admin account ID
- `restaurantId`: Your restaurant ID (visible in Firebase or admin panel)
- `itemId`: Menu item ID (visible in database)
- `imageUrl`: Use URLs from recommended sources below

#### Solution C: Batch Update Multiple Items
**Best for Fixing Many Items**

```bash
curl -X POST http://localhost:5000/api/menu-images/batch-update \
  -H "Content-Type: application/json" \
  -d '{
    "adminId": "YOUR_ADMIN_ID",
    "restaurantId": "YOUR_RESTAURANT_ID",
    "items": [
      {
        "itemId": "item1",
        "imageUrl": "https://images.unsplash.com/photo-xxx?w=500"
      },
      {
        "itemId": "item2",
        "imageUrl": "https://images.unsplash.com/photo-yyy?w=500"
      }
    ]
  }'
```

### Step 3: Get Good Image URLs

**Best Free Image Sources:**

1. **Unsplash** - Professional food photos
   - https://unsplash.com/search/photos/chaap-roll
   - https://unsplash.com/search/photos/chicken-biryani
   - https://unsplash.com/search/photos/tandoori-chicken
   - Right-click → Copy image link

2. **Pexels** - Quality images
   - https://www.pexels.com/search/food/

3. **Pixabay** - Royalty-free
   - https://pixabay.com/search/biryani/

4. **Use Your Own Photos**
   - Upload from restaurant camera/phone
   - Use Cloudinary/Imgur for hosting

### Step 4: Verify It Worked

**Quick Check:**
1. Clear browser cache (Ctrl+Shift+Del)
2. Refresh page
3. Image should appear

**Test API:**
```
GET /api/menu-images/resolve?name=Your%20Item%20Name&category=Your%20Category
```

## Reference: Working Keywords

### Rolls (Add to Item Name)
- "Chaap Roll" - Gets roll image
- "Chicken Roll" - Gets roll image
- "Paneer Roll" - Gets roll image
- "Egg Roll" - Gets roll image

### Biryani
- "Biryani" (in name)
- "Mandi" (in name)
- "Dum Biryani" (in name)

### Starters
- Include "Tandoori", "Tikka", "Starter", "Paneer"
- Category: "Starters" or "Veg Starters"

### Breads
- "Naan", "Roti", "Paratha" (in name)
- Category: "Breads"

### Curries & Gravies
- "Butter Chicken", "Curry", "Gravy" (in name)
- Category: "Gravy"

### Rice Items
- "Fried Rice", "Rice" (in name)
- Category: "Rice"

### Eggs
- "Omelette", "Egg Curry", "Egg Bhurji" (in name)
- Category: "Egg Items"

### Noodles
- "Maggi", "Noodles", "Hakka", "Chow Mein" (in name)
- Category: "Noodles"

### Beverages
- "Coffee", "Juice", "Shake" (in name)
- Category: "Shakes", "Juices"

## Troubleshooting

### Image Still Not Showing?
1. Check image URL is valid (open in new tab)
2. Check category spelling
3. Clear browser cache completely
4. Try updating database directly with Firebase Console

### Image Looks Wrong?
1. Use a better image URL from sources above
2. Update using API or manual database edit
3. Clear browser cache after update

### Unsure About Item ID?
1. Open Firebase Console
2. Go to restaurants > YOUR_RESTAURANT > menu
3. Item ID is the document name

### Need Help?
1. Check IMAGE_RESOLUTION_GUIDE.md for detailed info
2. Run diagnostics: GET /api/menu-images/diagnostics
3. Review IMAGE_FIX_SUMMARY.md for complete documentation

## Common Item Images

| Dish | Keyword | Category | Image Works? |
|------|---------|----------|--------------|
| Chaap Roll | chaap roll | rolls | Yes - Use "Chaap Roll" in name |
| Chicken Biryani | biryani | - | Yes - Use "Biryani" in name |
| Tandoori Chicken | tandoori chicken | starters | Yes - Use full name |
| Paneer Tikka | paneer tikka | starters | Yes - Use full name |
| Butter Chicken | butter chicken | gravy | Yes - Use full name |
| Fried Rice | fried rice | rice | Yes - Use "Fried Rice" in name |
| Egg Curry | egg curry | egg items | Yes - Use "Egg Curry" in name |
| Naan | naan | breads | Yes - Use "Naan" in name |

## Sample API Requests (Ready to Use)

Replace placeholders with your actual IDs:

```bash
# Update single item
curl -X POST http://localhost:5000/api/menu-images/update-item \
  -H "Content-Type: application/json" \
  -d '{
    "adminId": "REPLACE_WITH_ADMIN_ID",
    "restaurantId": "REPLACE_WITH_RESTAURANT_ID",
    "itemId": "REPLACE_WITH_ITEM_ID",
    "imageUrl": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&auto=format&fit=crop&q=72"
  }'

# Check image resolution
GET http://localhost:5000/api/menu-images/resolve?name=Double%20Afghani%20Chaap%20Roll&category=Rolls

# Run diagnostics
GET http://localhost:5000/api/menu-images/diagnostics?name=Double%20Afghani%20Chaap%20Roll&adminId=REPLACE_WITH_ADMIN_ID
```

---

**Last Updated**: May 23, 2026
**Quick Links**: 
- Full Guide: IMAGE_RESOLUTION_GUIDE.md
- Technical Details: IMAGE_FIX_SUMMARY.md
