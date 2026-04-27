const admin = require('firebase-admin');

// ─────────────────────────────────────────────────────────────────────────────
// HOW TO SET UP:
// 1. Go to https://console.firebase.google.com
// 2. Create a project called "fooddash-india"
// 3. Go to Project Settings → Service Accounts → Generate new private key
// 4. Save the downloaded JSON as:  food-delivery/backend/firebase/serviceAccountKey.json
// 5. Enable Firestore Database (Start in test mode)
// 6. Enable Realtime Database (Start in test mode)
// 7. Enable Authentication → Email/Password
// 8. Copy your databaseURL from Realtime Database and paste below
// ─────────────────────────────────────────────────────────────────────────────

let serviceAccount;
try {
  serviceAccount = require('./serviceAccountKey.json');
} catch {
  console.warn('⚠️  Firebase serviceAccountKey.json not found. Running in demo mode.');
  serviceAccount = null;
}

if (serviceAccount && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://fooddash-india-default-rtdb.asia-southeast1.firebasedatabase.app'
  });
}

const db       = serviceAccount ? admin.firestore()       : null;
const rtdb     = serviceAccount ? admin.database()        : null;
const authAdmin = serviceAccount ? admin.auth()           : null;

module.exports = { admin, db, rtdb, authAdmin };
