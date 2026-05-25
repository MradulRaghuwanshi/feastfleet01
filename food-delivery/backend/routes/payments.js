const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { db } = require('../firebase/admin');

const router = express.Router();

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return null;
  }

  return {
    keyId,
    client: new Razorpay({ key_id: keyId, key_secret: keySecret }),
  };
}

router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency, receipt, orderId } = req.body || {};

    if (!orderId) return res.status(400).json({ error: 'orderId is required.' });
    if (!db) return res.status(503).json({ error: 'Order database is not configured.' });
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) return res.status(404).json({ error: 'Order not found.' });
    const parsedAmount = Math.round(Number(orderDoc.data().total || 0) * 100);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 100) {
      return res.status(400).json({ error: 'Invalid amount. Minimum is 100 paise.' });
    }

    const parsedCurrency = currency || 'INR';
    const parsedReceipt = receipt || `rcpt_${Date.now()}`;

    const razorpayConfig = getRazorpay();

    if (!razorpayConfig) {
      return res.status(503).json({
        error: 'Razorpay is not configured on the payment server.',
      });
    }

    const order = await razorpayConfig.client.orders.create({
      amount: parsedAmount,
      currency: parsedCurrency,
      receipt: parsedReceipt,
      payment_capture: 1,
    });

    return res.status(200).json({
      order_id: order.id,
      key_id: razorpayConfig.keyId,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err) {
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || 'Razorpay create-order failed';

    if (status === 401 || status === 403) return res.status(401).json({ error: 'Unauthorized' });

    console.error('Razorpay create-order error:', err);
    return res.status(500).json({ error: message });
  }
});

router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!orderId) return res.status(400).json({ error: 'orderId is required.' });

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Demo fallback: accept any signature when no secret configured
    if (!keySecret) {
      if (orderId && db) {
        await db.collection('orders').doc(orderId).set({
          paymentMethod: 'razorpay',
          paymentStatus: 'completed',
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
      // In demo mode treat verification as successful
      return res.status(200).json({ ok: true, demo: true });
    }

    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Signature mismatch' });
    }

    if (orderId && db) {
      await db.collection('orders').doc(orderId).set({
        paymentMethod: 'razorpay',
        paymentStatus: 'completed',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Razorpay verify-payment error:', err);
    return res.status(500).json({ error: err?.message || 'Payment verification failed' });
  }
});

module.exports = router;

