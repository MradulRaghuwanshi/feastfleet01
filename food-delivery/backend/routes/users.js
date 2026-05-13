const express = require('express');
const router = express.Router();
const { db } = require('../firebase/admin');

const generateId = (prefix) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// GET /api/users
router.get('/', async (_req, res) => {
  try {
    if (!db) {
      const { users } = require('../data/db');
      return res.json(users);
    }

    const snap = await db.collection('users').get();
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const payload = req.body || {};
    const id = payload.id || payload.userId || generateId('u');
    const user = { ...payload, id };

    if (!user.name || !user.role) {
      return res.status(400).json({ error: 'name and role are required' });
    }

    if (!db) {
      const { users } = require('../data/db');
      const exists = users.some(u => u.id === id || (user.email && u.email === user.email));
      if (exists) return res.status(409).json({ error: 'User already exists' });
      users.push(user);
      return res.status(201).json(user);
    }

    const docRef = db.collection('users').doc(id);
    const doc = await docRef.get();
    if (doc.exists) return res.status(409).json({ error: 'User already exists' });
    await docRef.set(user);
    return res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// PATCH /api/users/:id
router.patch('/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date().toISOString() };

    if (!db) {
      const { users } = require('../data/db');
      const user = users.find(u => u.id === req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      Object.assign(user, updates);
      return res.json({ id: user.id, ...user });
    }

    const docRef = db.collection('users').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });
    await docRef.update(updates);
    return res.json({ id: req.params.id, ...updates });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
