const IMAGE_BY_KEYWORD = [
  // ROLLS - Specific varieties
  ['afghani chaap roll', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&auto=format&fit=crop&q=72'],
  ['masala chaap roll', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&auto=format&fit=crop&q=72'],
  ['chaap roll', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&auto=format&fit=crop&q=72'],
  ['chicken roll', 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=72'],
  ['mutton roll', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&auto=format&fit=crop&q=72'],
  ['paneer roll', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&auto=format&fit=crop&q=72'],
  ['egg roll', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&auto=format&fit=crop&q=72'],
  ['veg roll', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&auto=format&fit=crop&q=72'],
  ['kathi roll', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&auto=format&fit=crop&q=72'],
  ['cheese roll', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&auto=format&fit=crop&q=72'],
  ['spring roll', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&auto=format&fit=crop&q=72'],
  ['roll', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&auto=format&fit=crop&q=72'],
  
  // BIRYANI
  ['chicken biryani', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=72'],
  ['mutton biryani', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=72'],
  ['veg biryani', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=72'],
  ['hyderabadi biryani', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=72'],
  ['dum biryani', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=72'],
  ['biryani', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=72'],
  ['mandi', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=72'],
  
  // TANDOORI & GRILLED
  ['tandoori chicken', 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=72'],
  ['tandoori', 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=72'],
  ['al faham', 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=72'],
  ['chicken tikka', 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=72'],
  ['malai tikka', 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=72'],
  ['paneer tikka', 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop&q=72'],
  
  // FRIED CHICKEN
  ['crunchy fried chicken', 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=500&auto=format&fit=crop&q=72'],
  ['boneless fried chicken', 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=500&auto=format&fit=crop&q=72'],
  ['fried chicken', 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=500&auto=format&fit=crop&q=72'],
  ['kfc', 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=500&auto=format&fit=crop&q=72'],
  ['crispy chicken', 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=500&auto=format&fit=crop&q=72'],
  
  // GRAVY & CURRIES
  ['butter chicken', 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=72'],
  ['chicken gravy', 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=72'],
  ['chicken curry', 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=72'],
  ['mutton curry', 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=72'],
  ['mutton gravy', 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=72'],
  ['gravy', 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=72'],
  ['shahi paneer', 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=72'],
  
  // PANEER
  ['chilli paneer', 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop&q=72'],
  ['paneer 65', 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop&q=72'],
  ['paneer', 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=72'],
  
  // BREADS
  ['naan', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=72'],
  ['butter naan', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=72'],
  ['garlic naan', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=72'],
  ['roti', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=72'],
  ['tandoori roti', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=72'],
  ['paratha', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=72'],
  
  // RICE
  ['fried rice', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=72'],
  ['chicken fried rice', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=72'],
  ['egg fried rice', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=72'],
  ['veg fried rice', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=72'],
  ['rice', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=72'],
  
  // THALI
  ['thali', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=72'],
  ['veg thali', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=72'],
  ['chicken thali', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=72'],
  ['egg thali', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=72'],
  
  // EGG
  ['egg curry', 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&auto=format&fit=crop&q=72'],
  ['egg items', 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&auto=format&fit=crop&q=72'],
  ['omelette', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=72'],
  ['egg bhurji', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=72'],
  ['boiled egg', 'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=500&auto=format&fit=crop&q=72'],
  
  // NOODLES
  ['maggi', 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=500&auto=format&fit=crop&q=72'],
  ['hakka noodles', 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=72'],
  ['chow mein', 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=72'],
  ['noodles', 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=72'],
  
  // STARTERS
  ['veg starters', 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop&q=72'],
  ['veg items', 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=72'],
  
  // MUTTON
  ['mutton', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=72'],
  
  // FAST FOOD
  ['burger', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=72'],
  ['sandwich', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=72'],
  ['fries', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=72'],
  ['salad', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=72'],
  
  // BEVERAGES
  ['cold coffee', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500&auto=format&fit=crop&q=72'],
  ['coffee', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500&auto=format&fit=crop&q=72'],
  ['juice', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500&auto=format&fit=crop&q=72'],
  ['shake', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=72'],
  
  // FRUITS & DESSERTS
  ['mango', 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=500&auto=format&fit=crop&q=72'],
  ['banana', 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=500&auto=format&fit=crop&q=72'],
  ['papaya', 'https://images.unsplash.com/photo-1617112848923-cc2234396a8d?w=500&auto=format&fit=crop&q=72'],
  ['pineapple', 'https://images.unsplash.com/photo-1589820296156-2454bb8a6ad1?w=500&auto=format&fit=crop&q=72'],
  ['strawberry', 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=500&auto=format&fit=crop&q=72'],
  ['watermelon', 'https://images.unsplash.com/photo-1526841535632-ef3be0b2f4d8?w=500&auto=format&fit=crop&q=72'],
  ['fruit salad', 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=500&auto=format&fit=crop&q=72'],
  ['chocolate', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=72'],
  ['dessert', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=72'],
];

const IMAGE_BY_CATEGORY = {
  // Rolls
  rolls: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&auto=format&fit=crop&q=72',
  'chaap rolls': 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&auto=format&fit=crop&q=72',
  'chicken rolls': 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&auto=format&fit=crop&q=72',
  'paneer rolls': 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&auto=format&fit=crop&q=72',
  
  // Biryani
  biryani: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=72',
  'biryani & mandi': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=72',
  
  // Starters
  starters: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=72',
  'veg starters': 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop&q=72',
  'chicken starters': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=72',
  
  // Fried Items
  'fried items': 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=500&auto=format&fit=crop&q=72',
  'fried chicken': 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=500&auto=format&fit=crop&q=72',
  
  // Gravy/Curries
  gravy: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=72',
  curries: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=72',
  
  // Breads
  breads: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=72',
  'indian breads': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=72',
  
  // Rice
  rice: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=72',
  'rice items': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=72',
  
  // Traditional Plates
  thali: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=72',
  
  // Egg Items
  'egg items': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&auto=format&fit=crop&q=72',
  eggs: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&auto=format&fit=crop&q=72',
  
  // Noodles
  maggi: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=500&auto=format&fit=crop&q=72',
  noodles: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=72',
  'chinese noodles': 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=72',
  
  // Fast Food
  burgers: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=72',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=72',
  sandwich: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=72',
  salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=72',
  
  // Shakes & Beverages
  shakes: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=72',
  juices: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500&auto=format&fit=crop&q=72',
  beverages: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500&auto=format&fit=crop&q=72',
  
  // Veg Items
  'veg items': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=72',
  paneer: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=72',
};

const normalizeImagePromptPart = (value) => String(value || '')
  .replace(/\([^)]*\)/g, ' ')
  .replace(/[^a-z0-9\s.-]/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function resolveGeneratedMenuItemImage(item = {}) {
  const name = normalizeImagePromptPart(item.name || item.title);
  const category = normalizeImagePromptPart(item.category);
  if (!name) return '';

  const prompt = [
    'realistic professional food photography',
    name,
    category,
    'restaurant menu item',
    'single dish on a plate',
    'natural light',
    'no text',
    'no logo',
  ].filter(Boolean).join(', ');

  const seed = encodeURIComponent(`${name}-${category || 'food'}`.toLowerCase());
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=640&height=480&seed=${seed}&nologo=true&enhance=true`;
}

function resolveMenuItemImage(item = {}) {
  if (item.image) return item.image;
  const text = `${item.name || ''} ${item.category || ''}`.toLowerCase();
  const match = IMAGE_BY_KEYWORD.find(([keyword]) => text.includes(keyword));
  if (match) return match[1];
  return IMAGE_BY_CATEGORY[String(item.category || '').toLowerCase()]
    || resolveGeneratedMenuItemImage(item)
    || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format&fit=crop&q=72';
}

const imageCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const normalizeQuery = (item = {}) => {
  const name = String(item.name || item.title || '').trim();
  const category = String(item.category || '').trim();
  return [name, category, 'food dish'].filter(Boolean).join(' ');
};

const buildSearchQueries = (item = {}) => {
  const name = String(item.name || item.title || '').trim();
  const category = String(item.category || '').trim();
  return [
    [name, category, 'food'].filter(Boolean).join(' '),
    [name, 'food dish'].filter(Boolean).join(' '),
    [name, 'restaurant food'].filter(Boolean).join(' '),
    name,
  ].filter(Boolean);
};

const isUsableImage = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

async function requestGoogleImageSearch(query) {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX;
  if (!apiKey || !cx || !query) return '';

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: query,
    searchType: 'image',
    num: '3',
    safe: 'active',
  });

  const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Google image search failed with status ${response.status}`);
  }

  const data = await response.json();
  const url = (data.items || [])
    .map(result => result.link || result.image?.thumbnailLink)
    .find(isUsableImage) || '';

  if (url) imageCache.set(cacheKey, { url, timestamp: Date.now() });
  return url;
}

async function fetchGoogleMenuItemImage(item = {}) {
  const queries = buildSearchQueries(item);
  if (!process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || !process.env.GOOGLE_CUSTOM_SEARCH_CX || !queries.length) return '';

  const cacheKey = normalizeQuery(item).toLowerCase();
  const cached = imageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.url;

  for (const query of queries) {
    const url = await requestGoogleImageSearch(query);
    if (url) {
      imageCache.set(cacheKey, { url, timestamp: Date.now() });
      return url;
    }
  }

  return '';
}

async function resolveMenuItemImageOnline(item = {}, options = {}) {
  if (item.image && !options.preferOnline) return item.image;
  try {
    const googleImage = await fetchGoogleMenuItemImage(item);
    if (googleImage) return googleImage;
  } catch (error) {
    console.warn('Menu image lookup failed:', error.message);
  }
  return options.preferOnline
    ? (resolveGeneratedMenuItemImage(item) || resolveMenuItemImage({ ...item, image: '' }))
    : resolveMenuItemImage(item);
}

async function requestGoogleSearchDiagnostics(query, searchType) {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX;

  if (!apiKey || !cx) {
    return {
      configured: false,
      query,
      status: null,
      error: 'GOOGLE_CUSTOM_SEARCH_API_KEY or GOOGLE_CUSTOM_SEARCH_CX is missing',
    };
  }

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: query,
    num: '3',
    safe: 'active',
  });
  if (searchType) params.set('searchType', searchType);

  const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
  const data = await response.json().catch(() => ({}));
  const items = Array.isArray(data.items) ? data.items : [];

  return {
    configured: true,
    query,
    status: response.status,
    ok: response.ok,
    error: data.error ? {
      code: data.error.code,
      message: data.error.message,
      status: data.error.status,
      reason: data.error.errors?.[0]?.reason,
    } : null,
    totalResults: data.searchInformation?.totalResults || '0',
    itemCount: items.length,
    firstImage: items[0]?.link || items[0]?.image?.thumbnailLink || '',
    firstTitle: items[0]?.title || '',
  };
}

async function getGoogleImageSearchDiagnostics(item = {}) {
  const queries = buildSearchQueries(item);
  const query = queries[0] || normalizeQuery(item);
  const web = await requestGoogleSearchDiagnostics(query);
  const image = await requestGoogleSearchDiagnostics(query, 'image');

  return {
    configured: Boolean(process.env.GOOGLE_CUSTOM_SEARCH_API_KEY && process.env.GOOGLE_CUSTOM_SEARCH_CX),
    query,
    web,
    image,
    likelyIssue: web.status === 429 || image.status === 429
      ? 'Google Custom Search daily quota is exhausted for this project.'
      : (!web.ok
        ? 'GOOGLE_CUSTOM_SEARCH_CX is invalid or the Programmable Search Engine is not available to this API key/project.'
        : (!image.ok ? 'Image Search is disabled or unsupported for this Programmable Search Engine.' : null)),
    queriesTriedByResolver: queries,
  };
}

async function resolveMenuItemImageWithSource(item = {}, options = {}) {
  const fallback = resolveMenuItemImage({ ...item, image: options.preferOnline ? '' : item.image });
  const image = await resolveMenuItemImageOnline(item, options);
  const generated = image.includes('image.pollinations.ai/prompt/');
  return {
    image,
    source: generated ? 'generated' : (image === fallback ? 'fallback' : 'google'),
    googleConfigured: Boolean(process.env.GOOGLE_CUSTOM_SEARCH_API_KEY && process.env.GOOGLE_CUSTOM_SEARCH_CX),
  };
}

module.exports = {
  resolveMenuItemImage,
  resolveGeneratedMenuItemImage,
  resolveMenuItemImageOnline,
  resolveMenuItemImageWithSource,
  getGoogleImageSearchDiagnostics,
};
