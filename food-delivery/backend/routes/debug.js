const express = require('express');
const router = express.Router();
const { db } = require('../firebase/admin');

const getDebugToken = () => String(process.env.DEBUG_API_TOKEN || '').trim();

const requireDebugToken = (req, res) => {
  const expected = getDebugToken();
  if (!expected) return true;

  const provided = String(req.headers['x-debug-token'] || req.query.token || '').trim();
  if (provided !== expected) {
    res.status(403).json({ error: 'Debug access denied' });
    return false;
  }

  return true;
};

const toPlain = (doc) => (doc && doc.exists ? { id: doc.id, ...doc.data() } : null);

const sortByPlacedAtDesc = (items) => items.sort((a, b) => new Date(b.placedAt || 0).getTime() - new Date(a.placedAt || 0).getTime());

router.get('/order/:id', async (req, res) => {
  try {
    if (!requireDebugToken(req, res)) return;

    if (!db) {
      const { orders, restaurants, users } = require('../data/db');
      const order = orders.find(item => item.id === req.params.id) || null;
      const restaurant = order ? restaurants.find(item => item.id === order.restaurantId) || null : null;
      const restaurantUsers = order ? users.filter(item => item.role === 'restaurant' && item.restaurantId === order.restaurantId) : [];
      return res.json({
        dbConnected: false,
        order,
        restaurant,
        restaurantUsers,
        sameRestaurantOrderIds: order ? sortByPlacedAtDesc(orders.filter(item => item.restaurantId === order.restaurantId)).map(item => item.id) : [],
      });
    }

    const orderSnap = await db.collection('orders').doc(req.params.id).get();
    const order = toPlain(orderSnap);
    const restaurantId = order?.restaurantId || null;

    const [restaurantSnap, restaurantUsersSnap, restaurantOrdersSnap] = restaurantId
      ? await Promise.all([
          db.collection('restaurants').doc(restaurantId).get(),
          db.collection('users').where('role', '==', 'restaurant').where('restaurantId', '==', restaurantId).get(),
          db.collection('orders').where('restaurantId', '==', restaurantId).get(),
        ])
      : [null, null, null];

    const restaurant = toPlain(restaurantSnap);
    const restaurantUsers = restaurantUsersSnap ? restaurantUsersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];
    const sameRestaurantOrders = restaurantOrdersSnap
      ? sortByPlacedAtDesc(restaurantOrdersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      : [];

    return res.json({
      dbConnected: true,
      order,
      restaurant,
      restaurantUsers,
      sameRestaurantOrderIds: sameRestaurantOrders.map(item => item.id),
      sameRestaurantOrderCount: sameRestaurantOrders.length,
    });
  } catch (error) {
    console.error('Debug order lookup error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/restaurant/:restaurantId', async (req, res) => {
  try {
    if (!requireDebugToken(req, res)) return;

    if (!db) {
      const { restaurants, users, orders } = require('../data/db');
      const restaurant = restaurants.find(item => item.id === req.params.restaurantId) || null;
      const restaurantUsers = users.filter(item => item.role === 'restaurant' && item.restaurantId === req.params.restaurantId);
      const restaurantOrders = sortByPlacedAtDesc(orders.filter(item => item.restaurantId === req.params.restaurantId));
      return res.json({
        dbConnected: false,
        restaurant,
        restaurantUsers,
        orderCount: restaurantOrders.length,
        recentOrderIds: restaurantOrders.map(item => item.id),
      });
    }

    const [restaurantSnap, restaurantUsersSnap, restaurantOrdersSnap] = await Promise.all([
      db.collection('restaurants').doc(req.params.restaurantId).get(),
      db.collection('users').where('role', '==', 'restaurant').where('restaurantId', '==', req.params.restaurantId).get(),
      db.collection('orders').where('restaurantId', '==', req.params.restaurantId).get(),
    ]);

    const restaurantOrders = sortByPlacedAtDesc(restaurantOrdersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    return res.json({
      dbConnected: true,
      restaurant: toPlain(restaurantSnap),
      restaurantUsers: restaurantUsersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      orderCount: restaurantOrders.length,
      recentOrderIds: restaurantOrders.map(item => item.id),
    });
  } catch (error) {
    console.error('Debug restaurant lookup error:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;