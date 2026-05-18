const express = require('express');
const { db } = require('../firebase/admin');
const router = express.Router();

const defaultConfig = {
  appName: 'FeastFleet',
  platformFee: 8,
  packagingFee: 10,
  defaultDeliveryFee: 30,
  defaultMinOrder: 149,
  gstPercent: 0,
  cuisines: ['Italian', 'American', 'Japanese', 'Mexican', 'Healthy'],
};

// Get dashboard overview
router.post('/overview', async (req, res) => {
  try {
    const { uid } = req.body;

    if (!db) {
      const { users, orders } = require('../data/db');
      const user = users.find(u => u.id === uid);
      if (!user || user.role !== 'restaurant') return res.status(403).json({ error: 'Access denied' });
      
      const restaurantId = user.restaurantId;
      const today = new Date();
      today.setHours(0,0,0,0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayOrders = orders.filter(o => o.restaurantId === restaurantId && new Date(o.placedAt) >= today && new Date(o.placedAt) < tomorrow);
      const activeOrders = orders.filter(o => o.restaurantId === restaurantId && ['Placed', 'Confirmed', 'Preparing', 'Out for Delivery'].includes(o.status));
      
      let todayRevenue = 0;
      todayOrders.forEach(o => todayRevenue += o.total || 0);
      
      return res.json({
        todayOrders: todayOrders.length,
        todayRevenue,
        activeOrders: activeOrders.length
      });
    }

    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'restaurant')
      return res.status(403).json({ error: 'Access denied' });
    
    const restaurantId = userDoc.data().restaurantId;
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's orders
    const todaySnap = await db.collection('orders')
      .where('restaurantId', '==', restaurantId)
      .where('placedAt', '>=', today.toISOString())
      .where('placedAt', '<', tomorrow.toISOString())
      .get();
    
    let todayRevenue = 0;
    todaySnap.docs.forEach(doc => {
      todayRevenue += doc.data().total || 0;
    });

    // Get active orders
    const activeSnap = await db.collection('orders')
      .where('restaurantId', '==', restaurantId)
      .where('status', 'in', ['Placed', 'Confirmed', 'Preparing', 'Out for Delivery'])
      .get();

    res.json({
      todayOrders: todaySnap.size,
      todayRevenue,
      activeOrders: activeSnap.size
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/config
router.get('/config', async (_req, res) => {
  try {
    if (!db) {
      const { appConfig } = require('../data/db');
      return res.json(appConfig || defaultConfig);
    }

    const doc = await db.collection('appConfig').doc('general').get();
    if (!doc.exists) return res.json(defaultConfig);
    return res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Get app config error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// PATCH /api/dashboard/config
router.patch('/config', async (req, res) => {
  try {
    // require admin privileges to update app config
    const actingAdminId = String(req.headers['x-admin-id'] || req.body.adminId || '').trim();
    if (!actingAdminId) return res.status(403).json({ error: 'Admin access required' });

    // verify admin role
    if (!db) {
      const { users } = require('../data/db');
      const adminUser = users.find(u => u.id === actingAdminId && u.role === 'admin');
      if (!adminUser) return res.status(403).json({ error: 'Admin access required' });
    } else {
      const adminDoc = await db.collection('users').doc(actingAdminId).get();
      if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
    }

    const updates = {
      platformFee: Number(req.body.platformFee ?? 8),
      packagingFee: Number(req.body.packagingFee ?? 10),
      defaultDeliveryFee: Number(req.body.defaultDeliveryFee ?? 30),
      defaultMinOrder: Number(req.body.defaultMinOrder ?? 149),
      gstPercent: Number(req.body.gstPercent ?? 0),
      cuisines: Array.isArray(req.body.cuisines)
        ? req.body.cuisines.map(item => String(item || '').trim()).filter(Boolean)
        : undefined,
      updatedAt: new Date().toISOString(),
    };

    if (!db) {
      const state = require('../data/db');
      state.appConfig.platformFee = updates.platformFee;
      state.appConfig.packagingFee = updates.packagingFee;
      state.appConfig.defaultDeliveryFee = updates.defaultDeliveryFee;
      state.appConfig.defaultMinOrder = updates.defaultMinOrder;
      state.appConfig.gstPercent = updates.gstPercent;
      if (updates.cuisines) state.appConfig.cuisines = updates.cuisines;
      state.appConfig.updatedAt = updates.updatedAt;
      return res.json({ ...state.appConfig });
    }

    const payload = { ...updates };
    if (!payload.cuisines) delete payload.cuisines;
    await db.collection('appConfig').doc('general').set(payload, { merge: true });
    return res.json({ success: true, ...payload });
  } catch (error) {
    console.error('Update app config error:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
