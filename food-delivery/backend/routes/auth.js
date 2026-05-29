const express = require('express');
const router = express.Router();
const { db, authAdmin } = require('../firebase/admin');

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizePhone = (value) => String(value || '').replace(/\D/g, '').slice(-10);
const makeUsername = (name, email = '') => {
  const source = String(name || email?.split('@')?.[0] || '').trim().toLowerCase();
  return source.replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
};

async function findLoginCredential(identifier) {
  const raw = String(identifier || '').trim();
  const normalizedIdentifier = normalizeEmail(raw);
  const username = makeUsername(raw);
  const phone = normalizePhone(raw);
  const lookups = [
    ['email', normalizedIdentifier],
    ['username', username],
    ['nameKey', username],
    ['normalizedPhone', phone],
    ['phone', raw],
    ['name', raw],
  ].filter(([, value]) => value);

  const seen = new Set();
  for (const [field, value] of lookups) {
    const key = `${field}:${value}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const credsSnap = await db.collection('loginCredentials').where(field, '==', value).limit(1).get();
    if (!credsSnap.empty) return { id: credsSnap.docs[0].id, ...credsSnap.docs[0].data() };

    const userSnap = await db.collection('users').where(field, '==', value).limit(1).get();
    if (!userSnap.empty) return { id: userSnap.docs[0].id, uid: userSnap.docs[0].id, ...userSnap.docs[0].data() };
  }

  return null;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, identifier, username, phone, password } = req.body;
  const loginIdentifier = email || identifier || username || phone;
  if (!loginIdentifier || !password)
    return res.status(400).json({ error: 'Email, phone, or username and password required' });

  try {
    if (!db) {
      // Fallback to in-memory demo mode
      const { users } = require('../data/db');
      const normalizedIdentifier = normalizeEmail(loginIdentifier);
      const normalizedPhone = normalizePhone(loginIdentifier);
      const normalizedUsername = makeUsername(loginIdentifier);
      const user = users.find(u =>
        u.password === password && (
          normalizeEmail(u.email) === normalizedIdentifier ||
          normalizePhone(u.phone) === normalizedPhone ||
          makeUsername(u.username || u.name, u.email) === normalizedUsername
        )
      );
      if (!user) return res.status(401).json({ error: 'Invalid login details' });
      const { password: _, ...safeUser } = user;
      return res.json({ user: safeUser, token: `demo-token-${user.id}` });
    }

    let userId = null;
    const creds = await findLoginCredential(loginIdentifier);

    if (creds) {
      if (creds.password !== password) return res.status(401).json({ error: 'Invalid login details' });
      userId = creds.uid || creds.id;
    } else {
      return res.status(401).json({ error: 'Invalid login details' });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return res.status(401).json({ error: 'Invalid login details' });

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
