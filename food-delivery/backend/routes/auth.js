const express = require('express');
const router = express.Router();
const { db, authAdmin } = require('../firebase/admin');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  try {
    if (!db) {
      // Fallback to in-memory demo mode
      const { users } = require('../data/db');
      const user = users.find(u => u.email === email && u.password === password);
      if (!user) return res.status(401).json({ error: 'Invalid email or password' });
      const { password: _, ...safeUser } = user;
      return res.json({ user: safeUser, token: `demo-token-${user.id}` });
    }

    const loginEmail = String(email).trim().toLowerCase();
    const credsSnap = await db.collection('loginCredentials').where('email', '==', loginEmail).limit(1).get();
    let userId = null;

    if (!credsSnap.empty) {
      const creds = credsSnap.docs[0].data();
      if (creds.password !== password) return res.status(401).json({ error: 'Invalid email or password' });
      userId = creds.uid || credsSnap.docs[0].id;
    } else {
      const fallbackSnap = await db.collection('users').where('email', '==', loginEmail).limit(1).get();
      if (fallbackSnap.empty) return res.status(401).json({ error: 'Invalid email or password' });
      const fallbackUser = fallbackSnap.docs[0].data();
      if (fallbackUser.password !== password) return res.status(401).json({ error: 'Invalid email or password' });
      userId = fallbackSnap.docs[0].id;
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return res.status(401).json({ error: 'Invalid email or password' });

    const user = { id: userDoc.id, ...userDoc.data() };

    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser, token: `demo-token-${user.id}` });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  const userId = token.replace('demo-token-', '');

  try {
    if (!db) {
      const { users } = require('../data/db');
      const user = users.find(u => u.id === userId);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const { password: _, ...safeUser } = user;
      return res.json(safeUser);
    }

    const userSnap = await db.collection('users').doc(userId).get();
    if (!userSnap.exists) return res.status(401).json({ error: 'Unauthorized' });

    const user = { id: userSnap.id, ...userSnap.data() };
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
