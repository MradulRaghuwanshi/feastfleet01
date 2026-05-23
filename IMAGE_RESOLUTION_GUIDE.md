# FeastFleet Image Resolution Guide

## Overview
Images in FeastFleet are resolved through a multi-layered fallback system that automatically finds or generates images for menu items.

## Image Resolution Layers (Priority Order)

### 1. **Direct Image URL** (Highest Priority)
If a menu item has an `image` or `imageUrl` field in the database, that URL is used directly.

### 2. **Keyword Matching**
The system searches through predefined keywords (case-insensitive) to find matching images:

**Available Keywords Include:**
- **Rolls**: `afghani chaap roll`, `chaap roll`, `chicken roll`, `paneer roll`, `egg roll`, `veg roll`, `kathi roll`, `cheese roll`, `spring roll`
- **Biryani**: `chicken biryani`, `mutton biryani`, `veg biryani`, `hyderabadi biryani`, `dum biryani`, `mandi`
- **Tandoori & Grilled**: `tandoori chicken`, `al faham`, `chicken tikka`, `malai tikka`, `paneer tikka`
- **Fried Items**: `fried chicken`, `crunchy fried chicken`, `boneless fried chicken`
- **Gravy & Curries**: `butter chicken`, `chicken curry`, `mutton curry`, `gravy`, `shahi paneer`
- **Breads**: `naan`, `butter naan`, `garlic naan`, `roti`, `tandoori roti`, `paratha`
- **Rice Items**: `fried rice`, `chicken fried rice`, `egg fried rice`, `veg fried rice`
- **Thali**: `thali`, `veg thali`, `chicken thali`, `egg thali`
- **Eggs**: `egg curry`, `egg items`, `omelette`, `egg bhurji`, `boiled egg`
- **Noodles**: `maggi`, `hakka noodles`, `chow mein`
- **Starters**: `veg starters`, `veg items`
- **Mutton**: `mutton`
- **Fast Food**: `burger`, `sandwich`, `fries`, `salad`
- **Beverages**: `cold coffee`, `coffee`, `juice`, `shake`
- **Fruits & Desserts**: `mango`, `banana`, `papaya`, `pineapple`, `strawberry`, `watermelon`, `fruit salad`, `chocolate`, `dessert`

### 3. **Category Matching**
If no keyword matches, the system looks for a category-based image:

**Supported Categories:**
- `rolls`, `chaap rolls`, `chicken rolls`, `paneer rolls`
- `biryani`, `biryani & mandi`
- `starters`, `veg starters`, `chicken starters`
- `fried items`, `fried chicken`
- `gravy`, `curries`
- `breads`, `indian breads`
- `rice`, `rice items`
- `thali`
- `egg items`, `eggs`
- `maggi`, `noodles`, `chinese noodles`
- `burgers`, `burger`, `sandwich`, `salad`
- `shakes`, `juices`, `beverages`
- `veg items`, `paneer`

### 4. **AI-Generated Images** (Pollinations.ai)
If keyword and category matching fails, the system generates a unique image using the Pollinations.ai API based on the item name and category.

### 5. **Fallback Generic Image**
Ultimate fallback: A generic food photography image from Unsplash.

## Manual Image Update Methods

### Method 1: Update Single Menu Item (API)

**Endpoint**: `POST /api/menu-images/update-item`

**Request**:
```json
{
  "adminId": "admin_user_id",
  "restaurantId": "restaurant_id",
  "itemId": "menu_item_id",
  "imageUrl": "https://your-image-url.com/image.jpg"
}
```

**Response**:
```json
{
  "ok": true,
  "message": "Menu item image updated successfully",
  "itemId": "menu_item_id",
  "imageUrl": "https://your-image-url.com/image.jpg"
}
```

### Method 2: Batch Update Multiple Items (API)

**Endpoint**: `POST /api/menu-images/batch-update`

**Request**:
```json
{
  "adminId": "admin_user_id",
  "restaurantId": "restaurant_id",
  "items": [
    {
      "itemId": "item1_id",
      "imageUrl": "https://url1.com/image1.jpg"
    },
    {
      "itemId": "item2_id",
      "imageUrl": "https://url2.com/image2.jpg"
    }
  ]
}
```

**Response**:
```json
{
  "ok": true,
  "message": "Batch update completed",
  "updated": 2,
  "failed": 0,
  "errors": []
}
```

### Method 3: Refresh All Menu Images

**Endpoint**: `POST /api/menu-images/refresh-existing`

This endpoint attempts to find Google Images for all menu items (requires Google Custom Search API configuration).

**Request**:
```json
{
  "adminId": "admin_user_id"
}
```

## Troubleshooting

### Images Not Showing for Specific Items

1. **Check Item Name**: Ensure the item name or category matches available keywords
2. **Add Custom Keyword**: Update `menuImages.js` if you have a new dish type
3. **Use Manual Update**: Use the API endpoints to set a specific image URL
4. **Check Database**: Verify the item data is stored correctly in Firebase

### Missing Keywords

If you notice items don't match, add new keywords to:
- Backend: `food-delivery/backend/utils/menuImages.js`
- Frontend: `food-delivery/frontend/src/utils/menuImages.js`

**Example Addition**:
```javascript
['your new keyword', 'https://images.unsplash.com/photo-xxxxx?w=500&auto=format&fit=crop&q=72'],
```

### Generated Images Look Inaccurate

Generated images from Pollinations.ai may not always be perfect. Use the manual update API to set your own image URLs.

## Image Sources

### Recommended Sources for Menu Item Images:

1. **Unsplash** (Free)
   - https://unsplash.com - Extensive food photography collection
   - High quality, CC0 licensed

2. **Pexels** (Free)
   - https://pexels.com - High-quality photos

3. **Pixabay** (Free)
   - https://pixabay.com - Royalty-free images

4. **Cloudinary** (Paid/Free)
   - Offers image optimization and CDN delivery

5. **Your Own Photos**
   - Upload photos from your restaurant/kitchen

## API Configuration Notes

### Google Custom Search API (Optional)

If configured with environment variables:
- `GOOGLE_CUSTOM_SEARCH_API_KEY`
- `GOOGLE_CUSTOM_SEARCH_CX`

The system will attempt to find real images from Google Images for each menu item.

### Caching

Images are cached for 24 hours to improve performance and reduce API calls.

## Database Fields

Each menu item should ideally have these fields:

```json
{
  "name": "Double Afghani Chaap Roll",
  "category": "Chaap Rolls",
  "image": "https://...",
  "imageUrl": "https://...",
  "imageSource": "admin-manual" | "google-auto" | "fallback" | "generated",
  "description": "Double Afghani Chaap Roll freshly prepared.",
  "price": 130
}
```

## Quick Reference: Adding New Dishes

1. **First Time Setup**:
   - Add item to database
   - System auto-resolves image if keyword/category exists
   - Otherwise generates or uses fallback

2. **Image Not Matching**:
   - Call `/api/menu-images/update-item` with correct image URL
   - Or add new keyword to `menuImages.js` for future items

3. **Batch Updates**:
   - Use `/api/menu-images/batch-update` for multiple corrections

## Testing

### Check What Image Will Be Used

**Endpoint**: `GET /api/menu-images/resolve?name=YourDishName&category=YourCategory`

**Response**:
```json
{
  "image": "https://resolved-image-url.com/image.jpg",
  "source": "keyword" | "category" | "generated" | "fallback"
}
```

### Run Diagnostics

**Endpoint**: `GET /api/menu-images/diagnostics?name=YourDishName&category=YourCategory&adminId=YOUR_ADMIN_ID`

Provides diagnostic info about image resolution including Google Search status.
