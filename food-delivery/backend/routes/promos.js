const express = require('express');
const router = express.Router();
const { db } = require('../firebase/admin');

// POST /api/promos/validate
router.post('/validate', async (req, res) => {
  try {
    const { code, subtotal } = req.body;

    if (!db) {
      const { promoCodes } = require('../data/db');
      const promo = promoCodes.find(p => p.code === code.toUpperCase() && p.active);
      if (!promo) return res.status(404).json({ error: 'Invalid or expired promo code' });
      if (subtotal < promo.minOrder)
        return res.status(400).json({ error: `Minimum order ₹${promo.minOrder} required for this code` });
      return res.json(promo);
    }

    const doc = await db.collection('promoCodes').doc(code.toUpperCase()).get();
    if (!doc.exists()) return res.status(404).json({ error: 'Invalid or expired promo code' });

    const promo = doc.data();
    if (!promo.active) return res.status(404).json({ error: 'This promo code is no longer active' });
    if (subtotal < promo.minOrder)
      return res.status(400).json({ error: `Minimum order ₹${promo.minOrder} required for this code` });

    res.json({ code: doc.id, ...promo });
  } catch (error) {
    console.error('Validate promo error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/promos  — list all active promos
router.get('/', async (req, res) => {
  try {
    if (!db) {
      const { promoCodes } = require('../data/db');
      return res.json(promoCodes.filter(p => p.active));
    }

    const snap = await db.collection('promoCodes').where('active', '==', true).get();
    const promos = snap.docs.map(d => ({ code: d.id, ...d.data() }));
    res.json(promos);
  } catch (error) {
    console.error('Get promos error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
