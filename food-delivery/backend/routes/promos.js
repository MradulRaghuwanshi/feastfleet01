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
      if (subtotal < promo.minOrder) {
        return res.status(400).json({ error: `Minimum order ₹${promo.minOrder} required for this code` });
      }
      return res.json(promo);
    }

    const doc = await db.collection('promoCodes').doc(code.toUpperCase()).get();
    if (!doc.exists()) return res.status(404).json({ error: 'Invalid or expired promo code' });

    const promo = doc.data();
    if (!promo.active) return res.status(404).json({ error: 'This promo code is no longer active' });
    if (subtotal < promo.minOrder) {
      return res.status(400).json({ error: `Minimum order ₹${promo.minOrder} required for this code` });
    }

    res.json({ code: doc.id, ...promo });
  } catch (error) {
    console.error('Validate promo error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/promos
// Query: ?all=1 to include inactive promos (used by admin)
router.get('/', async (req, res) => {
  try {
    const includeInactive = req.query.all === '1' || req.query.all === 'true';

    if (!db) {
      const { promoCodes } = require('../data/db');
      return res.json(includeInactive ? promoCodes : promoCodes.filter(p => p.active));
    }

    const snap = includeInactive
      ? await db.collection('promoCodes').get()
      : await db.collection('promoCodes').where('active', '==', true).get();

    const promos = snap.docs.map(d => ({ code: d.id, ...d.data() }));
    res.json(promos);
  } catch (error) {
    console.error('Get promos error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/promos
router.post('/', async (req, res) => {
  try {
    const payload = req.body || {};
    const code = String(payload.code || '').toUpperCase().trim();
    if (!code) return res.status(400).json({ error: 'Promo code is required' });

    const promo = {
      code,
      type: payload.type || 'percent',
      value: Number(payload.value || 0),
      minOrder: Number(payload.minOrder || 0),
      description: payload.description || '',
      active: payload.active !== false,
      updatedAt: new Date().toISOString(),
    };

    if (!db) {
      const { promoCodes } = require('../data/db');
      const exists = promoCodes.some(p => p.code === code);
      if (exists) return res.status(409).json({ error: 'Promo already exists' });
      promoCodes.push(promo);
      return res.status(201).json(promo);
    }

    const docRef = db.collection('promoCodes').doc(code);
    const doc = await docRef.get();
    if (doc.exists) return res.status(409).json({ error: 'Promo already exists' });
    await docRef.set(promo);
    return res.status(201).json(promo);
  } catch (error) {
    console.error('Create promo error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/promos/:code
router.patch('/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').toUpperCase();
    const updates = { ...req.body, updatedAt: new Date().toISOString() };

    if (!db) {
      const { promoCodes } = require('../data/db');
      const promo = promoCodes.find(p => p.code === code);
      if (!promo) return res.status(404).json({ error: 'Promo not found' });
      Object.assign(promo, updates);
      return res.json({ code, ...promo });
    }

    const docRef = db.collection('promoCodes').doc(code);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Promo not found' });
    await docRef.update(updates);
    return res.json({ code, ...updates });
  } catch (error) {
    console.error('Update promo error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/promos/:code
router.delete('/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').toUpperCase();

    if (!db) {
      const { promoCodes } = require('../data/db');
      const idx = promoCodes.findIndex(p => p.code === code);
      if (idx === -1) return res.status(404).json({ error: 'Promo not found' });
      promoCodes.splice(idx, 1);
      return res.json({ success: true });
    }

    const docRef = db.collection('promoCodes').doc(code);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Promo not found' });
    await docRef.delete();
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete promo error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
