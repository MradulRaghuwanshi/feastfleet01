import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, arrayUnion, arrayRemove, onSnapshot,
  runTransaction, increment
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from 'firebase/auth';
import { db, auth, rtdb } from './config';
import { ref, set, onValue, off } from 'firebase/database';
import { API_BASE_URL } from '../utils/apiConfig';
import {
  ORDER_STATUS,
  ORDER_FLOW,
  PLATFORM_FEES,
  calculateBill,
  calculateFeastCoinsEarned,
  calculateRestaurantSettlement,
  getMonthEndIso,
  getMonthKey,
  normalizeOrderStatus,
  roundMoney,
} from '../domain/platform';

const API_ROOT = API_BASE_URL;

const apiJson = async (path, options = {}) => {
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  const text = await response.text();
  const payload = text ? (() => {
    try { return JSON.parse(text); } catch { return { error: text }; }
  })() : {};

  if (!response.ok) {
    throw new Error(payload.error || payload.message || `Request failed with status ${response.status}`);
  }

  return payload;
};

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const WEEKDAY_NAMES = {
  sun: ['sun', 'sunday'],
  mon: ['mon', 'monday'],
  tue: ['tue', 'tuesday'],
  wed: ['wed', 'wednesday'],
  thu: ['thu', 'thursday'],
  fri: ['fri', 'friday'],
  sat: ['sat', 'saturday'],
};

const normalizeDay = (day) => String(day || '').trim().toLowerCase();

const normalizeActiveDays = (days) => {
  if (!Array.isArray(days) || days.length === 0) return [...WEEKDAY_KEYS];
  const normalized = days
    .map(normalizeDay)
    .flatMap(day => {
      const matched = Object.entries(WEEKDAY_NAMES).find(([, aliases]) => aliases.includes(day));
      return matched ? [matched[0]] : [];
    });
  return normalized.length ? [...new Set(normalized)] : [...WEEKDAY_KEYS];
};

const parseMinutes = (timeValue) => {
  if (!timeValue) return null;
  const [hours, minutes] = String(timeValue).split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return (hours * 60) + minutes;
};

export const getRestaurantOrderStatus = (restaurant, at = new Date()) => {
  if (!restaurant) {
    return { isAcceptingOrdersNow: false, orderStatusLabel: 'Unavailable', orderStatusReason: 'Restaurant unavailable' };
  }

  const activeDays = normalizeActiveDays(restaurant.activeDays);
  const currentDay = WEEKDAY_KEYS[at.getDay()];
  const openingMinutes = parseMinutes(restaurant.openingTime);
  const closingMinutes = parseMinutes(restaurant.closingTime);
  const nowMinutes = at.getHours() * 60 + at.getMinutes();

  if (restaurant.isOpen === false) {
    return {
      ...restaurant,
      activeDays,
      isAcceptingOrdersNow: false,
      orderStatusLabel: 'Closed',
      orderStatusReason: restaurant.closedMessage || 'Restaurant is closed',
    };
  }

  if (!activeDays.includes(currentDay)) {
    return {
      ...restaurant,
      activeDays,
      isAcceptingOrdersNow: false,
      orderStatusLabel: 'Closed today',
      orderStatusReason: restaurant.closedMessage || 'Restaurant is closed today',
    };
  }

  if (openingMinutes === null || closingMinutes === null) {
    return {
      ...restaurant,
      activeDays,
      isAcceptingOrdersNow: true,
      orderStatusLabel: 'Open',
      orderStatusReason: '',
    };
  }

  const crossesMidnight = closingMinutes <= openingMinutes;
  const isOpenNow = crossesMidnight
    ? nowMinutes >= openingMinutes || nowMinutes < closingMinutes
    : nowMinutes >= openingMinutes && nowMinutes < closingMinutes;

  return {
    ...restaurant,
    activeDays,
    isAcceptingOrdersNow: isOpenNow,
    orderStatusLabel: isOpenNow ? 'Open' : 'Closed now',
    orderStatusReason: isOpenNow
      ? ''
      : (restaurant.closedMessage || `Open ${restaurant.openingTime || '00:00'} - ${restaurant.closingTime || '23:59'}`),
  };
};

const enhanceRestaurant = (restaurant) => getRestaurantOrderStatus(restaurant);

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 45;
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCK_MINUTES = 10;
const OTP_KEY_TEXT = process.env.REACT_APP_OTP_FIELD_KEY || 'feastfleet-demo-otp-field-key-v1';

const toDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  return new Date(value);
};

const nowIso = () => new Date().toISOString();

const bytesToBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const base64ToBytes = (base64) => Uint8Array.from(atob(base64), c => c.charCodeAt(0));

const getCrypto = () => window.crypto || window.msCrypto;

const sha256 = async (text) => {
  const digest = await getCrypto().subtle.digest('SHA-256', new TextEncoder().encode(text));
  return bytesToBase64(digest);
};

const getOtpCryptoKey = async () => {
  const keyBytes = await getCrypto().subtle.digest('SHA-256', new TextEncoder().encode(OTP_KEY_TEXT));
  return getCrypto().subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
};

const generatePickupOtp = () => {
  const max = 10 ** OTP_LENGTH;
  const arr = new Uint32Array(1);
  getCrypto().getRandomValues(arr);
  return String(arr[0] % max).padStart(OTP_LENGTH, '0');
};

const encryptPickupOtp = async (otp) => {
  const iv = new Uint8Array(12);
  const salt = new Uint8Array(16);
  getCrypto().getRandomValues(iv);
  getCrypto().getRandomValues(salt);
  const key = await getOtpCryptoKey();
  const cipher = await getCrypto().subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(otp)
  );
  const saltText = bytesToBase64(salt);
  return {
    pickupOtpCipher: bytesToBase64(cipher),
    pickupOtpIv: bytesToBase64(iv),
    pickupOtpSalt: saltText,
    pickupOtpHash: await sha256(`${saltText}:${otp}`),
    pickupOtpExpiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString(),
    pickupOtpAttempts: 0,
  };
};

const decryptPickupOtp = async (order) => {
  if (!order?.pickupOtpCipher || !order?.pickupOtpIv) return order?.deliveryOtp || '';
  const key = await getOtpCryptoKey();
  const plain = await getCrypto().subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(order.pickupOtpIv) },
    key,
    base64ToBytes(order.pickupOtpCipher)
  );
  return new TextDecoder().decode(plain);
};

const makeStatusEvent = (status, actorId, note) => ({
  status,
  actorId: actorId || null,
  note: note || null,
  time: nowIso(),
});

const mergeStatus = (currentStatus, incomingStatus) => {
  const current = normalizeOrderStatus(currentStatus);
  const incoming = normalizeOrderStatus(incomingStatus);
  return ORDER_FLOW.indexOf(incoming) >= ORDER_FLOW.indexOf(current) ? incoming : current;
};

