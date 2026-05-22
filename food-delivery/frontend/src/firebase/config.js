import { initializeApp } from 'firebase/app';
import { getAuth }       from 'firebase/auth';
import { getFirestore }  from 'firebase/firestore';
import { getDatabase }   from 'firebase/database';

const isPlaceholder = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return (
    !normalized ||
    normalized === 'leave as is' ||
    normalized.includes('your_') ||
    normalized.includes('your-project')
  );
};

const fromEnv = (key, fallback) => {
  const value = process.env[key];
  return isPlaceholder(value) ? fallback : value;
};

const firebaseConfig = {
  apiKey:            fromEnv('REACT_APP_FIREBASE_API_KEY', "AIzaSyAjz7-JdOVMYXHEsb-BOQ0V3MoaGH2Qo_Y"),
  authDomain:        fromEnv('REACT_APP_FIREBASE_AUTH_DOMAIN', "feastfleet-54b7e.firebaseapp.com"),
  projectId:         fromEnv('REACT_APP_FIREBASE_PROJECT_ID', "feastfleet-54b7e"),
  storageBucket:     fromEnv('REACT_APP_FIREBASE_STORAGE_BUCKET', "feastfleet-54b7e.firebasestorage.app"),
  messagingSenderId: fromEnv('REACT_APP_FIREBASE_MESSAGING_SENDER_ID', "72016164039"),
  appId:             fromEnv('REACT_APP_FIREBASE_APP_ID', "1:72016164039:web:f9ff1f82721b3c81c67ae2"),
  measurementId:     fromEnv('REACT_APP_FIREBASE_MEASUREMENT_ID', "G-PL6MMZQNTR"),
  databaseURL:       fromEnv('REACT_APP_FIREBASE_DATABASE_URL', "https://feastfleet-54b7e-default-rtdb.asia-southeast1.firebasedatabase.app"),
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
export const rtdb = getDatabase(app);

export const getMessagingInstance = async () => {
  try {
    const { getMessaging, isSupported } = await import('firebase/messaging');
    const supported = await isSupported();
    if (!supported) return null;
    return getMessaging(app);
  } catch { return null; }
};

export default app;
