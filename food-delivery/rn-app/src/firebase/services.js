import { firebaseAuth, db, rtdb } from './firebase';

// Generate a simple unique ID (matching web logic)
const genId = () => 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const login = async (email, password) => {
  // 1. Try Firestore loginCredentials (custom logic from website)
  try {
    const querySnapshot = await db.collection('loginCredentials')
      .where('email', '==', email)
      .get();

    if (!querySnapshot.empty) {
      const creds = querySnapshot.docs[0].data();
      if (creds.password === password) {
        const profile = await getUserProfile(creds.uid);
        if (profile) return { user: { uid: creds.uid, email: creds.email }, profile };
      }
    }
  } catch (err) {
    console.error('Firestore login error:', err);
  }

  // 2. Fallback: Try Firebase Auth
  try {
    const cred = await firebaseAuth.signInWithEmailAndPassword(email, password);
    const profile = await getUserProfile(cred.user.uid);
    return { user: { uid: cred.user.uid, email: cred.user.email }, profile };
  } catch (e) {
    throw e;
  }
};

export const signup = async ({ name, email, phone, password }) => {
  // Check if email already exists in loginCredentials
  const existing = await db.collection('loginCredentials')
    .where('email', '==', email)
    .get();

  if (!existing.empty) throw new Error('An account with this email already exists');

  const uid = genId();
  const avatars = ['👩','👨','🧑','👱','🧔','👩‍🦱','👨‍🦱','🧑‍🦰'];
  const avatar  = avatars[Math.floor(Math.random() * avatars.length)];

  const profile = {
    id: uid, name, email, phone,
    role: 'customer', avatar,
    wallet: 0, favourites: [],
    createdAt: new Date().toISOString()
  };

  // Save to Firestore users collection
  await db.collection('users').doc(uid).set(profile);

  // Save to loginCredentials for auth lookup
  await db.collection('loginCredentials').doc(uid).set({
    uid, email, password, role: 'customer', name, avatar
  });

  return { user: { uid, email }, profile };
};

export const logout = () => firebaseAuth.signOut();

export const getUserProfile = async (uid) => {
  const doc = await db.collection('users').doc(uid).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

// ─── RESTAURANTS ──────────────────────────────────────────────────────────────
export const getRestaurants = async (cuisine) => {
  let query = db.collection('restaurants');
  if (cuisine && cuisine !== 'All') {
    query = query.where('cuisine', '==', cuisine);
  }
  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getRestaurant = async (id) => {
  const doc = await db.collection('restaurants').doc(id).get();
  if (!doc.exists) return null;
  const menuSnapshot = await db.collection('restaurants').doc(id).collection('menu').get();
  const menu = menuSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  return { id: doc.id, ...doc.data(), menu };
};

// ─── ORDERS ───────────────────────────────────────────────────────────────────
export const placeOrder = async (orderData) => {
  const orderRef = await db.collection('orders').add({
    ...orderData,
    status: 'Placed',
    reviewed: false,
    placedAt: db.FieldValue.serverTimestamp(),
    statusHistory: [{ status: 'Placed', time: new Date().toISOString() }]
  });
  return { id: orderRef.id, ...orderData, status: 'Placed' };
};

export const getOrdersByCustomer = async (customerId) => {
  const snapshot = await db.collection('orders')
    .where('customerId', '==', customerId)
    .orderBy('placedAt', 'desc')
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const listenToOrder = (orderId, callback) => {
  return db.collection('orders').doc(orderId).onSnapshot(doc => {
    if (doc.exists) callback({ id: doc.id, ...doc.data() });
  });
};

// ─── REAL-TIME TRACKING ───────────────────────────────────────────────────────
export const listenToAgentLocation = (agentId, callback) => {
  const ref = rtdb.ref(`agentLocations/${agentId}`);
  ref.on('value', snapshot => {
    if (snapshot.val()) callback(snapshot.val());
  });
  return () => ref.off();
};

// ─── PROMOS ───────────────────────────────────────────────────────────────────
export const validatePromo = async (code, subtotal) => {
  const doc = await db.collection('promoCodes').doc(code.toUpperCase()).get();
  if (!doc.exists) throw new Error('Invalid promo code');
  const promo = doc.data();
  if (!promo.active) throw new Error('Promo inactive');
  if (subtotal < promo.minOrder) throw new Error(`Min order ₹${promo.minOrder} required`);
  return promo;
};
