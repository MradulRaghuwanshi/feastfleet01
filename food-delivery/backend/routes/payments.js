const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /api/payments/create-order
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, customerName, customerEmail } = req.body;

    // Validate amount (minimum 100 paise = ₹1)
    if (!amount || amount < 100) {
      return res.status(400).json({ error: 'Amount must be at least 100 paise (₹1)' });
    }

    const options = {
      amount: Math.round(amount), // Razorpay expects paise
      currency,
      receipt: receipt || `order_${Date.now()}`,
      notes: {
        customerName: customerName || 'N/A',
        customerEmail: customerEmail || 'N/A',
      },
    };

    const order = await razorpay.orders.create(options);

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error('Create Order Error:', error);
    res.status(500).json({ error: error.message || 'Failed to create order' });
  }
});

// POST /api/payments/verify-payment
router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment fields' });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      res.json({
        success: true,
        message: 'Payment verified successfully',
        razorpay_payment_id,
        razorpay_order_id,
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Payment signature verification failed',
      });
    }
  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({ error: error.message || 'Failed to verify payment' });
  }
});

module.exports = router;
