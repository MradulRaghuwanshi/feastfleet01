const express = require('express');
const router = express.Router();
const { db } = require('../firebase/admin');

// GET /api/reviews?restaurantId=r1
router.get('/', async (req, res) => {
  try {
    const { restaurantId } = req.query;

    if (!db) {
      const { reviews } = require('../data/db');
      let result = [...reviews].reverse();
      if (restaurantId) result = result.filter(r => r.restaurantId === restaurantId);
      return res.json(result);
    }

    let query = db.collection('reviews');
    if (restaurantId) query = query.where('restaurantId', '==', restaurantId);

    const snap = await query.orderBy('createdAt', 'desc').get();
    const reviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(reviews);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/reviews  — submit a review
router.post('/', async (req, res) => {
  try {
    const { restaurantId, userId, userName, avatar, rating, comment, orderId } = req.body;
    if (!restaurantId || !userId || !rating || !comment)
      return res.status(400).json({ error: 'Missing required fields' });

    if (!db) {
      const { reviews, orders } = require('../data/db');
      
      // prevent duplicate review for same order
      if (orderId && reviews.find(r => r.orderId === orderId))
        return res.status(400).json({ error: 'You already reviewed this order' });

      const review = {
        id: `rev-${Date.now()}`,
        restaurantId, userId, userName, avatar,
        rating: parseInt(rating), comment,
        orderId: orderId || null,
        ownerReply: null,
        createdAt: new Date().toISOString()
      };
      reviews.push(review);

      if (orderId) {
        const order = orders.find(o => o.id === orderId);
        if (order) order.reviewed = true;
      }

      return res.status(201).json(review);
    }

    // Firebase mode - check for duplicate review
    if (orderId) {
      const existing = await db.collection('reviews').where('orderId', '==', orderId).limit(1).get();
      if (!existing.empty) return res.status(400).json({ error: 'You already reviewed this order' });
    }

    const reviewData = {
      restaurantId, userId, userName, avatar,
      rating: parseInt(rating), comment,
      orderId: orderId || null,
      ownerReply: null,
      createdAt: new Date().toISOString()
    };

    const ref = await db.collection('reviews').add(reviewData);

    // mark order as reviewed
    if (orderId) {
      await db.collection('orders').doc(orderId).update({ reviewed: true }).catch(() => {});
    }

    res.status(201).json({ id: ref.id, ...reviewData });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/reviews/:id/reply  — owner replies
router.patch('/:id/reply', async (req, res) => {
  try {
    const { reply } = req.body;

    if (!db) {
      const { reviews } = require('../data/db');
      const review = reviews.find(r => r.id === req.params.id);
      if (!review) return res.status(404).json({ error: 'Review not found' });
      review.ownerReply = reply;
      return res.json(review);
    }

    const doc = await db.collection('reviews').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Review not found' });

    await doc.ref.update({ ownerReply: reply });
    res.json({ id: doc.id, ...doc.data(), ownerReply: reply });
  } catch (error) {
    console.error('Reply to review error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
