const express = require('express');
const router = express.Router();
const { db } = require('../firebase/admin');

// GET /api/favourites/:userId
router.get('/:userId', async (req, res) => {
  try {
    if (!db) {
      const { users, restaurants } = require('../data/db');
      const user = users.find(u => u.id === req.params.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      const favRestaurants = restaurants
        .filter(r => user.favourites.includes(r.id))
        .map(({ menu, ...r }) => ({ ...r, itemCount: menu.length }));
      return res.json(favRestaurants);
    }

    const userDoc = await db.collection('users').doc(req.params.userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    const favIds = userDoc.data().favourites || [];
    if (favIds.length === 0) return res.json([]);

    const restaurants = [];
    for (const restId of favIds) {
      const restDoc = await db.collection('restaurants').doc(restId).get();
      if (restDoc.exists) {
        const menuSnap = await db.collection('restaurants').doc(restId).collection('menu').get();
        restaurants.push({
          id: restDoc.id,
          ...restDoc.data(),
          itemCount: menuSnap.size
        });
      }
    }

    res.json(restaurants);
  } catch (error) {
    console.error('Get favourites error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/favourites/:userId/toggle
router.post('/:userId/toggle', async (req, res) => {
  try {
    const { restaurantId } = req.body;

    if (!db) {
      const { users } = require('../data/db');
      const user = users.find(u => u.id === req.params.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      const idx = user.favourites.indexOf(restaurantId);
      if (idx === -1) user.favourites.push(restaurantId);
      else user.favourites.splice(idx, 1);
      return res.json({ favourites: user.favourites });
    }

    const userRef = db.collection('users').doc(req.params.userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    const favourites = userDoc.data().favourites || [];
    const idx = favourites.indexOf(restaurantId);

    let newFavourites;
    if (idx === -1) {
      newFavourites = [...favourites, restaurantId];
    } else {
      newFavourites = favourites.filter((_, i) => i !== idx);
    }

    await userRef.update({ favourites: newFavourites });
    res.json({ favourites: newFavourites });
  } catch (error) {
    console.error('Toggle favourite error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
