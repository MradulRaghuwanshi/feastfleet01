const express = require('express');
const router = express.Router();
const { db } = require('../firebase/admin');
const { resolveMenuItemImageOnline } = require('../utils/menuImages');

const generateId = (prefix) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

router.get('/', async (req, res) => {
  try {
    const { cuisine } = req.query;
    const includeHidden = String(req.query.includeHidden || '').toLowerCase() === 'true';

    // Use pre-seeded data when Firebase is not configured
    if (!db) {
      const { restaurants } = require('../data/db');
      let result = includeHidden ? restaurants : restaurants.filter(r => r.isHiddenFromCustomers !== true);
      if (cuisine && cuisine !== 'All') {
        result = result.filter(r => r.cuisine === cuisine);
      }
      // Remove full menu from response, just include itemCount
      return res.json(result.map(r => ({
        ...r,
        itemCount: Array.isArray(r.menu) ? r.menu.length : (r.itemCount || 0),
      })));
    }

    let query = db.collection('restaurants');
    if (cuisine && cuisine !== 'All') {
      query = query.where('cuisine', '==', cuisine);
    }

    const snap = await query.get();
    const restaurants = snap.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          itemCount: Number(data.itemCount || data.menuItemCount || 0),
        };
      })
      .filter(restaurant => includeHidden || restaurant.isHiddenFromCustomers !== true);

    res.json(restaurants);
  } catch (error) {
    console.error('Get restaurants error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    // Use pre-seeded data when Firebase is not configured
    if (!db) {
      const { restaurants } = require('../data/db');
      const restaurant = restaurants.find(r => r.id === req.params.id);
      if (!restaurant) return res.status(404).json({ error: 'Not found' });
      return res.json({
        id: restaurant.id,
        ...restaurant,
        menu: restaurant.menu
      });
    }

    const doc = await db.collection('restaurants').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });

    let menu = [];
    try {
      const menuSnap = await db.collection('restaurants').doc(req.params.id).collection('menu').get();
      menu = await Promise.all(menuSnap.docs.map(async (m) => {
        const item = { id: m.id, ...m.data() };
        return { ...item, image: await resolveMenuItemImageOnline(item, { preferOnline: true }) };
      }));
    } catch (menuError) {
      console.warn('Get restaurant menu error:', { restaurantId: req.params.id, message: menuError.message });
    }

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

router.post('/', async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.name || !payload.cuisine || !payload.address) {
      return res.status(400).json({ error: 'name, cuisine and address are required' });
    }

    const baseData = {
      name: payload.name,
      cuisine: payload.cuisine,
      address: payload.address,
      description: payload.description || '',
      deliveryTime: payload.deliveryTime || '30-45 min',
      deliveryFee: Number(payload.deliveryFee ?? 30),
      minOrder: Number(payload.minOrder ?? 149),
      rating: Number(payload.rating ?? 4.0),
      reviewCount: Number(payload.reviewCount ?? 0),
      image: payload.image || '',
      offer: payload.offer || null,
      isOpen: payload.isOpen !== false,
      isFeatured: Boolean(payload.isFeatured),
      isSampleOutlet: Boolean(payload.isSampleOutlet),
      isHiddenFromCustomers: Boolean(payload.isHiddenFromCustomers),
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      hasOwnDelivery: Boolean(payload.hasOwnDelivery),
      menu: Array.isArray(payload.menu) ? payload.menu : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!db) {
      const { restaurants } = require('../data/db');
      const id = payload.id || generateId('r');
      const restaurant = { id, ...baseData };
      restaurants.push(restaurant);
      return res.status(201).json(restaurant);
    }

    const id = payload.id || generateId('r');
    const { menu, ...docData } = baseData;
    await db.collection('restaurants').doc(id).set(docData);

    if (menu.length) {
      const batch = db.batch();
      for (const item of menu) {
        const itemId = item.id || generateId('m');
        const image = await resolveMenuItemImageOnline(item, { preferOnline: true });
        batch.set(db.collection('restaurants').doc(id).collection('menu').doc(itemId), {
          name: item.name,
          description: item.description || '',
          price: Number(item.price || 0),
          category: item.category || 'Main Course',
          image,
          imageSource: 'google-auto',
          available: item.available !== false,
        });
      }
      await batch.commit();
    }

    return res.status(201).json({ id, ...baseData });
  } catch (error) {
    console.error('Create restaurant error:', error);
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
      restaurant.updatedAt = new Date().toISOString();
      return res.json({ isOpen: restaurant.isOpen });
    }

    const doc = await db.collection('restaurants').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });

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
      if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
      const item = restaurant.menu?.find(m => m.id === req.params.itemId);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      item.available = !item.available;
      restaurant.updatedAt = new Date().toISOString();
      return res.json({ id: item.id, ...item });
    }

    const itemDoc = await db.collection('restaurants').doc(req.params.id).collection('menu').doc(req.params.itemId).get();
    if (!itemDoc.exists) return res.status(404).json({ error: 'Item not found' });

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
      restaurant.updatedAt = new Date().toISOString();
      return res.json({ visitPrize, orderPrize });
    }

    const doc = await db.collection('restaurants').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });

    await db.collection('restaurants').doc(req.params.id).update({ visitPrize, orderPrize });
    res.json({ visitPrize, orderPrize });
  } catch (error) {
    console.error('Set prizes error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/profile', async (req, res) => {
  try {
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
      isSampleOutlet: typeof req.body.isSampleOutlet === 'boolean' ? req.body.isSampleOutlet : undefined,
      isHiddenFromCustomers: typeof req.body.isHiddenFromCustomers === 'boolean' ? req.body.isHiddenFromCustomers : undefined,
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

    if (!db) {
      const { restaurants } = require('../data/db');
      const restaurant = restaurants.find(r => r.id === req.params.id);
      if (!restaurant) return res.status(404).json({ error: 'Not found' });
      Object.assign(restaurant, allowed);
      return res.json({ id: req.params.id, ...restaurant });
    }

    const doc = await db.collection('restaurants').doc(req.params.id).get();
    if (!doc.exists) {
      console.warn('Update restaurant profile: document not found, creating it', { restaurantId: req.params.id });
    }

    await db.collection('restaurants').doc(req.params.id).set(allowed, { merge: true });
    const updatedDoc = await db.collection('restaurants').doc(req.params.id).get();
    const responseData = updatedDoc.exists ? updatedDoc.data() : allowed;
    res.json({ id: req.params.id, ...responseData });
  } catch (error) {
    console.error('Update restaurant profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!db) {
      const { restaurants } = require('../data/db');
      const idx = restaurants.findIndex(r => r.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Not found' });
      restaurants.splice(idx, 1);
      return res.json({ success: true });
    }

    const docRef = db.collection('restaurants').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    await docRef.delete();
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete restaurant error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
