const express = require('express');
const router = express.Router();
const { db, rtdb } = require('../firebase/admin');

// In-memory fallback for agent locations
const agentLocations = {
  'u5': { lat: 19.0596, lng: 72.8295, updatedAt: new Date().toISOString() },
  'u6': { lat: 12.9352, lng: 77.6245, updatedAt: new Date().toISOString() },
};

// POST /api/tracking/agent  — delivery agent pushes their GPS location
router.post('/agent', async (req, res) => {
  try {
    const { agentId, lat, lng } = req.body;
    if (!agentId || lat == null || lng == null)
      return res.status(400).json({ error: 'agentId, lat, lng required' });

    if (rtdb) {
      const refPath = rtdb.ref(`agentLocations/${agentId}`);
      await refPath.set({ lat, lng, updatedAt: new Date().toISOString() });
    } else {
      agentLocations[agentId] = { lat, lng, updatedAt: new Date().toISOString() };
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Agent location error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tracking/:orderId  — get full tracking data for an order
router.get('/:orderId', async (req, res) => {
  const requesterAgentId = req.query.agentId || req.headers['x-agent-id'] || null;
  try {
    if (!db) {
      const { orders, restaurants } = require('../data/db');
      const order = orders.find(o => o.id === req.params.orderId);
      if (!order) return res.status(404).json({ error: 'Order not found' });

      // Restrict visibility to accepted delivery agent only
      if (order.deliveryAgentId && requesterAgentId && order.deliveryAgentId !== requesterAgentId) {
        return res.status(403).json({ error: 'Forbidden' });
      }


      const restaurant = restaurants.find(r => r.id === order.restaurantId);
      const agentLoc = agentLocations[order.deliveryAgentId] || null;

      return res.json({
        orderId: order.id,
        status: order.status,
        restaurant: {
          name: restaurant?.name,
          address: restaurant?.address,
          lat: restaurant?.lat || 19.0596,
          lng: restaurant?.lng || 72.8295,
        },
        customer: {
          name: order.customerName,
          address: order.deliveryAddress,
          lat: order.deliveryLat || 19.0760,
          lng: order.deliveryLng || 72.8777,
        },
        agent: {
          name: order.deliveryAgentName,
          id: order.deliveryAgentId,
          lat: agentLoc?.lat || null,
          lng: agentLoc?.lng || null,
          updatedAt: agentLoc?.updatedAt || null,
        }
      });
    }

    // Firebase mode
    const orderDoc = await db.collection('orders').doc(req.params.orderId).get();
    if (!orderDoc.exists) return res.status(404).json({ error: 'Order not found' });

    const order = orderDoc.data();
    const restDoc = await db.collection('restaurants').doc(order.restaurantId).get();
    const restaurant = restDoc.exists ? restDoc.data() : null;

    let agentLoc = null;
    if (rtdb && order.deliveryAgentId) {
      const refPath = rtdb.ref(`agentLocations/${order.deliveryAgentId}`);
      const snapshot = await refPath.once('value');
      agentLoc = snapshot.val();
    } else {
      agentLoc = agentLocations[order.deliveryAgentId] || null;
    }

    res.json({
      orderId: req.params.orderId,
      status: order.status,
      restaurant: {
        name: restaurant?.name,
        address: restaurant?.address,
        lat: restaurant?.lat || 19.0596,
        lng: restaurant?.lng || 72.8295,
      },
      customer: {
        name: order.customerName,
        address: order.deliveryAddress,
        lat: order.deliveryLat || 19.0760,
        lng: order.deliveryLng || 72.8777,
      },
      agent: {
        name: order.deliveryAgentName,
        id: order.deliveryAgentId,
        lat: agentLoc?.lat || null,
        lng: agentLoc?.lng || null,
        updatedAt: agentLoc?.updatedAt || null,
      }
    });
  } catch (error) {
    console.error('Get tracking error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/tracking/order/:orderId/coords  — save customer delivery coords
router.patch('/order/:orderId/coords', async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!db) {
      const { orders } = require('../data/db');
      const order = orders.find(o => o.id === req.params.orderId);
      if (!order) return res.status(404).json({ error: 'Not found' });
      order.deliveryLat = lat;
      order.deliveryLng = lng;
      return res.json({ ok: true });
    }

    await db.collection('orders').doc(req.params.orderId).update({
      deliveryLat: lat,
      deliveryLng: lng
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Update coordinates error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
module.exports.agentLocations = agentLocations;
