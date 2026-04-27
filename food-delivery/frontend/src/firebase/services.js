import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, arrayUnion, arrayRemove, onSnapshot
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from 'firebase/auth';
import { db, auth, rtdb } from './config';
import { ref, set, onValue, off } from 'firebase/database';

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
  let q = collection(db, 'restaurants');
  if (cuisine && cuisine !== 'All') {
    q = query(q, where('cuisine', '==', cuisine));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getRestaurant = async (id) => {
  const snap = await getDoc(doc(db, 'restaurants', id));
  if (!snap.exists()) return null;
  const menuSnap = await getDocs(collection(db, 'restaurants', id, 'menu'));
  const menu = menuSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  return { id: snap.id, ...snap.data(), menu };
};

export const toggleRestaurantStatus = async (id) => {
  const snap = await getDoc(doc(db, 'restaurants', id));
  await updateDoc(doc(db, 'restaurants', id), { isOpen: !snap.data().isOpen });
};

export const toggleMenuItemAvailability = async (restaurantId, itemId) => {
  const itemRef = doc(db, 'restaurants', restaurantId, 'menu', itemId);
  const snap = await getDoc(itemRef);
  await updateDoc(itemRef, { available: !snap.data().available });
};

export const searchRestaurants = async (q) => {
  const allSnap = await getDocs(collection(db, 'restaurants'));
  const all = allSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const ql = q.toLowerCase();
  const matchedRestaurants = all.filter(r =>
    r.name.toLowerCase().includes(ql) || r.cuisine.toLowerCase().includes(ql)
  );
  // Search menu items
  const dishes = [];
  for (const r of all) {
    const menuSnap = await getDocs(collection(db, 'restaurants', r.id, 'menu'));
    menuSnap.docs.forEach(d => {
      const item = d.data();
      if (item.name.toLowerCase().includes(ql) || item.description?.toLowerCase().includes(ql)) {
        dishes.push({ ...item, id: d.id, restaurantId: r.id, restaurantName: r.name });
      }
    });
  }
  return { restaurants: matchedRestaurants, dishes };
};

// ─── ORDERS ───────────────────────────────────────────────────────────────────
export const placeOrder = async (orderData) => {
  const ref_ = await addDoc(collection(db, 'orders'), {
    ...orderData,
    status: 'Placed',
    reviewed: false,
    placedAt: serverTimestamp(),
    statusHistory: [{ status: 'Placed', time: new Date().toISOString() }]
  });
  return { id: ref_.id, ...orderData, status: 'Placed' };
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
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getOrdersByCustomer = async (customerId) => {
  const q = query(collection(db, 'orders'), where('customerId', '==', customerId), orderBy('placedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

export const updateOrderStatus = async (orderId, status) => {
  await updateDoc(doc(db, 'orders', orderId), {
    status,
    statusHistory: arrayUnion({ status, time: new Date().toISOString() })
  });
};

export const markOrderReviewed = async (orderId) => {
  await updateDoc(doc(db, 'orders', orderId), { reviewed: true });
};

// Real-time order listener
export const listenToOrder = (orderId, cb) => {
  return onSnapshot(doc(db, 'orders', orderId), snap => {
    if (snap.exists()) cb({ id: snap.id, ...snap.data() });
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
  const snap = await getDoc(doc(db, 'promoCodes', code.toUpperCase()));
  if (!snap.exists()) throw new Error('Invalid or expired promo code');
  const promo = snap.data();
  if (!promo.active) throw new Error('This promo code is no longer active');
  if (subtotal < promo.minOrder) throw new Error(`Minimum order ₹${promo.minOrder} required`);
  return promo;
};

export const getActivePromos = async () => {
  const q = query(collection(db, 'promoCodes'), where('active', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
export const getAllOrders = async () => {
  const snap = await getDocs(query(collection(db, 'orders'), orderBy('placedAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getAllUsers = async () => {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addRestaurant = async (data) => {
  const ref_ = await addDoc(collection(db, 'restaurants'), data);
  return ref_.id;
};

export const updateRestaurant = async (id, data) => {
  await updateDoc(doc(db, 'restaurants', id), data);
};

export const deleteRestaurant = async (id) => {
  await deleteDoc(doc(db, 'restaurants', id));
};

export const addPromo = async (promo) => {
  await setDoc(doc(db, 'promoCodes', promo.code.toUpperCase()), promo);
};

export const updatePromo = async (code, data) => {
  await updateDoc(doc(db, 'promoCodes', code), data);
};

export const deletePromo = async (code) => {
  await deleteDoc(doc(db, 'promoCodes', code));
};

export const getAllPromos = async () => {
  const snap = await getDocs(collection(db, 'promoCodes'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const listenToAllOrders = (cb) => {
  const q = query(collection(db, 'orders'), orderBy('placedAt', 'desc'));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
};
export const deductWallet = async (userId, amount) => {
  const snap = await getDoc(doc(db, 'users', userId));
  const current = snap.data()?.wallet || 0;
  await updateDoc(doc(db, 'users', userId), { wallet: Math.max(0, current - amount) });
};

// ─── APP CONFIG (Fee Settings) ──────────────────────────────────────────────
export const getAppConfig = async () => {
  const snap = await getDoc(doc(db, 'appConfig', 'general'));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const updateAppConfig = async (data) => {
  await updateDoc(doc(db, 'appConfig', 'general'), data);
};

// ─── USERS ───────────────────────────────────────────────────────────────────
export const updateUser = async (userId, data) => {
  await updateDoc(doc(db, 'users', userId), data);
};

export const addUser = async (userId, data) => {
  await setDoc(doc(db, 'users', userId), data);
};
