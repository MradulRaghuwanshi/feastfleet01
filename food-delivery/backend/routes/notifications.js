const express = require('express');
const router = express.Router();
const { admin, db } = require('../firebase/admin');

// POST /api/notifications/promo  — send promo notification to all customers
router.post('/promo', async (req, res) => {
  if (!db || !admin.messaging) {
    return res.status(503).json({ error: 'Firebase not configured' });
  }

  const { promoCode, description, title } = req.body;
  if (!promoCode) return res.status(400).json({ error: 'promoCode required' });

  try {
    // Get all customer FCM tokens from Firestore
    const snap = await db.collection('fcmTokens').get();
    const tokens = snap.docs.map(d => d.data().token).filter(Boolean);

    if (tokens.length === 0) {
      return res.json({ sent: 0, message: 'No registered devices' });
    }

    const message = {
      notification: {
        title: title || `🏷️ New Offer: ${promoCode}`,
        body: description || `Use code ${promoCode} to save on your next order!`,
      },
      data: {
        promoCode,
        type: 'promo',
        click_action: 'OPEN_APP',
      },
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    // Remove invalid tokens
    const invalidTokens = [];
    response.responses.forEach((r, i) => {
      if (!r.success && (r.error?.code === 'messaging/invalid-registration-token' ||
          r.error?.code === 'messaging/registration-token-not-registered')) {
        invalidTokens.push(tokens[i]);
      }
    });

    if (invalidTokens.length > 0) {
      const batch = db.batch();
      const tokenSnap = await db.collection('fcmTokens').get();
      tokenSnap.docs.forEach(doc => {
        if (invalidTokens.includes(doc.data().token)) batch.delete(doc.ref);
      });
      await batch.commit();
    }

    res.json({
      sent: response.successCount,
      failed: response.failureCount,
      total: tokens.length
    });
  } catch (err) {
    console.error('FCM error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/save-token  — save FCM token for a user
router.post('/save-token', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Firebase not configured' });
  const { userId, token } = req.body;
  if (!userId || !token) return res.status(400).json({ error: 'userId and token required' });
  try {
    await db.collection('fcmTokens').doc(`${userId}_${token.slice(-8)}`).set({
      userId, token, updatedAt: new Date().toISOString()
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
