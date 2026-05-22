const express = require('express');
const router = express.Router();
const { db } = require('../firebase/admin');
const { resolveMenuItemImageWithSource } = require('../utils/menuImages');

router.get('/resolve', async (req, res) => {
  const item = {
    name: req.query.name,
    title: req.query.title,
    category: req.query.category,
    image: req.query.image,
  };

  if (!String(item.name || item.title || '').trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  res.json(await resolveMenuItemImageWithSource(item, { preferOnline: true }));
});

router.post('/refresh-existing', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'Restaurant database is not configured' });

    const adminId = String(req.headers['x-admin-id'] || req.body?.adminId || '').trim();
    if (!adminId) return res.status(401).json({ error: 'adminId is required' });

    const adminDoc = await db.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const restaurants = await db.collection('restaurants').get();
    let checked = 0;
    let updated = 0;
    const skipped = [];

    for (const restaurantDoc of restaurants.docs) {
      const menuSnap = await restaurantDoc.ref.collection('menu').get();
      for (const itemDoc of menuSnap.docs) {
        checked++;
        const item = { id: itemDoc.id, ...itemDoc.data() };
        const result = await resolveMenuItemImageWithSource(item, { preferOnline: true });

        if (result.source !== 'google') {
          skipped.push({
            restaurantId: restaurantDoc.id,
            itemId: itemDoc.id,
            name: item.name || '',
            reason: 'google-image-not-found',
          });
          continue;
        }

        await itemDoc.ref.set({
          image: result.image,
          imageUrl: result.image,
          imageSource: 'google-auto',
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        updated++;
      }
    }

    res.json({
      ok: true,
      checked,
      updated,
      skipped: skipped.slice(0, 50),
      skippedCount: skipped.length,
    });
  } catch (error) {
    console.error('Refresh menu images error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
