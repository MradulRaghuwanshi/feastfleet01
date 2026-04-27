const express = require('express');
const { db } = require('../firebase/admin');
const router = express.Router();

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
    if (!userDoc.exists() || userDoc.data().role !== 'restaurant') 
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

module.exports = router;