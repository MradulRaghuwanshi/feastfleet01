const express = require('express');
const router = express.Router();
const { db } = require('../firebase/admin');

router.get('/', async (req, res) => {
  try {
    const { cuisine } = req.query;
    
    if (!db) {
      // Fallback to in-memory demo mode
      const { restaurants } = require('../data/db');
      let result = restaurants;
      if (cuisine && cuisine !== 'All')
        result = restaurants.filter(r => r.cuisine === cuisine);
      return res.json(result.map(({ menu, ...r }) => ({ ...r, itemCount: menu.length })));
    }

    let query = db.collection('restaurants');
    if (cuisine && cuisine !== 'All') {
      query = query.where('cuisine', '==', cuisine);
    }

    const snap = await query.get();
    const restaurants = [];

    for (const doc of snap.docs) {
      const menuSnap = await db.collection('restaurants').doc(doc.id).collection('menu').get();
      const menu = menuSnap.docs.map(m => m.data());
      restaurants.push({
        id: doc.id,
        ...doc.data(),
        itemCount: menu.length,
        menu: menu
      });
    }

    res.json(restaurants);
  } catch (error) {
    console.error('Get restaurants error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!db) {
      const { restaurants } = require('../data/db');
      const restaurant = restaurants.find(r => r.id === req.params.id);
      if (!restaurant) return res.status(404).json({ error: 'Not found' });
      return res.json(restaurant);
    }

    const doc = await db.collection('restaurants').doc(req.params.id).get();
    if (!doc.exists()) return res.status(404).json({ error: 'Not found' });

    const menuSnap = await db.collection('restaurants').doc(req.params.id).collection('menu').get();
    const menu = menuSnap.docs.map(m => ({ id: m.id, ...m.data() }));

    res.json({
      id: doc.id,
      ...doc.data(),
      menu
    });
  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /:id/toggle-status  (restaurant owner)
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    if (!db) {
      const { restaurants } = require('../data/db');
      const restaurant = restaurants.find(r => r.id === req.params.id);
      if (!restaurant) return res.status(404).json({ error: 'Not found' });
      restaurant.isOpen = !restaurant.isOpen;
      return res.json({ isOpen: restaurant.isOpen });
    }

    const doc = await db.collection('restaurants').doc(req.params.id).get();
    if (!doc.exists()) return res.status(404).json({ error: 'Not found' });

    const newStatus = !doc.data().isOpen;
    await db.collection('restaurants').doc(req.params.id).update({ isOpen: newStatus });
    res.json({ isOpen: newStatus });
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /:id/menu/:itemId  (toggle availability)
router.patch('/:id/menu/:itemId', async (req, res) => {
  try {
    if (!db) {
      const { restaurants } = require('../data/db');
      const restaurant = restaurants.find(r => r.id === req.params.id);
      if (!restaurant) return res.status(404).json({ error: 'Not found' });
      const item = restaurant.menu.find(m => m.id === req.params.itemId);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      item.available = !item.available;
      return res.json(item);
    }

    const itemDoc = await db.collection('restaurants').doc(req.params.id).collection('menu').doc(req.params.itemId).get();
    if (!itemDoc.exists()) return res.status(404).json({ error: 'Item not found' });

    const newAvailable = !itemDoc.data().available;
    await itemDoc.ref.update({ available: newAvailable });

    res.json({
      id: itemDoc.id,
      ...itemDoc.data(),
      available: newAvailable
    });
  } catch (error) {
    console.error('Toggle menu item error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /:id/prizes  (set prizes for visit and order)
router.patch('/:id/prizes', async (req, res) => {
  try {
    const { visitPrize, orderPrize } = req.body;

    if (!db) {
      const { restaurants } = require('../data/db');
      const restaurant = restaurants.find(r => r.id === req.params.id);
      if (!restaurant) return res.status(404).json({ error: 'Not found' });
      restaurant.visitPrize = visitPrize;
      restaurant.orderPrize = orderPrize;
      return res.json({ visitPrize, orderPrize });
    }

    const doc = await db.collection('restaurants').doc(req.params.id).get();
    if (!doc.exists()) return res.status(404).json({ error: 'Not found' });

    await db.collection('restaurants').doc(req.params.id).update({ visitPrize, orderPrize });
    res.json({ visitPrize, orderPrize });
  } catch (error) {
    console.error('Set prizes error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