const isCustomerVisibleOrder = (order) => {
  const clone = { ...order };
  delete clone.deliveryOtp;
  delete clone.pickupOtpCipher;
  delete clone.pickupOtpIv;
  delete clone.pickupOtpSalt;
  delete clone.pickupOtpHash;
  return clone;
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const firebaseLogin = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const firebaseLogout = () => signOut(auth);

export const onAuthChange = (cb) => onAuthStateChanged(auth, cb);

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// ─── RESTAURANTS ──────────────────────────────────────────────────────────────
export const getRestaurants = async (cuisine) => {
  const queryParam = cuisine && cuisine !== 'All' ? `?cuisine=${encodeURIComponent(cuisine)}` : '';
  const restaurants = await apiJson(`/restaurants${queryParam}`);
  return restaurants.map(enhanceRestaurant);
};

export const getRestaurant = async (id) => {
  try {
    const restaurant = await apiJson(`/restaurants/${id}`);
    return enhanceRestaurant(restaurant);
  } catch (error) {
    console.error('Get restaurant error:', error);
    return null;
  }
};

export const toggleRestaurantStatus = async (id) => {
  await apiJson(`/restaurants/${id}/toggle-status`, { method: 'PATCH', body: '{}' });
};

export const toggleMenuItemAvailability = async (restaurantId, itemId) => {
  await apiJson(`/restaurants/${restaurantId}/menu/${itemId}`, { method: 'PATCH', body: '{}' });
};

export const searchRestaurants = async (q) => {
  return apiJson(`/search?q=${encodeURIComponent(q)}`);
};

// ─── FEAST COINS WALLET ──────────────────────────────────────────────────────
export const getWalletRef = (userId) => doc(db, 'wallets', userId);

const getInitialWallet = (userId, fallbackCoins = 0) => {
  const monthKey = getMonthKey();
  return {
    id: userId,
    userId,
    isVirtual: true,
    currentBalance: Math.max(0, Math.floor(Number(fallbackCoins || 0))),
    earnedThisMonth: 0,
    redeemedThisMonth: 0,
    lifetimeEarned: 0,
    lifetimeRedeemed: 0,
    monthKey,
    expiresAt: getMonthEndIso(),
    updatedAt: nowIso(),
  };
};

const ensureWalletForMonth = (transaction, walletRef, currentWallet, userId) => {
  const monthKey = getMonthKey();
  if (!currentWallet) {
    const { isVirtual, id, ...created } = getInitialWallet(userId);
    transaction.set(walletRef, created);
    return created;
  }

  if (currentWallet.monthKey === monthKey) return currentWallet;

  const archiveRef = doc(collection(walletRef, 'monthlyArchives'), currentWallet.monthKey || 'unknown-month');
  transaction.set(archiveRef, {
    ...currentWallet,
    archivedAt: nowIso(),
    archivedBalance: Math.max(0, Math.floor(Number(currentWallet.currentBalance || 0))),
  });

  const refreshed = {
    ...currentWallet,
    currentBalance: 0,
    earnedThisMonth: 0,
    redeemedThisMonth: 0,
    monthKey,
    expiresAt: getMonthEndIso(),
    updatedAt: nowIso(),
  };
  transaction.set(walletRef, refreshed, { merge: true });
  return refreshed;
};

export const getWallet = async (userId) => {
  const snap = await getDoc(getWalletRef(userId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : getInitialWallet(userId);
};

export const listenToWallet = (userId, cb) => {
  if (!userId) return () => {};
  return onSnapshot(
    getWalletRef(userId),
    snap => {
      cb(snap.exists() ? { id: snap.id, ...snap.data() } : getInitialWallet(userId));
    },
    () => cb(getInitialWallet(userId))
  );
};

export const redeemableFeastCoins = (balance = 0, payable = Infinity) => {
  const coins = Math.max(0, Math.floor(Number(balance || 0)));
  if (coins < PLATFORM_FEES.minimumCoinRedemption) return 0;
  return Math.min(coins, Math.floor(Number(payable || 0)));
};

// ─── ORDERS ───────────────────────────────────────────────────────────────────
export const placeOrder = async (orderData) => {
  if (!orderData?.restaurantId || !orderData?.items?.length || !orderData?.customerName) {
    throw new Error('Restaurant, customer details and cart items are required');
  }

  try {
    const customerId = orderData.customerId || `guest_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const isGuestOrder = Boolean(orderData.isGuest || String(customerId).startsWith('guest_'));

    const otp = generatePickupOtp();
    const encryptedOtp = await encryptPickupOtp(otp);
    const orderRef = doc(collection(db, 'orders'));
    const walletRef = getWalletRef(customerId);
    const userRef = doc(db, 'users', customerId);
    const txRef = doc(collection(walletRef, 'transactions'));
    const earnTxRef = doc(collection(walletRef, 'transactions'));
    const appConfigRef = doc(db, 'appConfig', 'general');
    const restaurantRef = doc(db, 'restaurants', orderData.restaurantId);
    const promoRef = orderData.promoCode ? doc(db, 'promoCodes', String(orderData.promoCode).toUpperCase()) : null;

    const order = await runTransaction(db, async (transaction) => {
      const [restaurantSnap, walletSnap, userSnap, appConfigSnap, promoSnap] = await Promise.all([
        transaction.get(restaurantRef),
        isGuestOrder ? Promise.resolve(null) : transaction.get(walletRef),
        isGuestOrder ? Promise.resolve(null) : transaction.get(userRef),
        transaction.get(appConfigRef),
        promoRef ? transaction.get(promoRef) : Promise.resolve(null),
      ]);

      if (!restaurantSnap.exists()) throw new Error('Restaurant not found');

      const restaurant = restaurantSnap.data();
      const availability = getRestaurantOrderStatus(restaurant);
      if (!availability.isAcceptingOrdersNow) {
        throw new Error(availability.orderStatusReason || 'Restaurant is currently closed');
      }
      const appConfig = appConfigSnap.exists() ? appConfigSnap.data() : {};
      const userData = userSnap?.exists?.() ? userSnap.data() : {};
      const fallbackBalance = isGuestOrder ? 0 : (userData.feastCoins ?? userData.wallet ?? 0);
      const { isVirtual, id, ...fallbackWallet } = getInitialWallet(customerId, fallbackBalance);
      const wallet = isGuestOrder
        ? fallbackWallet
        : ensureWalletForMonth(
            transaction,
            walletRef,
            walletSnap.exists() ? walletSnap.data() : fallbackWallet,
            customerId
          );

      let promo = null;
      if (promoSnap?.exists()) {
        const p = promoSnap.data();
        if (p.active && Number(orderData.subtotal || 0) >= Number(p.minOrder || 0)) {
          promo = { ...p, code: p.code || promoSnap.id };
        }
      }

      const items = orderData.items.map(item => ({
        id: item.id,
        name: item.name,
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 0),
        image: item.image || '',
      })).filter(item => item.quantity > 0);

      const bill = calculateBill({
        items,
        promo,
        feastCoinBalance: wallet.currentBalance,
        redeemFeastCoins: !isGuestOrder && Boolean(orderData.redeemFeastCoins || orderData.useFeastCoins),
      });

      const feastCoinRedemption = isGuestOrder ? 0 : bill.feastCoinRedemption;
      const coinsEarned = isGuestOrder ? 0 : bill.coinsEarned;

      if (feastCoinRedemption > Number(wallet.currentBalance || 0)) {
        throw new Error('Insufficient Feast Coin balance');
      }

      const currentBalance = Math.max(0, Math.floor(Number(wallet.currentBalance || 0)));
      const nextBalance = Math.max(0, currentBalance - feastCoinRedemption + coinsEarned);
      const placedAt = nowIso();
      const orderNumber = `FF-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${orderRef.id.slice(0, 6).toUpperCase()}`;

      const orderPayload = {
        id: orderRef.id,
        orderNumber,
        customerId,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone || null,
        customerEmail: orderData.customerEmail || null,
        isGuest: isGuestOrder,
        restaurantId: orderData.restaurantId,
        restaurantName: orderData.restaurantName || restaurant.name,
        restaurantOpenNow: availability.isAcceptingOrdersNow,
        deliveryAgentId: null,
        deliveryAgentName: 'Unassigned',
        items,
        subtotal: bill.subtotal,
        gstPercent: 0,
        gstAmount: 0,
        platformFee: bill.platformFee,
        packagingFee: bill.packagingFee,
        deliveryFee: bill.deliveryFee,
        discount: bill.discount,
        walletUsed: 0,
        feastCoinRedemption,
        feastCoinsEarned: coinsEarned,
        platformCommission: bill.platformCommission,
        platformCommissionPercent: bill.commissionPercent,
        grossFoodAmount: bill.grossFoodAmount,
        netSettlementAmount: bill.netSettlementAmount,
        total: bill.finalPayable,
        promoCode: promo?.code || null,
        deliveryAddress: orderData.deliveryAddress,
        deliveryLat: orderData.deliveryLat || null,
        deliveryLng: orderData.deliveryLng || null,
        status: ORDER_STATUS.PLACED,
        restaurantAcceptedAt: null,
        assignmentStatus: 'broadcast',
        deliveryBroadcast: {
          status: 'open',
          radiusKm: Number(appConfig.deliveryRadiusKm || 8),
          openedAt: placedAt,
          acceptedAt: null,
        },
        pickupOtpVerified: false,
        pickupOtpVerifiedAt: null,
        pickupOtpMaxAttempts: OTP_MAX_ATTEMPTS,
        ...encryptedOtp,
        reviewed: false,
        placedAt,
        updatedAt: placedAt,
        statusHistory: [makeStatusEvent(ORDER_STATUS.PLACED, customerId, isGuestOrder ? 'Guest placed order' : 'Customer placed order')],
        financialsPosted: false,
        deliveryEarningPosted: false,
        settlementPosted: false,
      };

      transaction.set(orderRef, orderPayload);

      if (!isGuestOrder) {
        const walletUpdate = {
          currentBalance: nextBalance,
          earnedThisMonth: Number(wallet.earnedThisMonth || 0) + coinsEarned,
          redeemedThisMonth: Number(wallet.redeemedThisMonth || 0) + feastCoinRedemption,
          lifetimeEarned: Number(wallet.lifetimeEarned || 0) + coinsEarned,
          lifetimeRedeemed: Number(wallet.lifetimeRedeemed || 0) + feastCoinRedemption,
          monthKey: getMonthKey(),
          expiresAt: getMonthEndIso(),
          updatedAt: placedAt,
        };
        transaction.set(walletRef, { ...wallet, ...walletUpdate, userId: customerId }, { merge: true });
        transaction.set(userRef, {
          feastCoins: nextBalance,
          wallet: nextBalance,
          updatedAt: placedAt,
        }, { merge: true });

        if (feastCoinRedemption > 0) {
          transaction.set(txRef, {
            userId: customerId,
            orderId: orderRef.id,
            type: 'redeem',
            amount: -feastCoinRedemption,
            balanceAfter: nextBalance - coinsEarned,
            description: `Redeemed on order ${orderNumber}`,
            createdAt: placedAt,
            monthKey: getMonthKey(),
          });
        }

        if (coinsEarned > 0) {
          transaction.set(earnTxRef, {
            userId: customerId,
            orderId: orderRef.id,
            type: 'earn',
            amount: coinsEarned,
            balanceAfter: nextBalance,
            description: `Earned ${coinsEarned} Feast Coins for ₹${bill.subtotal.toFixed(0)} food subtotal`,
            createdAt: placedAt,
            monthKey: getMonthKey(),
          });
        }
      }

      return orderPayload;
    });

    return isCustomerVisibleOrder(order);
  } catch (error) {
    console.warn('placeOrder Firestore write failed, falling back to API:', error?.message || error);
    const payload = await apiJson('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
    return payload?.id ? payload : { id: payload.id || payload.orderId || payload.order_id, ...orderData };
  }
};

export const createOrder = async (orderData) => {
  const ref_ = await addDoc(collection(db, 'orders'), {
    ...orderData,
    reviewed: false,
    placedAt: serverTimestamp(),
    statusHistory: [{ status: orderData.status || 'Placed', time: new Date().toISOString() }]
  });
  return { id: ref_.id, ...orderData };
};

export const getOrder = async (id) => {
  const snap = await getDoc(doc(db, 'orders', id));
  return snap.exists() ? isCustomerVisibleOrder({ id: snap.id, ...snap.data() }) : null;
};

export const getOrdersByCustomer = async (customerId) => {
  const q = query(collection(db, 'orders'), where('customerId', '==', customerId), orderBy('placedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => isCustomerVisibleOrder({ id: d.id, ...d.data() }));
};

export const getOrdersByRestaurant = async (restaurantId) => {
  const q = query(collection(db, 'orders'), where('restaurantId', '==', restaurantId), orderBy('placedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getOrdersByAgent = async (agentId) => {
  const q = query(collection(db, 'orders'), where('deliveryAgentId', '==', agentId), orderBy('placedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const listenToDeliveryWorkQueue = (agentId, cb) => {
  const q = query(collection(db, 'orders'), orderBy('placedAt', 'desc'));
  return onSnapshot(q, snap => {
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    cb(orders.filter(order => {
      const status = normalizeOrderStatus(order.status);
      if (status === ORDER_STATUS.DELIVERED) return order.deliveryAgentId === agentId;
      return !order.deliveryAgentId || order.deliveryAgentId === agentId;
    }));
  });
};

export const listenToWalletTransactions = (userId, cb) => {
  if (!userId) return () => {};
  const q = query(collection(getWalletRef(userId), 'transactions'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => cb([]));
};

export const getVisiblePickupOtp = async (order, user) => {
  if (!order || !user) return '';
  const isRestaurant = user.role === 'restaurant' && user.restaurantId === order.restaurantId;
  const isDeliveryPartner = user.role === 'delivery' && user.id === order.deliveryAgentId;
  const isAdmin = user.role === 'admin';
  if (!isRestaurant && !isDeliveryPartner && !isAdmin) return '';
  return decryptPickupOtp(order);
};

export const acceptRestaurantOrder = async (orderId, actorId) => {
  const orderRef = doc(db, 'orders', orderId);
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(orderRef);
    if (!snap.exists()) throw new Error('Order not found');
    const order = snap.data();
    const nextStatus = mergeStatus(order.status, ORDER_STATUS.RESTAURANT_ACCEPTED);
    const event = makeStatusEvent(ORDER_STATUS.RESTAURANT_ACCEPTED, actorId, 'Restaurant accepted order');

    transaction.update(orderRef, {
      status: nextStatus,
      restaurantAcceptedAt: order.restaurantAcceptedAt || nowIso(),
      updatedAt: nowIso(),
      statusHistory: arrayUnion(event),
    });

    return { id: snap.id, ...order, status: nextStatus, restaurantAcceptedAt: order.restaurantAcceptedAt || event.time };
  });
};

export const acceptBroadcastOrder = async (orderId, agent) => {
  if (!agent?.id) throw new Error('Delivery partner is required');
  const orderRef = doc(db, 'orders', orderId);

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(orderRef);
    if (!snap.exists()) throw new Error('Order not found');

    const order = snap.data();
    if (order.deliveryAgentId && order.deliveryAgentId !== agent.id) {
      throw new Error('Order already accepted by another delivery partner');
    }

    const acceptedAt = nowIso();
    const nextStatus = mergeStatus(order.status, ORDER_STATUS.DELIVERY_ASSIGNED);
    transaction.update(orderRef, {
      deliveryAgentId: agent.id,
      deliveryAgentName: agent.name || 'Delivery Partner',
      assignmentStatus: 'assigned',
      assignedAt: order.assignedAt || acceptedAt,
      status: nextStatus,
      deliveryBroadcast: {
        ...(order.deliveryBroadcast || {}),
        status: 'accepted',
        acceptedAt,
        acceptedBy: agent.id,
      },
      updatedAt: acceptedAt,
      statusHistory: arrayUnion(makeStatusEvent(ORDER_STATUS.DELIVERY_ASSIGNED, agent.id, 'Delivery partner accepted broadcast')),
    });

    return { id: snap.id, ...order, deliveryAgentId: agent.id, deliveryAgentName: agent.name, status: nextStatus };
  });
};

export const reassignDeliveryPartner = async (orderId, agent, actorId) => {
  const orderRef = doc(db, 'orders', orderId);
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(orderRef);
    if (!snap.exists()) throw new Error('Order not found');
    const order = snap.data();
    if (normalizeOrderStatus(order.status) === ORDER_STATUS.DELIVERED) {
      throw new Error('Delivered orders cannot be reassigned');
    }

    const assignedAt = nowIso();
    const nextStatus = mergeStatus(order.status, ORDER_STATUS.DELIVERY_ASSIGNED);
    transaction.update(orderRef, {
      deliveryAgentId: agent?.id || null,
      deliveryAgentName: agent?.name || 'Unassigned',
      assignmentStatus: agent?.id ? 'assigned' : 'broadcast',
      assignedAt: agent?.id ? assignedAt : null,
      status: agent?.id ? nextStatus : order.status,
      deliveryBroadcast: {
        ...(order.deliveryBroadcast || {}),
        status: agent?.id ? 'accepted' : 'open',
        acceptedAt: agent?.id ? assignedAt : null,
        acceptedBy: agent?.id || null,
      },
      updatedAt: assignedAt,
      statusHistory: arrayUnion(makeStatusEvent(
        agent?.id ? ORDER_STATUS.DELIVERY_ASSIGNED : 'Delivery Reassignment Cleared',
        actorId,
        agent?.id ? `Admin reassigned to ${agent.name}` : 'Admin returned order to broadcast'
      )),
    });

    return { id: snap.id, ...order };
  });
};

export const verifyPickupOtp = async (orderId, otp, agentId) => {
  const orderRef = doc(db, 'orders', orderId);
  const result = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(orderRef);
    if (!snap.exists()) return { ok: false, error: 'Order not found' };

    const order = snap.data();
    const now = new Date();
    const attempts = Number(order.pickupOtpAttempts || 0);
    const lockedUntil = toDate(order.pickupOtpLockedUntil);
    const expiresAt = toDate(order.pickupOtpExpiresAt);

    if (order.deliveryAgentId && order.deliveryAgentId !== agentId) {
      return { ok: false, error: 'This order belongs to another delivery partner' };
    }

    if (order.pickupOtpVerified) {
      return { ok: false, error: 'Pickup OTP already verified' };
    }

    if (lockedUntil && lockedUntil > now) {
      return { ok: false, error: `OTP temporarily locked until ${lockedUntil.toLocaleTimeString()}` };
    }

    if (expiresAt && expiresAt < now) {
      transaction.update(orderRef, { pickupOtpExpired: true, updatedAt: nowIso() });
      return { ok: false, error: 'Pickup OTP expired. Ask restaurant/admin to regenerate it.' };
    }

    const candidate = await sha256(`${order.pickupOtpSalt}:${String(otp || '').trim()}`);
    if (!order.pickupOtpHash || candidate !== order.pickupOtpHash) {
      const nextAttempts = attempts + 1;
      const lockUpdate = nextAttempts >= Number(order.pickupOtpMaxAttempts || OTP_MAX_ATTEMPTS)
        ? { pickupOtpLockedUntil: new Date(Date.now() + OTP_LOCK_MINUTES * 60 * 1000).toISOString() }
        : {};
      transaction.update(orderRef, {
        pickupOtpAttempts: nextAttempts,
        lastPickupOtpFailureAt: nowIso(),
        updatedAt: nowIso(),
        ...lockUpdate,
      });
      return { ok: false, error: 'Invalid pickup OTP' };
    }

    const verifiedAt = nowIso();
    transaction.update(orderRef, {
      pickupOtpVerified: true,
      deliveryOtpVerified: true,
      pickupOtpVerifiedAt: verifiedAt,
      pickupOtpAttempts: attempts,
      status: ORDER_STATUS.ON_THE_WAY,
      updatedAt: verifiedAt,
      statusHistory: arrayUnion(
        makeStatusEvent(ORDER_STATUS.PICKUP_VERIFIED, agentId, 'Pickup OTP verified'),
        makeStatusEvent(ORDER_STATUS.ORDER_PICKED, agentId, 'Order picked up from restaurant'),
        makeStatusEvent(ORDER_STATUS.ON_THE_WAY, agentId, 'Customer notified that order is on the way')
      ),
    });

    return { ok: true };
  });

  if (!result.ok) throw new Error(result.error);
  return getDoc(orderRef).then(snap => ({ id: snap.id, ...snap.data() }));
};

export const updateOrderStatus = async (orderId, status, actorId) => {
  const orderRef = doc(db, 'orders', orderId);
  const normalizedStatus = normalizeOrderStatus(status);

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(orderRef);
    if (!snap.exists()) throw new Error('Order not found');

    const order = snap.data();
    const updatedAt = nowIso();
    const updates = {
      status: normalizedStatus,
      updatedAt,
      statusHistory: arrayUnion(makeStatusEvent(normalizedStatus, actorId, 'Status updated')),
    };

    if (normalizedStatus === ORDER_STATUS.DELIVERED) {
      updates.deliveredAt = order.deliveredAt || updatedAt;

      if (!order.financialsPosted) {
        const settlement = calculateRestaurantSettlement(order.subtotal || 0);
        const earningAmount = PLATFORM_FEES.deliveryEarning;

        updates.financialsPosted = true;
        updates.deliveryEarningPosted = Boolean(order.deliveryAgentId);
        updates.settlementPosted = true;
        updates.deliveryEarningAmount = order.deliveryAgentId ? earningAmount : 0;
        updates.platformCommission = settlement.platformCommission;
        updates.netSettlementAmount = settlement.netSettlementAmount;
        updates.settlementStatus = 'pending';

        if (order.deliveryAgentId) {
          transaction.set(doc(db, 'earnings', orderId), {
            orderId,
            deliveryAgentId: order.deliveryAgentId,
            deliveryAgentName: order.deliveryAgentName || '',
            amount: earningAmount,
            status: 'pending_settlement',
            restaurantId: order.restaurantId,
            deliveredAt: updates.deliveredAt,
            createdAt: updatedAt,
          });
          transaction.set(doc(db, 'deliveryPartnerStats', order.deliveryAgentId), {
            totalCompletedOrders: increment(1),
            totalEarnings: increment(earningAmount),
            pendingSettlements: increment(earningAmount),
            updatedAt,
          }, { merge: true });
        }

        transaction.set(doc(db, 'settlements', orderId), {
          orderId,
          restaurantId: order.restaurantId,
          restaurantName: order.restaurantName,
          grossOrderAmount: order.subtotal || 0,
          platformCommission: settlement.platformCommission,
          commissionPercent: settlement.commissionPercent,
          netSettlementAmount: settlement.netSettlementAmount,
          status: 'pending',
          deliveredAt: updates.deliveredAt,
          createdAt: updatedAt,
        });
      }
    }

    transaction.update(orderRef, updates);
    return { id: snap.id, ...order, ...updates };
  });
};

export const updateOrderFields = async (orderId, updates) => {
  if (!orderId) throw new Error('Order id is required');
  await updateDoc(doc(db, 'orders', orderId), {
    ...updates,
    updatedAt: nowIso(),
  });
};

export const markOrderReviewed = async (orderId) => {
  await updateDoc(doc(db, 'orders', orderId), { reviewed: true });
};

// Real-time order listener
export const listenToOrder = (orderId, cb) => {
  return onSnapshot(doc(db, 'orders', orderId), snap => {
    if (snap.exists()) cb(isCustomerVisibleOrder({ id: snap.id, ...snap.data() }));
  });
};

// Real-time orders listener for restaurant/agent
export const listenToOrdersByRestaurant = (restaurantId, cb) => {
  const q = query(collection(db, 'orders'), where('restaurantId', '==', restaurantId), orderBy('placedAt', 'desc'));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
};

export const listenToOrdersByAgent = (agentId, cb) => {
  const q = query(collection(db, 'orders'), where('deliveryAgentId', '==', agentId), orderBy('placedAt', 'desc'));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
};

// ─── REVIEWS ──────────────────────────────────────────────────────────────────
export const getReviews = async (restaurantId) => {
  const q = query(collection(db, 'reviews'), where('restaurantId', '==', restaurantId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
};

export const addReview = async (reviewData) => {
  const ref_ = await addDoc(collection(db, 'reviews'), {
    ...reviewData,
    createdAt: serverTimestamp(),
    ownerReply: null
  });
  return { id: ref_.id, ...reviewData };
};

export const replyToReview = async (reviewId, reply) => {
  await updateDoc(doc(db, 'reviews', reviewId), { ownerReply: reply });
};

// ─── PROMOS ───────────────────────────────────────────────────────────────────
export const validatePromo = async (code, subtotal) => {
  return apiJson('/promos/validate', {
    method: 'POST',
    body: JSON.stringify({ code, subtotal }),
  });
};

export const getActivePromos = async () => {
  return apiJson('/promos');
};

// ─── FAVOURITES ───────────────────────────────────────────────────────────────
export const getFavourites = async (userId) => {
  const snap = await getDoc(doc(db, 'users', userId));
  const favIds = snap.data()?.favourites || [];
  if (!favIds.length) return [];
  const results = await Promise.all(favIds.map(id => getDoc(doc(db, 'restaurants', id))));
  return results.filter(s => s.exists()).map(s => ({ id: s.id, ...s.data() }));
};

export const toggleFavourite = async (userId, restaurantId, isFav) => {
  await updateDoc(doc(db, 'users', userId), {
    favourites: isFav ? arrayRemove(restaurantId) : arrayUnion(restaurantId)
  });
};

// ─── DASHBOARD ──────────────────────────────────────────────────────────────────
export const getDashboardOverview = async (uid) => {
  const response = await fetch('/api/dashboard/overview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid })
  });
  if (!response.ok) throw new Error('Failed to fetch dashboard data');
  return response.json();
};
export const pushAgentLocation = (agentId, lat, lng) => {
  if (!rtdb) return Promise.resolve();
  return set(ref(rtdb, `agentLocations/${agentId}`), {
    lat, lng, updatedAt: new Date().toISOString()
  });
};

export const listenToAgentLocation = (agentId, cb) => {
  if (!rtdb) return () => {};
  const r = ref(rtdb, `agentLocations/${agentId}`);
  onValue(r, snap => { if (snap.val()) cb(snap.val()); });
  return () => off(r);
};

// ─── ADMIN ────────────────────────────────────────────────────────────────────
export const getAllOrders = async () => apiJson('/orders');

export const getAllUsers = async () => apiJson('/users');

export const addRestaurant = async (data) => {
  const created = await apiJson('/restaurants', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return created.id;
};

export const updateRestaurant = async (id, data) => {
  await apiJson(`/restaurants/${id}/profile`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deleteRestaurant = async (id) => {
  await apiJson(`/restaurants/${id}`, { method: 'DELETE' });
};

export const addPromo = async (promo) => {
  await apiJson('/promos', {
    method: 'POST',
    body: JSON.stringify({ ...promo, code: String(promo.code || '').toUpperCase() }),
  });
};

export const updatePromo = async (code, data) => {
  await apiJson(`/promos/${String(code || '').toUpperCase()}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deletePromo = async (code) => {
  await apiJson(`/promos/${String(code || '').toUpperCase()}`, { method: 'DELETE' });
};

export const getAllPromos = async () => apiJson('/promos?all=1');

export const listenToAllOrders = (cb) => {
  const q = query(collection(db, 'orders'), orderBy('placedAt', 'desc'));
  return onSnapshot(
    q,
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    error => {
      console.error('listenToAllOrders snapshot failed:', error);
      cb([]);
    }
  );
};
export const deductWallet = async (userId, amount) => {
  const snap = await getDoc(doc(db, 'users', userId));
  const current = snap.data()?.wallet || 0;
  await updateDoc(doc(db, 'users', userId), { wallet: Math.max(0, current - amount) });
};

// ─── APP CONFIG (Fee Settings) ──────────────────────────────────────────────
export const getAppConfig = async () => apiJson('/dashboard/config');

export const updateAppConfig = async (data) => {
  await apiJson('/dashboard/config', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

// ─── USERS ───────────────────────────────────────────────────────────────────
export const updateUser = async (userId, data) => {
  await apiJson(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const updateUserCredentials = async (userId, data) => {
  return apiJson(`/users/${userId}/credentials`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const addUser = async (userId, data) => {
  await apiJson('/users', {
    method: 'POST',
    body: JSON.stringify({ ...data, id: userId }),
  });
};

export {
  ORDER_STATUS,
  ORDER_FLOW,
  PLATFORM_FEES,
  calculateBill,
  calculateFeastCoinsEarned,
  normalizeOrderStatus,
  roundMoney,
};
