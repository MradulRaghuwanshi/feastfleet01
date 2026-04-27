import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAjz7-JdOVMYXHEsb-BOQ0V3MoaGH2Qo_Y",
  authDomain: "feastfleet-54b7e.firebaseapp.com",
  projectId: "feastfleet-54b7e",
  storageBucket: "feastfleet-54b7e.firebasestorage.app",
  messagingSenderId: "72016164039",
  appId: "1:72016164039:web:f9ff1f82721b3c81c67ae2",
  measurementId: "G-PL6MMZQNTR",
  databaseURL: "https://feastfleet-54b7e-default-rtdb.asia-southeast1.firebasedatabase.app",
};

// Safe initialization for SSR / Next.js / hot reload
function getFirebaseApp() {
  if (typeof window === 'undefined') {
    // Server-side: return a dummy or cached app
    if (getApps().length) return getApp();
    return initializeApp(firebaseConfig);
  }
  // Client-side: reuse existing if available
  if (getApps().length) return getApp();
  return initializeApp(firebaseConfig);
}

const app = getFirebaseApp();

export const auth = typeof window !== 'undefined' ? getAuth(app) : null;
export const db = getFirestore(app);
export const rtdb = typeof window !== 'undefined' ? getDatabase(app) : null;

export const getMessagingInstance = async () => {
  if (typeof window === 'undefined') return null;
  try {
    const { getMessaging, isSupported } = await import('firebase/messaging');
    const supported = await isSupported();
    if (!supported) return null;
    return getMessaging(app);
  } catch { return null; }
};

export default app;

