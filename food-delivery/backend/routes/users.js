const express = require('express');
const router = express.Router();
const { db, authAdmin } = require('../firebase/admin');

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
    const password = String(payload.password || '').trim();
    const user = { ...payload, id };
    delete user.password;
    delete user.adminId;

    if (!user.name || !user.role) {
      return res.status(400).json({ error: 'name and role are required' });
    }
    if (password && password.length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 characters' });
    }

    if (!db) {
      const { users } = require('../data/db');
      const exists = users.some(u => u.id === id || (user.email && u.email === user.email));
      if (exists) return res.status(409).json({ error: 'User already exists' });
      users.push(password ? { ...user, password } : user);
      return res.status(201).json(user);
    }

    const docRef = db.collection('users').doc(id);
    const doc = await docRef.get();
    if (doc.exists) return res.status(409).json({ error: 'User already exists' });
    await docRef.set(user);

    if (user.email && password && ['restaurant', 'delivery', 'admin'].includes(user.role)) {
      const credential = {
        uid: id,
        email: String(user.email).trim().toLowerCase(),
        password,
        role: user.role,
        name: user.name || '',
        avatar: user.avatar || '',
        createdAt: user.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.collection('loginCredentials').doc(id).set(credential, { merge: true });

      if (authAdmin) {
        try {
          await authAdmin.createUser({
            uid: id,
            email: credential.email,
            password,
            displayName: user.name || '',
          });
        } catch (err) {
          if (err.code === 'auth/uid-already-exists' || err.code === 'auth/email-already-exists') {
            await authAdmin.updateUser(id, {
              email: credential.email,
              password,
              displayName: user.name || '',
            });
          } else {
            console.warn('Firebase Auth user sync skipped:', err.message);
          }
        }
      }
    }

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

// PATCH /api/users/:id/credentials
router.patch('/:id/credentials', async (req, res) => {
  try {
    const { email, username, password, adminId } = req.body || {};
    const actingAdminId = String(req.headers['x-admin-id'] || adminId || '').trim();
    const loginEmail = String(email || username || '').trim().toLowerCase();
    const nextPassword = String(password || '').trim();

    if (!actingAdminId) return res.status(403).json({ error: 'Admin access required' });
    if (!loginEmail) return res.status(400).json({ error: 'username/email is required' });
    if (nextPassword && nextPassword.length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 characters' });
    }

    if (!db) {
      const { users } = require('../data/db');
      const adminUser = users.find(u => u.id === actingAdminId && u.role === 'admin');
      if (!adminUser) return res.status(403).json({ error: 'Admin access required' });
      const user = users.find(u => u.id === req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (!['restaurant', 'delivery'].includes(user.role)) {
        return res.status(403).json({ error: 'Only restaurant and delivery partner credentials can be updated here' });
      }
      const emailExists = users.some(u => u.id !== user.id && String(u.email || '').toLowerCase() === loginEmail);
      if (emailExists) return res.status(409).json({ error: 'This username/email is already in use' });
      user.email = loginEmail;
      if (nextPassword) user.password = nextPassword;
      return res.json({ id: user.id, email: user.email, role: user.role });
    }

    const adminDoc = await db.collection('users').doc(actingAdminId).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const userRef = db.collection('users').doc(req.params.id);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    const user = { id: userDoc.id, ...userDoc.data() };
    if (!['restaurant', 'delivery'].includes(user.role)) {
      return res.status(403).json({ error: 'Only restaurant and delivery partner credentials can be updated here' });
    }

    const existingCreds = await db.collection('loginCredentials').where('email', '==', loginEmail).limit(1).get();
    if (!existingCreds.empty && existingCreds.docs[0].id !== req.params.id) {
      return res.status(409).json({ error: 'This username/email is already in use' });
    }

    const updates = {
      email: loginEmail,
      updatedAt: new Date().toISOString(),
    };
    await userRef.update(updates);

    const credentialUpdate = {
      uid: req.params.id,
      email: loginEmail,
      role: user.role,
      name: user.name || '',
      avatar: user.avatar || '',
      updatedAt: updates.updatedAt,
    };
    if (nextPassword) credentialUpdate.password = nextPassword;

    await db.collection('loginCredentials').doc(req.params.id).set(credentialUpdate, { merge: true });

    if (authAdmin) {
      try {
        const authUpdate = { email: loginEmail };
        if (nextPassword) authUpdate.password = nextPassword;
        try {
          await authAdmin.updateUser(req.params.id, authUpdate);
        } catch (err) {
          // if auth user does not exist, create it
          if (err.code === 'auth/user-not-found' || /not-found/i.test(err.message || '')) {
            try {
              await authAdmin.createUser({ uid: req.params.id, email: loginEmail, password: nextPassword || undefined, displayName: user.name || '' });
            } catch (createErr) {
              console.warn('Failed to create auth user:', createErr.message);
            }
          } else {
            throw err;
          }
        }
      } catch (error) {
        console.warn('Firebase Auth credential sync skipped:', error.message);
      }
    }

    return res.json({ id: req.params.id, email: loginEmail, role: user.role });
  } catch (error) {
    console.error('Update credentials error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    if (!db) {
      const { users } = require('../data/db');
      const idx = users.findIndex(u => u.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'User not found' });
      const deletedUser = users.splice(idx, 1)[0];
      return res.json({ success: true, deletedUser });
    }

    const userRef = db.collection('users').doc(req.params.id);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    const deletedUser = { id: userDoc.id, ...userDoc.data() };

    // Delete user document
    await userRef.delete();

    // Delete loginCredentials document if exists
    try {
      await db.collection('loginCredentials').doc(req.params.id).delete();
    } catch (credErr) {
      console.warn('Failed to delete login credentials:', credErr.message);
    }

    // Delete Firebase Auth user if exists
    if (authAdmin) {
      try {
        await authAdmin.deleteUser(req.params.id);
      } catch (authErr) {
        if (authErr.code !== 'auth/user-not-found') {
          console.warn('Failed to delete Firebase Auth user:', authErr.message);
        }
      }
    }

    return res.json({ success: true, deletedUser });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
