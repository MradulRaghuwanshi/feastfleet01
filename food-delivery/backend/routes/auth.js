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

    // Query Firestore for user by email
    const snap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (snap.empty) return res.status(401).json({ error: 'Invalid email or password' });

    const userDoc = snap.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() };

    // Verify password (in production, use hashed passwords)
    if (user.password !== password) return res.status(401).json({ error: 'Invalid email or password' });

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
    if (!userSnap.exists()) return res.status(401).json({ error: 'Unauthorized' });

    const user = { id: userSnap.id, ...userSnap.data() };
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
