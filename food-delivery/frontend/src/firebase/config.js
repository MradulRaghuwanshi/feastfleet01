import { initializeApp } from 'firebase/app';
import { getAuth }       from 'firebase/auth';
import { getFirestore }  from 'firebase/firestore';
import { getDatabase }   from 'firebase/database';

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAjz7-JdOVMYXHEsb-BOQ0V3MoaGH2Qo_Y",
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "feastfleet-54b7e.firebaseapp.com",
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID || "feastfleet-54b7e",
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "feastfleet-54b7e.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "72016164039",
  appId:             process.env.REACT_APP_FIREBASE_APP_ID || "1:72016164039:web:f9ff1f82721b3c81c67ae2",
  measurementId:     process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-PL6MMZQNTR",
  databaseURL:       process.env.REACT_APP_FIREBASE_DATABASE_URL || "https://feastfleet-54b7e-default-rtdb.asia-southeast1.firebasedatabase.app",
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
