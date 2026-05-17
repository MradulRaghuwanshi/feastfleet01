const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db, admin } = require('../firebase/admin');

const STATUS_FLOW = [
  'Order Placed',
  'Restaurant Accepted',
  'Delivery Partner Assigned',
  'Pickup OTP Verified',
  'Order Picked Up',
  'On The Way',
  'Delivered'
];

const COINS_PER_100_RS = 5;
const FEASTCOINS_REDEEM_RATE = 1; // 1 feastcoin == ₹1 (so 100 coins == ₹100 discount)

router.post('/', async (req, res) => {
  try {
    const { restaurantId, items, deliveryAddress, customerName, customerId, promoCode, useWallet, deliveryLat, deliveryLng, platformFee, packagingFee, gstPercent, gstAmount, paymentMethod, paymentStatus, razorpayOrderId, razorpayPaymentId } = req.body;
    if (!restaurantId || !items?.length || !deliveryAddress || !customerName)
      return res.status(400).json({ error: 'Missing required fields' });

    console.log('[orders.create] request received', {
      restaurantId,
      customerId: customerId || 'guest',
      itemCount: items.length,
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: paymentStatus || 'pending',
      useFirestore: Boolean(db),
    });

    if (!db) {
      console.warn('[orders.create] firestore unavailable, using in-memory fallback');
      // Fallback to in-memory mode
      const { restaurants, orders, users, promoCodes } = require('../data/db');
      const restaurant = restaurants.find(r => r.id === restaurantId);
      if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

      const enrichedItems = items.map(item => {
        const m = restaurant.menu.find(m => m.id === item.id);
        return { ...m, quantity: item.quantity };
      });

    const subtotal = enrichedItems.reduce((s, i) => s + i.price * i.quantity, 0);

    const { getDeliveryFeeForTier } = require('../lib/orderEconomics');
    let discount = 0;
    let deliveryFee = getDeliveryFeeForTier(subtotal);
    let appliedPromo = null;


      if (promoCode) {
        const promo = promoCodes.find(p => p.code === promoCode.toUpperCase() && p.active);
        if (promo && subtotal >= promo.minOrder) {
          appliedPromo = promo.code;
          if (promo.type === 'percent') discount = +(subtotal * promo.value / 100).toFixed(2);
          if (promo.type === 'flat') discount = promo.value;
          if (promo.type === 'delivery') deliveryFee = 0;
        }
      }

      let walletUsed = 0;
      if (useWallet && customerId) {
        const user = users.find(u => u.id === customerId);
        if (user && user.wallet > 0) {
          const afterDiscount = subtotal - discount + deliveryFee;
          walletUsed = Math.min(user.wallet, afterDiscount);
          user.wallet = +(user.wallet - walletUsed).toFixed(2);
        }
      }

      const pf = platformFee ?? 8;
      const pkf = packagingFee ?? 10;
      const ga = 0;
      const total = +(subtotal + pf + pkf - discount + deliveryFee - walletUsed).toFixed(2);
      const agent = users.find(u => u.role === 'delivery');

      const platformCommissionPercent = 15;
      const platformCommission = +(subtotal * platformCommissionPercent / 100).toFixed(2);

      // Platform delivery restaurants: start UNASSIGNED
      const deliveryOtp = String(Math.floor(1000 + Math.random() * 9000));
      const deliveryOtpVerified = false;

      const order = {
        id: `ord-${uuidv4().slice(0,6).toUpperCase()}`,
        customerId: customerId || 'guest', customerName,
        restaurantId, restaurantName: restaurant.name,
        deliveryAgentId: null,
        deliveryAgentName: 'Unassigned',
        items: enrichedItems,
        subtotal: +subtotal.toFixed(2), platformFee: pf, packagingFee: pkf, gstPercent: 0, gstAmount: ga,
        deliveryFee, discount, walletUsed,
        platformCommission,
        platformCommissionPercent,
        feastCoinsEarned: Math.floor(subtotal / 100) * 5,
        netSettlementAmount: +(subtotal - platformCommission).toFixed(2),
        total: Math.max(0, total),
        promoCode: appliedPromo, deliveryAddress, status: 'Order Placed', reviewed: false,
        paymentMethod: paymentMethod || 'cod',
        paymentStatus: paymentStatus || 'pending',
        razorpayOrderId: razorpayOrderId || null,
        razorpayPaymentId: razorpayPaymentId || null,
        deliveryOtp,
        deliveryOtpVerified,
        deliveryLat: deliveryLat || null, deliveryLng: deliveryLng || null,
        placedAt: new Date().toISOString(),
        statusHistory: [{ status: 'Order Placed', time: new Date().toISOString() }]
      };

      orders.push(order);
      console.log('[orders.create] in-memory order stored', { orderId: order.id });
      return res.status(201).json(order);
    }

    // Firebase mode
    const restDoc = await db.collection('restaurants').doc(restaurantId).get();
    if (!restDoc.exists()) return res.status(404).json({ error: 'Restaurant not found' });

    const restaurant = restDoc.data();
    const menuSnap = await db.collection('restaurants').doc(restaurantId).collection('menu').get();
    const menu = menuSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const enrichedItems = items.map(item => {
      const m = menu.find(m => m.id === item.id);
      return { ...m, quantity: item.quantity };
    });

    const subtotal = enrichedItems.reduce((s, i) => s + i.price * i.quantity, 0);

    const { getDeliveryFeeForTier } = require('../lib/orderEconomics');
    let discount = 0;
    let deliveryFee = getDeliveryFeeForTier(subtotal);
    let appliedPromo = null;


    if (promoCode) {
      const promoDoc = await db.collection('promoCodes').doc(promoCode.toUpperCase()).get();
      if (promoDoc.exists()) {
        const promo = promoDoc.data();
        if (promo.active && subtotal >= promo.minOrder) {
          appliedPromo = promo.code;
          if (promo.type === 'percent') discount = +(subtotal * promo.value / 100).toFixed(2);
          if (promo.type === 'flat') discount = promo.value;
          if (promo.type === 'delivery') deliveryFee = 0;
        }
      }
    }

    let walletUsed = 0;
    if (useWallet && customerId) {
      const userDoc = await db.collection('users').doc(customerId).get();
      if (userDoc.exists()) {
        const user = userDoc.data();
        if (user.wallet > 0) {
          const afterDiscount = subtotal - discount + deliveryFee;
          walletUsed = Math.min(user.wallet, afterDiscount);
          await db.collection('users').doc(customerId).update({ wallet: user.wallet - walletUsed });
        }
      }
    }

    const pf = platformFee ?? 8;
    const pkf = packagingFee ?? 10;
    const ga = 0;
    const total = +(subtotal + pf + pkf - discount + deliveryFee - walletUsed).toFixed(2);

    // Platform delivery restaurants: start UNASSIGNED (OTP + pickup/drop will be shown only after acceptance)
    let deliveryAgentId = null;
    let deliveryAgentName = 'Unassigned';
    if (restaurant.hasOwnDelivery) {
      deliveryAgentName = 'Restaurant Delivery';
    }


    const deliveryOtp = String(Math.floor(1000 + Math.random() * 9000));

    const orderData = {
      customerId: customerId || 'guest',
      customerName,
      restaurantId,
      restaurantName: restaurant.name,
      deliveryAgentId,
      deliveryAgentName,
      deliveryOtp,
      deliveryOtpVerified: false,
      deliveryOtpExpiresAt: null,

      items: enrichedItems,
      subtotal: +subtotal.toFixed(2),
      platformFee: pf,
      packagingFee: pkf,
      gstPercent: 0,
      gstAmount: ga,
      deliveryFee,
      discount,
      walletUsed,
      platformCommission: +(subtotal * 15 / 100).toFixed(2),
      platformCommissionPercent: 15,
      feastCoinsEarned: Math.floor(subtotal / 100) * 5,
      netSettlementAmount: +(subtotal - (subtotal * 15 / 100)).toFixed(2),
      total: Math.max(0, total),
      promoCode: appliedPromo,
      deliveryAddress,
      status: 'Order Placed',
      reviewed: false,
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: paymentStatus || 'pending',
      razorpayOrderId: razorpayOrderId || null,
      razorpayPaymentId: razorpayPaymentId || null,
      deliveryLat: deliveryLat || null,
      deliveryLng: deliveryLng || null,
      placedAt: new Date().toISOString(),
      statusHistory: [{ status: 'Order Placed', time: new Date().toISOString() }]
    };

    const orderRef = await db.collection('orders').add(orderData);
    console.log('[orders.create] firestore order stored', {
      orderId: orderRef.id,
      restaurantId,
      customerId: customerId || 'guest',
      paymentMethod: orderData.paymentMethod,
      paymentStatus: orderData.paymentStatus,
    });
    
    // Send notification to restaurant
    try {
      const restaurantOwnerSnap = await db.collection('users')
        .where('role', '==', 'restaurant')
        .where('restaurantId', '==', restaurantId)
        .limit(1)
        .get();
      
      if (!restaurantOwnerSnap.empty) {
        const ownerId = restaurantOwnerSnap.docs[0].id;
        const fcmTokensSnap = await db.collection('fcmTokens')
          .where('userId', '==', ownerId)
          .get();
        
        if (!fcmTokensSnap.empty && admin.messaging) {
          const tokens = fcmTokensSnap.docs.map(d => d.data().token);
          const message = {
            notification: {
              title: '🆕 New Order Received!',
              body: `Order from ${customerName} - ₹${total.toFixed(0)}`,
            },
            data: {
              type: 'new_order',
              orderId: orderRef.id,
              restaurantId,
              amount: total.toFixed(0)
            },
            tokens,
          };
          
          await admin.messaging().sendEachForMulticast(message);
        }
      }
    } catch (notificationError) {
      console.warn('Could not send order notification:', notificationError.message);
    }
    
    res.status(201).json({ id: orderRef.id, ...orderData });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { customerId, restaurantId, agentId } = req.query;

    if (!db) {
      const { orders } = require('../data/db');
      let result = [...orders].reverse();
      if (customerId) result = result.filter(o => o.customerId === customerId);
      if (restaurantId) result = result.filter(o => o.restaurantId === restaurantId);
      if (agentId) result = result.filter(o => o.deliveryAgentId === agentId);
      return res.json(result);
    }

    let query = db.collection('orders').orderBy('placedAt', 'desc');
    if (customerId) query = query.where('customerId', '==', customerId);
    if (restaurantId) query = query.where('restaurantId', '==', restaurantId);
    if (agentId) query = query.where('deliveryAgentId', '==', agentId);

    const snap = await query.get();
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!db) {
      const { orders } = require('../data/db');
      const order = orders.find(o => o.id === req.params.id);
      if (!order) return res.status(404).json({ error: 'Not found' });
      return res.json(order);
    }

    const doc = await db.collection('orders').doc(req.params.id).get();
    if (!doc.exists()) return res.status(404).json({ error: 'Not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/accept', async (req, res) => {
  try {
    const { agentId, agentName } = req.body;
    if (!agentId) return res.status(400).json({ error: 'agentId required' });

    if (!db) {
      const { orders, users } = require('../data/db');
      const order = orders.find(o => o.id === req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });

      // Only allow accepting when unassigned
      if (order.deliveryAgentId && order.deliveryAgentId !== agentId) {
        return res.status(409).json({ error: 'Order already accepted by another agent' });
      }

      order.deliveryAgentId = agentId;
      const agent = users.find(u => u.id === agentId);
      order.deliveryAgentName = agent?.name || agentName || 'Delivery Partner';

      if (['Placed', 'Order Placed', 'Restaurant Accepted'].includes(order.status)) order.status = 'Delivery Partner Assigned';
      order.assignmentStatus = 'assigned';
      order.assignedAt = new Date().toISOString();
      return res.json(order);
    }

    const doc = await db.collection('orders').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Order not found' });

    const order = doc.data();

    if (order.deliveryAgentId && order.deliveryAgentId !== agentId) {
      return res.status(409).json({ error: 'Order already accepted by another agent' });
    }

    const updates = {
      deliveryAgentId: agentId,
      deliveryAgentName: agentName || 'Delivery Partner',
      status: ['Placed', 'Order Placed', 'Restaurant Accepted'].includes(order.status) ? 'Delivery Partner Assigned' : order.status,
      statusHistory: (order.statusHistory || []).concat([{ status: 'Delivery Partner Assigned', time: new Date().toISOString() }]),
      acceptedAt: new Date().toISOString(),
      assignmentStatus: 'assigned',
    };

    await db.collection('orders').doc(req.params.id).update(updates);

    const updatedSnap = await db.collection('orders').doc(req.params.id).get();
    return res.json({ id: updatedSnap.id, ...updatedSnap.data() });
  } catch (error) {
    console.error('Accept order error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/verify-otp', async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ error: 'otp required' });

    if (!db) {
      const { orders } = require('../data/db');
      const order = orders.find(o => o.id === req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });

      if (String(order.deliveryOtp) !== String(otp)) return res.status(401).json({ error: 'Invalid OTP' });
      if (order.deliveryOtpVerified) return res.status(409).json({ error: 'OTP already verified' });

      order.deliveryOtpVerified = true;
      order.pickupOtpVerified = true;
      order.pickupOtpVerifiedAt = new Date().toISOString();
      order.status = 'On The Way';
      order.statusHistory.push(
        { status: 'Pickup OTP Verified', time: new Date().toISOString() },
        { status: 'Order Picked Up', time: new Date().toISOString() },
        { status: 'On The Way', time: new Date().toISOString() }
      );

      return res.json(order);
    }

    const doc = await db.collection('orders').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Order not found' });

    const order = doc.data();

    if (order.deliveryOtpVerified) return res.status(409).json({ error: 'OTP already verified' });
    if (!order.deliveryOtp || String(order.deliveryOtp) !== String(otp)) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    // Optional: ensure only accepted agent can verify
    const { agentId } = req.body;
    if (agentId && order.deliveryAgentId && order.deliveryAgentId !== agentId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updatedStatus = 'On The Way';

    await db.collection('orders').doc(req.params.id).update({
      deliveryOtpVerified: true,
      pickupOtpVerified: true,
      deliveryOtpVerifiedAt: new Date().toISOString(),
      pickupOtpVerifiedAt: new Date().toISOString(),
      status: updatedStatus,
      statusHistory: (order.statusHistory || []).concat([
        { status: 'Pickup OTP Verified', time: new Date().toISOString() },
        { status: 'Order Picked Up', time: new Date().toISOString() },
        { status: updatedStatus, time: new Date().toISOString() }
      ])
    });

    // Notify customer that delivery started
    try {
      if (admin.messaging) {
        const custId = order.customerId;
        const tokensSnap = await db.collection('fcmTokens').where('userId', '==', custId).get();
        const tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean);
        if (tokens.length) {
          await admin.messaging().sendEachForMulticast({
            notification: {
              title: '✅ Delivery started',
              body: `Your order #${req.params.id.slice(0, 6)} is out for delivery.`
            },
            data: {
              type: 'delivery_started',
              orderId: req.params.id
            },
            tokens
          });
        }
      }
    } catch (e) {
      console.warn('Could not send delivery started notification:', e.message);
    }

    const updatedSnap = await db.collection('orders').doc(req.params.id).get();
    return res.json({ id: updatedSnap.id, ...updatedSnap.data() });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!STATUS_FLOW.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    if (!db) {
      const { orders } = require('../data/db');
      const order = orders.find(o => o.id === req.params.id);
      if (!order) return res.status(404).json({ error: 'Not found' });
      order.status = status;
      order.statusHistory.push({ status, time: new Date().toISOString() });
      return res.json(order);
    }

    const doc = await db.collection('orders').doc(req.params.id).get();
    if (!doc.exists()) return res.status(404).json({ error: 'Not found' });

    const history = doc.data().statusHistory || [];
    history.push({ status, time: new Date().toISOString() });

    await db.collection('orders').doc(req.params.id).update({
      status,
      statusHistory: history
    });

    res.json({ id: doc.id, ...doc.data(), status, statusHistory: history });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: error.message });
  }
});



module.exports = router;
