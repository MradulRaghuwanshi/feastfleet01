const express = require('express');
const router = express.Router();
const { db } = require('../firebase/admin');

// GET /api/search?q=pizza
router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').toLowerCase().trim();
    if (!q) return res.json({ restaurants: [], dishes: [] });

    if (!db) {
      const { restaurants } = require('../data/db');
      const matchedRestaurants = restaurants
        .filter(r => r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q))
        .map(({ menu, ...r }) => ({ ...r, itemCount: menu.length }));

      const dishes = [];
      restaurants.forEach(r => {
        r.menu.forEach(item => {
          if (item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)) {
            dishes.push({ ...item, restaurantId: r.id, restaurantName: r.name });
          }
        });
      });

      return res.json({ restaurants: matchedRestaurants, dishes });
    }

    // Firebase search
    const restSnap = await db.collection('restaurants').get();
    const matchedRestaurants = [];
    const dishes = [];

    for (const restDoc of restSnap.docs) {
      const rest = restDoc.data();
      
      // Search restaurants by name or cuisine
      if (rest.name.toLowerCase().includes(q) || rest.cuisine.toLowerCase().includes(q)) {
        const menuSnap = await db.collection('restaurants').doc(restDoc.id).collection('menu').get();
        matchedRestaurants.push({
          id: restDoc.id,
          ...rest,
          itemCount: menuSnap.size
        });
      }

      // Search menu items
      const menuSnap = await db.collection('restaurants').doc(restDoc.id).collection('menu').get();
      menuSnap.docs.forEach(menuDoc => {
        const item = menuDoc.data();
        if (item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q)) {
          dishes.push({
            id: menuDoc.id,
            ...item,
            restaurantId: restDoc.id,
            restaurantName: rest.name
          });
        }
      });
    }

    res.json({ restaurants: matchedRestaurants, dishes });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
