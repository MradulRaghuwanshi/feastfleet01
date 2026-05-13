const express = require('express');
const router = express.Router();
const { db } = require('../firebase/admin');

router.get('/', async (req, res) => {
  try {
    const { cuisine } = req.query;

    if (!db) return res.status(503).json({ error: 'Restaurant database is not configured' });

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
    if (!db) return res.status(503).json({ error: 'Restaurant database is not configured' });

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
    if (!db) return res.status(503).json({ error: 'Restaurant database is not configured' });

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
    if (!db) return res.status(503).json({ error: 'Restaurant database is not configured' });

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

    if (!db) return res.status(503).json({ error: 'Restaurant database is not configured' });

    const doc = await db.collection('restaurants').doc(req.params.id).get();
    if (!doc.exists()) return res.status(404).json({ error: 'Not found' });

    await db.collection('restaurants').doc(req.params.id).update({ visitPrize, orderPrize });
    res.json({ visitPrize, orderPrize });
  } catch (error) {
    console.error('Set prizes error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/profile', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'Restaurant database is not configured' });

    const allowed = {
      name: req.body.name,
      description: req.body.description,
      contactPhone: req.body.contactPhone,
      contactEmail: req.body.contactEmail,
      address: req.body.address,
      visitPrize: req.body.visitPrize,
      orderPrize: req.body.orderPrize,
      activeDays: req.body.activeDays,
      openingTime: req.body.openingTime,
      closingTime: req.body.closingTime,
      closedMessage: req.body.closedMessage,
      isOpen: typeof req.body.isOpen === 'boolean' ? req.body.isOpen : undefined,
      cuisine: req.body.cuisine,
      deliveryTime: req.body.deliveryTime,
      deliveryFee: req.body.deliveryFee,
      minOrder: req.body.minOrder,
      tags: req.body.tags,
      image: req.body.image,
      isFeatured: req.body.isFeatured,
      hasOwnDelivery: req.body.hasOwnDelivery,
      updatedAt: new Date().toISOString(),
    };

    Object.keys(allowed).forEach(key => allowed[key] === undefined && delete allowed[key]);

    const doc = await db.collection('restaurants').doc(req.params.id).get();
    if (!doc.exists()) return res.status(404).json({ error: 'Not found' });

    await db.collection('restaurants').doc(req.params.id).update(allowed);
    res.json({ id: req.params.id, ...allowed });
  } catch (error) {
    console.error('Update restaurant profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
