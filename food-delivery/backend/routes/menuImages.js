const express = require('express');
const router = express.Router();
const { db } = require('../firebase/admin');
const {
  getGoogleImageSearchDiagnostics,
  resolveMenuItemImageWithSource,
} = require('../utils/menuImages');

async function requireAdmin(req, res) {
  if (!db) {
    res.status(503).json({ error: 'Restaurant database is not configured' });
    return null;
  }

  const adminId = String(req.headers['x-admin-id'] || req.body?.adminId || req.query.adminId || '').trim();
  if (!adminId) {
    res.status(401).json({ error: 'adminId is required' });
    return null;
  }

  const adminDoc = await db.collection('users').doc(adminId).get();
  if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }

  return { id: adminId, ...adminDoc.data() };
}

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
    const admin = await requireAdmin(req, res);
    if (!admin) return;

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

router.get('/diagnostics', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const item = {
      name: req.query.name,
      title: req.query.title,
      category: req.query.category,
    };

    if (!String(item.name || item.title || '').trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    res.json(await getGoogleImageSearchDiagnostics(item));
  } catch (error) {
    console.error('Menu image diagnostics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/menu-images/update-item
// Update a specific menu item's image
router.post('/update-item', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { restaurantId, itemId, imageUrl } = req.body;

    if (!restaurantId || !itemId || !imageUrl) {
      return res.status(400).json({ error: 'restaurantId, itemId, and imageUrl are required' });
    }

    const itemRef = db.collection('restaurants').doc(restaurantId).collection('menu').doc(itemId);
    const itemDoc = await itemRef.get();

    if (!itemDoc.exists) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    await itemRef.set({
      image: imageUrl,
      imageUrl: imageUrl,
      imageSource: 'admin-manual',
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    res.json({
      ok: true,
      message: 'Menu item image updated successfully',
      itemId,
      imageUrl,
    });
  } catch (error) {
    console.error('Update menu item image error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/menu-images/batch-update
// Batch update images for multiple items
router.post('/batch-update', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { restaurantId, items } = req.body;

    if (!restaurantId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'restaurantId and items array are required' });
    }

    const results = { updated: 0, failed: 0, errors: [] };

    for (const { itemId, imageUrl } of items) {
      try {
        if (!itemId || !imageUrl) {
          results.failed++;
          results.errors.push(`Skipped: itemId and imageUrl are required`);
          continue;
        }

        const itemRef = db.collection('restaurants').doc(restaurantId).collection('menu').doc(itemId);
        await itemRef.set({
          image: imageUrl,
          imageUrl: imageUrl,
          imageSource: 'admin-manual',
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        results.updated++;
      } catch (itemError) {
        results.failed++;
        results.errors.push(`Failed to update ${itemId}: ${itemError.message}`);
      }
    }

    res.json({
      ok: true,
      message: 'Batch update completed',
      ...results,
    });
  } catch (error) {
    console.error('Batch update menu images error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
