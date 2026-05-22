const express = require('express');
const router = express.Router();
const { db } = require('../firebase/admin');
const { resolveMenuItemImageOnline } = require('../utils/menuImages');

// GET /api/search?q=pizza
router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').toLowerCase().trim();
    if (!q) return res.json({ restaurants: [], dishes: [] });

    if (!db) return res.status(503).json({ error: 'Restaurant database is not configured' });

    // Firebase search
    const restSnap = await db.collection('restaurants').get();
    const matchedRestaurants = [];
    const dishes = [];

    const seenRestaurantIds = new Set();

    const restaurantMenus = await Promise.all(restSnap.docs.map(async (restDoc) => {
      const rest = restDoc.data();
      const menuSnap = await db.collection('restaurants').doc(restDoc.id).collection('menu').get();
      return { restDoc, rest, menuSnap };
    }));

    for (const { restDoc, rest, menuSnap } of restaurantMenus) {
      // Search restaurants by name or cuisine
      const restaurantMatches = [rest.name, rest.cuisine, ...(Array.isArray(rest.tags) ? rest.tags : [])]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(q));

      if (restaurantMatches && !seenRestaurantIds.has(restDoc.id)) {
        matchedRestaurants.push({
          id: restDoc.id,
          ...rest,
          itemCount: menuSnap.size
        });
        seenRestaurantIds.add(restDoc.id);
      }

      // Search menu items
      for (const menuDoc of menuSnap.docs) {
        const item = menuDoc.data();
        const itemMatches = [item.name, item.description, item.category]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(q));

        if (itemMatches) {
          dishes.push({
            id: menuDoc.id,
            ...item,
            image: await resolveMenuItemImageOnline(item, { preferOnline: true }),
            restaurantId: restDoc.id,
            restaurantName: rest.name,
            restaurantCuisine: rest.cuisine,
            restaurantHasOwnDelivery: rest.hasOwnDelivery,
            restaurantCanOrder: rest.isAcceptingOrdersNow ?? rest.isOpen,
            restaurantDeliveryTime: rest.deliveryTime
          });
        }
      }
    }

    res.json({ restaurants: matchedRestaurants, dishes });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
