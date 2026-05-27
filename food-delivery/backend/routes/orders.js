const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db, admin } = require('../firebase/admin');
const { sendOrderPlacedNotifications } = require('../lib/orderNotifications');
const {
  sendAdminOrderEvent,
  sendCustomerOrderCancelledEmail,
  sendOrderNotifications,
} = require('../lib/emailService');
const { calculateBill } = require('../lib/orderEconomics');
const { applyOffer, getBestOffer, getInflatedPrice } = require('../lib/offerPricing');

const canUseDemoFallback = () => !db && (
  process.env.NODE_ENV !== 'production' ||
  String(process.env.ALLOW_DEMO_MODE || '').toLowerCase() === 'true'
);

const STATUS_FLOW = [
  'Order Placed',
  'Restaurant Accepted',
  'Delivery Partner Assigned',
  'Pickup OTP Verified',
  'Order Picked Up',
  'On The Way',
  'Delivered',
  'Cancelled',
  'Returned'
];

const COINS_PER_100_RS = 5;
const FINAL_STATUSES = ['Cancelled', 'Returned', 'Delivered'];
const isFinalStatus = (status) => FINAL_STATUSES.includes(status);

function buildOrderItems(menu, requestedItems, isNewUser) {
  return requestedItems.map((item) => {
    const menuItem = menu.find(candidate => candidate.id === item.id);
    if (!menuItem || menuItem.available === false) return null;
    const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
    return {
      id: menuItem.id,
      name: menuItem.name,
      description: menuItem.description || '',
      category: menuItem.category || '',
      image: menuItem.image || menuItem.imageUrl || '',
      veg: menuItem.veg !== undefined ? menuItem.veg : menuItem.isVeg,
      price: getInflatedPrice(menuItem.price, isNewUser),
      quantity,
    };
  }).filter(Boolean);
}

function calculateServerBill({ items, promo, redeemFeastCoins, feastCoinBalance, hasOwnDelivery, isNewUser }) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const bestOffer = getBestOffer(subtotal, isNewUser);
  const offerDiscount = applyOffer(bestOffer, subtotal);
  const baseBill = calculateBill({ subtotal, discount: offerDiscount });

  let promoDiscount = 0;
  let deliveryFee = hasOwnDelivery ? 0 : baseBill.deliveryFee;
  let appliedPromo = null;
  if (promo && subtotal >= Number(promo.minOrder || 0)) {
    appliedPromo = promo.code;
    if (promo.type === 'percent') promoDiscount = Math.min(Number((subtotal * Number(promo.value || 0) / 100).toFixed(2)), 100);
    if (promo.type === 'flat') promoDiscount = Number(promo.value || 0);
    if (promo.type === 'delivery') deliveryFee = 0;
  }

  const discount = Math.min(subtotal, Number((offerDiscount + promoDiscount).toFixed(2)));
  const payableBeforeCoins = Math.max(0, Number((subtotal + baseBill.platformFee + baseBill.packagingFee + deliveryFee - discount).toFixed(2)));
  const availableCoins = redeemFeastCoins ? Math.floor(Number(feastCoinBalance || 0)) : 0;
  const feastCoinRedemption = Math.min(availableCoins, Math.floor(payableBeforeCoins));
  const total = Math.max(0, Number((payableBeforeCoins - feastCoinRedemption).toFixed(2)));
  const platformCommission = Number((subtotal * 15 / 100).toFixed(2));

  return {
    subtotal: Number(subtotal.toFixed(2)),
    platformFee: baseBill.platformFee,
    packagingFee: baseBill.packagingFee,
    deliveryFee,
    discount,
    offerDiscount,
    promoDiscount,
    feastCoinRedemption,
    total,
    appliedPromo,
    feastCoinsEarned: Math.floor(subtotal / 100) * 5,
    platformCommission,
    platformCommissionPercent: 15,
    netSettlementAmount: Number((subtotal - platformCommission).toFixed(2)),
  };
}
async function getRestaurantOwnerEmail(restaurantId) {
  if (!restaurantId) return '';

  if (!db) {
    const { users } = require('../data/db');
    return users.find(user => user.role === 'restaurant' && user.restaurantId === restaurantId)?.email || '';
  }

  const snap = await db.collection('users')
    .where('role', '==', 'restaurant')
    .where('restaurantId', '==', restaurantId)
    .limit(1)
    .get();

  return snap.docs[0]?.data()?.email || '';
}

