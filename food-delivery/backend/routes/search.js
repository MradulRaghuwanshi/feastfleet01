const express = require('express');
const router = express.Router();
const { db } = require('../firebase/admin');

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
