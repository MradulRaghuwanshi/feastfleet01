import { initializeApp } from 'firebase/app';
import { getAuth }       from 'firebase/auth';
import { getFirestore }  from 'firebase/firestore';
import { getDatabase }   from 'firebase/database';

const firebaseConfig = {
  apiKey:            "AIzaSyAjz7-JdOVMYXHEsb-BOQ0V3MoaGH2Qo_Y",
  authDomain:        "feastfleet-54b7e.firebaseapp.com",
  projectId:         "feastfleet-54b7e",
  storageBucket:     "feastfleet-54b7e.firebasestorage.app",
  messagingSenderId: "72016164039",
  appId:             "1:72016164039:web:f9ff1f82721b3c81c67ae2",
  measurementId:     "G-PL6MMZQNTR",
  databaseURL:       "https://feastfleet-54b7e-default-rtdb.asia-southeast1.firebasedatabase.app",
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