async function getDeliveryPartnerContact(agentId) {
  if (!agentId) return null;

  if (!db) {
    const { users } = require('../data/db');
    return users.find(user => user.id === agentId) || null;
  }

  const doc = await db.collection('users').doc(agentId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

function buildEmailOrderPayload(order, restaurant, orderId) {
  return {
    ...order,
    id: orderId || order.id,
    createdAt: order.placedAt || order.createdAt,
    customer: {
      name: order.customerName,
      phone: order.customerPhone,
      email: order.customerEmail,
      address: order.deliveryAddress,
    },
    restaurant: {
      name: restaurant?.name || order.restaurantName,
      email: restaurant?.email || order.restaurantEmail || '',
      address: restaurant?.address || order.restaurantAddress || '',
      phone: restaurant?.phone || '',
      website: restaurant?.website || '',
      logoUrl: restaurant?.logoUrl || restaurant?.logo || restaurant?.image || '',
      lat: restaurant?.lat || '',
      lng: restaurant?.lng || '',
    },
    deliveryPartner: {
      name: order.deliveryAgentName,
      email: order.deliveryPartnerEmail || order.deliveryAgentEmail || '',
      phone: order.deliveryPartnerPhone || order.deliveryAgentPhone || '',
    },
    estimatedTime: restaurant?.deliveryTime || order.estimatedTime,
    estimatedDistance: order.estimatedDistance,
    deliveryEarnings: order.deliveryFee,
  };
}

async function hydrateEmailOrderPayload(order, orderId) {
  const restaurantId = order.restaurantId;
  let restaurant = null;

  if (!db) {
    const { restaurants } = require('../data/db');
    restaurant = restaurants.find(item => item.id === restaurantId) || null;
  } else if (restaurantId) {
    const doc = await db.collection('restaurants').doc(restaurantId).get();
    restaurant = doc.exists ? doc.data() : null;
  }

  const restaurantEmail = restaurant?.email || order.restaurantEmail || await getRestaurantOwnerEmail(restaurantId);
  let deliveryContact = null;
  if (order.deliveryAgentId) deliveryContact = await getDeliveryPartnerContact(order.deliveryAgentId);

  return buildEmailOrderPayload({
    ...order,
    restaurantEmail,
    deliveryAgentEmail: deliveryContact?.email || order.deliveryAgentEmail,
    deliveryAgentPhone: deliveryContact?.phone || order.deliveryAgentPhone,
    deliveryAgentName: deliveryContact?.name || order.deliveryAgentName,
  }, restaurant, orderId || order.id);
}

async function isOnlinePaymentEnabled() {
  if (String(process.env.PAYMENT_ONLINE_ENABLED || '').toLowerCase() === 'false') return false;

  if (!db) {
    const { appConfig } = require('../data/db');
    return appConfig?.paymentOnlineEnabled !== false;
  }

  const doc = await db.collection('appConfig').doc('general').get();
  if (!doc.exists) return true;
  return doc.data().paymentOnlineEnabled !== false;
}

const FEASTCOINS_REDEEM_RATE = 1; // 1 feastcoin == ₹1 (so 100 coins == ₹100 discount)

router.post('/', async (req, res) => {
  try {
    const { restaurantId, items, deliveryAddress, customerName, customerId, promoCode, useWallet, redeemFeastCoins, deliveryLat, deliveryLng, paymentMethod, paymentStatus, razorpayOrderId, razorpayPaymentId, isGuest, customerPhone, customerEmail } = req.body;
    if (!restaurantId || !items?.length || !deliveryAddress || !customerName)
      return res.status(400).json({ error: 'Missing required fields' });
    if (String(paymentMethod || '').toLowerCase() === 'razorpay' && !(await isOnlinePaymentEnabled())) {
      return res.status(403).json({ error: 'Online payment is currently disabled. Please use Cash on Delivery.' });
    }

    console.log('[orders.create] request received', {
      restaurantId,
      customerId: customerId || 'guest',
      itemCount: items.length,
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: paymentStatus || 'pending',
      useFirestore: Boolean(db),
    });

    if (!db && !canUseDemoFallback()) {
      return res.status(503).json({ error: 'Database is not connected. Demo fallback is disabled.' });
    }

    if (!db) {
      console.warn('[orders.create] firestore unavailable, using in-memory fallback');
      // Fallback to in-memory mode
      const { restaurants, orders, users, promoCodes } = require('../data/db');
      const restaurant = restaurants.find(r => r.id === restaurantId);
      if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

      const isNewUser = Boolean(isGuest || String(customerId || '').startsWith('guest_'));
      const enrichedItems = buildOrderItems(restaurant.menu || [], items, isNewUser);
      if (!enrichedItems.length) return res.status(400).json({ error: 'No valid available menu items were found' });

      let promo = null;
      let appliedPromo = null;


      if (promoCode) {
        promo = promoCodes.find(p => p.code === promoCode.toUpperCase() && p.active) || null;
        if (promo) appliedPromo = promo.code;
      }

      let feastCoinBalance = 0;
      if (useWallet && customerId) {
        const user = users.find(u => u.id === customerId);
        if (user && user.wallet > 0) {
          feastCoinBalance = Number(user.wallet || user.feastCoins || 0);
        }
      }

      const bill = calculateServerBill({
        items: enrichedItems,
        promo,
        redeemFeastCoins: Boolean(useWallet || redeemFeastCoins),
        feastCoinBalance,
        hasOwnDelivery: Boolean(restaurant.hasOwnDelivery),
        isNewUser,
      });
      if (bill.feastCoinRedemption > 0 && customerId) {
        const user = users.find(u => u.id === customerId);
        if (user) user.wallet = +(Number(user.wallet || 0) - bill.feastCoinRedemption).toFixed(2);
      }
      // Platform delivery restaurants: start UNASSIGNED
      const deliveryOtp = String(Math.floor(1000 + Math.random() * 9000));
      const deliveryOtpVerified = false;

      const order = {
        id: `ord-${uuidv4().slice(0,6).toUpperCase()}`,
        customerId: customerId || 'guest', customerName, customerPhone: customerPhone || null, customerEmail: customerEmail || null,
        restaurantId, restaurantName: restaurant.name,
        deliveryAgentId: null,
        deliveryAgentName: 'Unassigned',
        items: enrichedItems,
        subtotal: bill.subtotal, platformFee: bill.platformFee, packagingFee: bill.packagingFee, gstPercent: 0, gstAmount: 0,
        deliveryFee: bill.deliveryFee, discount: bill.discount, walletUsed: 0, feastCoinRedemption: bill.feastCoinRedemption,
        platformCommission: bill.platformCommission,
        platformCommissionPercent: bill.platformCommissionPercent,
        feastCoinsEarned: bill.feastCoinsEarned,
        netSettlementAmount: bill.netSettlementAmount,
        total: bill.total,
        promoCode: bill.appliedPromo, deliveryAddress, status: 'Order Placed', reviewed: false,
        paymentMethod: paymentMethod || 'cod',
        paymentStatus: 'pending',
        razorpayOrderId: null,
        razorpayPaymentId: null,
        deliveryOtp,
        deliveryOtpVerified,
        deliveryLat: deliveryLat || null, deliveryLng: deliveryLng || null,
        placedAt: new Date().toISOString(),
        statusHistory: [{ status: 'Order Placed', time: new Date().toISOString() }]
      };

      orders.push(order);
      console.log('[orders.create] in-memory order stored', { orderId: order.id });

      try {
        const restaurantEmail = restaurant.email || await getRestaurantOwnerEmail(restaurantId);
        await sendOrderNotifications(buildEmailOrderPayload({ ...order, restaurantEmail }, restaurant, order.id));
      } catch (emailError) {
        console.warn('Could not send order emails:', emailError.message);
      }

      return res.status(201).json(order);
    }

    // Firebase mode
    const restDoc = await db.collection('restaurants').doc(restaurantId).get();
    if (!restDoc.exists) return res.status(404).json({ error: 'Restaurant not found' });

    const restaurant = restDoc.data();
    const menuSnap = await db.collection('restaurants').doc(restaurantId).collection('menu').get();
    const menu = menuSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    let user = null;
    if (customerId) {
      const userDoc = await db.collection('users').doc(customerId).get();
      if (userDoc.exists) user = userDoc.data();
    }

    const isNewUser = Boolean(isGuest || user?.isNewUser || String(customerId || '').startsWith('guest_'));
    const enrichedItems = buildOrderItems(menu, items, isNewUser);
    if (!enrichedItems.length) return res.status(400).json({ error: 'No valid available menu items were found' });

    let promo = null;
    let appliedPromo = null;


    if (promoCode) {
      const promoDoc = await db.collection('promoCodes').doc(promoCode.toUpperCase()).get();
      if (promoDoc.exists) {
        promo = promoDoc.data();
        if (promo.active) appliedPromo = promo.code || promoDoc.id;
        else promo = null;
      }
    }

    const feastCoinBalance = Number(user?.wallet ?? user?.feastCoins ?? 0);
    const bill = calculateServerBill({
      items: enrichedItems,
      promo,
      redeemFeastCoins: Boolean(useWallet || redeemFeastCoins),
      feastCoinBalance,
      hasOwnDelivery: Boolean(restaurant.hasOwnDelivery),
      isNewUser,
    });

    if (bill.feastCoinRedemption > 0 && customerId) {
      const nextBalance = Math.max(0, feastCoinBalance - bill.feastCoinRedemption);
      await db.collection('users').doc(customerId).set({ wallet: nextBalance, feastCoins: nextBalance }, { merge: true });
    }

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
      customerPhone: customerPhone || null,
      customerEmail: customerEmail || null,
      isGuest: Boolean(isGuest),
      restaurantId,
      restaurantName: restaurant.name,
      deliveryAgentId,
      deliveryAgentName,
      deliveryOtp,
      deliveryOtpVerified: false,
      deliveryOtpExpiresAt: null,

      items: enrichedItems,
      subtotal: bill.subtotal,
      platformFee: bill.platformFee,
      packagingFee: bill.packagingFee,
      gstPercent: 0,
      gstAmount: 0,
      deliveryFee: bill.deliveryFee,
      discount: bill.discount,
      walletUsed: 0,
      feastCoinRedemption: bill.feastCoinRedemption,
      platformCommission: bill.platformCommission,
      platformCommissionPercent: bill.platformCommissionPercent,
      feastCoinsEarned: bill.feastCoinsEarned,
      netSettlementAmount: bill.netSettlementAmount,
      total: bill.total,
      promoCode: bill.appliedPromo,
      deliveryAddress,
      status: 'Order Placed',
      reviewed: false,
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: 'pending',
      razorpayOrderId: null,
      razorpayPaymentId: null,
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
    
    // Send notification to restaurant and delivery partners.
    try {
      await sendOrderPlacedNotifications({ db, admin, orderId: orderRef.id, order: orderData });
    } catch (notificationError) {
      console.warn('Could not send order notification:', notificationError.message);
    }

    // Email notifications for restaurant, delivery partner (if assigned), and customer.
    try {
      const restaurantEmail = restaurant.email || await getRestaurantOwnerEmail(restaurantId);
      await sendOrderNotifications(buildEmailOrderPayload({ ...orderData, restaurantEmail }, restaurant, orderRef.id));
    } catch (emailError) {
      console.warn('Could not send order emails:', emailError.message);
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

    if (!db && !canUseDemoFallback()) {
      return res.status(503).json({ error: 'Database is not connected. Demo fallback is disabled.' });
    }

    if (!db) {
      const { orders } = require('../data/db');
      let result = [...orders].reverse();
      if (customerId) result = result.filter(o => o.customerId === customerId);
      if (restaurantId) result = result.filter(o => o.restaurantId === restaurantId);
      if (agentId) result = result.filter(o => o.deliveryAgentId === agentId);
      return res.json(result);
    }

    let query = db.collection('orders');
    if (customerId) query = query.where('customerId', '==', customerId);
    if (restaurantId) query = query.where('restaurantId', '==', restaurantId);
    if (agentId) query = query.where('deliveryAgentId', '==', agentId);

    const snap = await query.get();
    const orders = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => new Date(b.placedAt || 0).getTime() - new Date(a.placedAt || 0).getTime());
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!db && !canUseDemoFallback()) {
      return res.status(503).json({ error: 'Database is not connected. Demo fallback is disabled.' });
    }

    if (!db) {
      const { orders } = require('../data/db');
      const order = orders.find(o => o.id === req.params.id);
      if (!order) return res.status(404).json({ error: 'Not found' });
      return res.json(order);
    }

    const doc = await db.collection('orders').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
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

    if (!db && !canUseDemoFallback()) {
      return res.status(503).json({ error: 'Database is not connected. Demo fallback is disabled.' });
    }

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
      order.deliveryAgentEmail = agent?.email || null;
      order.deliveryAgentPhone = agent?.phone || null;

      if (['Placed', 'Order Placed', 'Restaurant Accepted'].includes(order.status)) order.status = 'Delivery Partner Assigned';
      order.assignmentStatus = 'assigned';
      order.assignedAt = new Date().toISOString();

      try {
        await sendAdminOrderEvent(
          await hydrateEmailOrderPayload(order, req.params.id),
          'Order received by delivery partner',
          'DELIVERY PARTNER RECEIVED ORDER',
          `${order.deliveryAgentName} accepted this delivery.`
        );
      } catch (emailError) {
        console.warn('Could not send admin delivery acceptance email:', emailError.message);
      }

      return res.json(order);
    }

    const doc = await db.collection('orders').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Order not found' });

    const order = doc.data();

    if (order.deliveryAgentId && order.deliveryAgentId !== agentId) {
      return res.status(409).json({ error: 'Order already accepted by another agent' });
    }

    const agentContact = await getDeliveryPartnerContact(agentId);
    const updates = {
      deliveryAgentId: agentId,
      deliveryAgentName: agentContact?.name || agentName || 'Delivery Partner',
      deliveryAgentEmail: agentContact?.email || null,
      deliveryAgentPhone: agentContact?.phone || null,
      status: ['Placed', 'Order Placed', 'Restaurant Accepted'].includes(order.status) ? 'Delivery Partner Assigned' : order.status,
      statusHistory: (order.statusHistory || []).concat([{ status: 'Delivery Partner Assigned', time: new Date().toISOString() }]),
      acceptedAt: new Date().toISOString(),
      assignmentStatus: 'assigned',
    };

    await db.collection('orders').doc(req.params.id).update(updates);

    const updatedSnap = await db.collection('orders').doc(req.params.id).get();

    try {
      await sendAdminOrderEvent(
        await hydrateEmailOrderPayload({ ...order, ...updates }, req.params.id),
        'Order received by delivery partner',
        'DELIVERY PARTNER RECEIVED ORDER',
        `${updates.deliveryAgentName} accepted this delivery.`
      );
    } catch (emailError) {
      console.warn('Could not send admin delivery acceptance email:', emailError.message);
    }

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

    if (!db && !canUseDemoFallback()) {
      return res.status(503).json({ error: 'Database is not connected. Demo fallback is disabled.' });
    }

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
      if (status === 'Delivered') {
        order.deliveredAt = order.deliveredAt || new Date().toISOString();
        try {
          await sendAdminOrderEvent(
            await hydrateEmailOrderPayload(order, req.params.id),
            'Order delivered',
            'ORDER DELIVERED',
            'Delivery partner marked this order as delivered.'
          );
        } catch (emailError) {
          console.warn('Could not send admin delivered email:', emailError.message);
        }
      }
      return res.json(order);
    }

    const doc = await db.collection('orders').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });

    const history = doc.data().statusHistory || [];
    history.push({ status, time: new Date().toISOString() });

    const updates = {
      status,
      statusHistory: history,
    };
    if (status === 'Delivered') updates.deliveredAt = doc.data().deliveredAt || new Date().toISOString();

    await db.collection('orders').doc(req.params.id).update(updates);

    if (status === 'Delivered') {
      try {
        await sendAdminOrderEvent(
          await hydrateEmailOrderPayload({ ...doc.data(), ...updates }, req.params.id),
          'Order delivered',
          'ORDER DELIVERED',
          'Delivery partner marked this order as delivered.'
        );
      } catch (emailError) {
        console.warn('Could not send admin delivered email:', emailError.message);
      }
    }

    res.json({ id: doc.id, ...doc.data(), ...updates });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/orders/:id/admin-status
