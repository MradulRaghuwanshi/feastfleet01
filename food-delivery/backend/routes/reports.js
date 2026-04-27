const express = require('express');
const { db } = require('../firebase/admin');
const router = express.Router();

// Get sales report
router.post('/sales', async (req, res) => {
  try {
    const { restaurantId, startDate, endDate } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (!db) {
      const { orders } = require('../data/db');
      const filteredOrders = orders.filter(o => 
        o.restaurantId === restaurantId && 
        new Date(o.placedAt) >= start && 
        new Date(o.placedAt) <= end
      );
      
      const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      const totalOrders = filteredOrders.length;
      
      return res.json({ totalRevenue, totalOrders, orders: filteredOrders });
    }

    const snap = await db.collection('orders')
      .where('restaurantId', '==', restaurantId)
      .where('placedAt', '>=', start.toISOString())
      .where('placedAt', '<=', end.toISOString())
      .get();

    let totalRevenue = 0;
    const filteredOrders = snap.docs.map(d => {
      const order = d.data();
      totalRevenue += order.total || 0;
      return { id: d.id, ...order };
    });

    res.json({
      totalRevenue,
      totalOrders: filteredOrders.length,
      orders: filteredOrders
    });
  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;