router.patch('/:id/admin-status', async (req, res) => {
  try {
    const { status, adminId } = req.body || {};
    const actingAdminId = String(req.headers['x-admin-id'] || adminId || '').trim();
    if (!STATUS_FLOW.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    if (!actingAdminId) return res.status(403).json({ error: 'Admin access required' });

    const now = new Date().toISOString();

    if (!db) {
      const { orders, users } = require('../data/db');
      const adminUser = users.find(u => u.id === actingAdminId && u.role === 'admin');
      if (!adminUser) return res.status(403).json({ error: 'Admin access required' });
      const order = orders.find(o => o.id === req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      order.status = status;
      order.updatedAt = now;
      order.statusHistory = (order.statusHistory || []).concat([{ status, actorId: actingAdminId, note: 'Admin updated order status', time: now }]);
      if (status === 'Delivered') order.deliveredAt = order.deliveredAt || now;
      if (status === 'Delivered') {
        try {
          await sendAdminOrderEvent(
            await hydrateEmailOrderPayload(order, req.params.id),
            'Order delivered',
            'ORDER DELIVERED',
            'Admin marked this order as delivered.'
          );
        } catch (emailError) {
          console.warn('Could not send admin delivered email:', emailError.message);
        }
      }
      return res.json(order);
    }

    const adminDoc = await db.collection('users').doc(actingAdminId).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const orderRef = db.collection('orders').doc(req.params.id);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) return res.status(404).json({ error: 'Order not found' });

    const order = orderDoc.data();
    const statusHistory = (order.statusHistory || []).concat([{
      status,
      actorId: actingAdminId,
      note: 'Admin updated order status',
      time: now,
    }]);

    const updates = {
      status,
      statusHistory,
      updatedAt: now,
    };
    if (status === 'Delivered') {
      updates.deliveredAt = order.deliveredAt || now;
      updates.settlementStatus = order.settlementStatus || 'pending';
    }

    await orderRef.update(updates);
    const updatedSnap = await orderRef.get();

    if (status === 'Delivered') {
      try {
        await sendAdminOrderEvent(
          await hydrateEmailOrderPayload({ ...order, ...updates }, req.params.id),
          'Order delivered',
          'ORDER DELIVERED',
          'Admin marked this order as delivered.'
        );
      } catch (emailError) {
        console.warn('Could not send admin delivered email:', emailError.message);
      }
    }

    return res.json({ id: updatedSnap.id, ...updatedSnap.data() });
  } catch (error) {
    console.error('Admin update order status error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/cancel', async (req, res) => {
  try {
    const { actorId, role, reason } = req.body || {};
    const now = new Date().toISOString();

    if (!db && !canUseDemoFallback()) {
      return res.status(503).json({ error: 'Database is not connected. Demo fallback is disabled.' });
    }

    if (!db) {
      const { orders } = require('../data/db');
      const order = orders.find(o => o.id === req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (isFinalStatus(order.status)) return res.status(409).json({ error: `Order is already ${order.status}` });
      if (role === 'restaurant' && ['On The Way', 'Order Picked Up', 'Pickup OTP Verified'].includes(order.status)) {
        return res.status(409).json({ error: 'Restaurant can cancel only before the order is picked up.' });
      }
      order.status = 'Cancelled';
      order.cancelledAt = now;
      order.cancelledBy = actorId || role || 'system';
      order.statusHistory = (order.statusHistory || []).concat([{ status: 'Cancelled', actorId, note: reason || 'Order cancelled', time: now }]);
      try {
        const payload = await hydrateEmailOrderPayload(order, req.params.id);
        await Promise.all([
          role === 'restaurant'
            ? sendCustomerOrderCancelledEmail(payload, reason || 'The restaurant could not prepare this order.')
            : Promise.resolve(),
          sendAdminOrderEvent(payload, 'Order cancelled', 'ORDER CANCELLED', reason || 'Order cancelled'),
        ]);
      } catch (emailError) {
        console.warn('Could not send cancellation emails:', emailError.message);
      }
      return res.json(order);
    }

    const orderRef = db.collection('orders').doc(req.params.id);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) return res.status(404).json({ error: 'Order not found' });
    const order = orderDoc.data();
    if (isFinalStatus(order.status)) return res.status(409).json({ error: `Order is already ${order.status}` });
    if (role === 'restaurant' && ['On The Way', 'Order Picked Up', 'Pickup OTP Verified'].includes(order.status)) {
      return res.status(409).json({ error: 'Restaurant can cancel only before the order is picked up.' });
    }

    await orderRef.update({
      status: 'Cancelled',
      cancelledAt: now,
      cancelledBy: actorId || role || 'system',
      updatedAt: now,
      statusHistory: (order.statusHistory || []).concat([{ status: 'Cancelled', actorId, note: reason || 'Order cancelled', time: now }]),
    });

    const updated = await orderRef.get();
    try {
      const payload = await hydrateEmailOrderPayload(updated.data(), req.params.id);
      await Promise.all([
        role === 'restaurant'
          ? sendCustomerOrderCancelledEmail(payload, reason || 'The restaurant could not prepare this order.')
          : Promise.resolve(),
        sendAdminOrderEvent(payload, 'Order cancelled', 'ORDER CANCELLED', reason || 'Order cancelled'),
      ]);
    } catch (emailError) {
      console.warn('Could not send cancellation emails:', emailError.message);
    }
    return res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/return', async (req, res) => {
  try {
    const { agentId, reason } = req.body || {};
    const now = new Date().toISOString();

    if (!db && !canUseDemoFallback()) {
      return res.status(503).json({ error: 'Database is not connected. Demo fallback is disabled.' });
    }

    if (!db) {
      const { orders } = require('../data/db');
      const order = orders.find(o => o.id === req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (agentId && order.deliveryAgentId !== agentId) return res.status(403).json({ error: 'Only the assigned delivery partner can return this order' });
      if (isFinalStatus(order.status)) return res.status(409).json({ error: `Order is already ${order.status}` });
      order.status = 'Returned';
      order.returnedAt = now;
      order.returnReason = reason || 'Customer did not receive order';
      order.statusHistory = (order.statusHistory || []).concat([{ status: 'Returned', actorId: agentId, note: order.returnReason, time: now }]);
      try {
        await sendAdminOrderEvent(
          await hydrateEmailOrderPayload(order, req.params.id),
          'Order not received by customer',
          'ORDER NOT RECEIVED BY CUSTOMER',
          order.returnReason
        );
      } catch (emailError) {
        console.warn('Could not send admin return email:', emailError.message);
      }
      return res.json(order);
    }

    const orderRef = db.collection('orders').doc(req.params.id);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) return res.status(404).json({ error: 'Order not found' });
    const order = orderDoc.data();
    if (agentId && order.deliveryAgentId !== agentId) return res.status(403).json({ error: 'Only the assigned delivery partner can return this order' });
    if (isFinalStatus(order.status)) return res.status(409).json({ error: `Order is already ${order.status}` });

    await orderRef.update({
      status: 'Returned',
      returnedAt: now,
      returnReason: reason || 'Customer did not receive order',
      updatedAt: now,
      statusHistory: (order.statusHistory || []).concat([{ status: 'Returned', actorId: agentId, note: reason || 'Customer did not receive order', time: now }]),
    });

    const updated = await orderRef.get();
    try {
      await sendAdminOrderEvent(
        await hydrateEmailOrderPayload(updated.data(), req.params.id),
        'Order not received by customer',
        'ORDER NOT RECEIVED BY CUSTOMER',
        updated.data().returnReason || 'Customer did not receive order'
      );
    } catch (emailError) {
      console.warn('Could not send admin return email:', emailError.message);
    }
    return res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error('Return order error:', error);
    res.status(500).json({ error: error.message });
  }
});



module.exports = router;

