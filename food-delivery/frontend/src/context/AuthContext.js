import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getUserProfile } from '../firebase/services';

const AuthContext = createContext();

// Generate a simple unique ID
const genId = () => 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const saved = localStorage.getItem('fd_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem('fd_user');
      }
    }

    setLoading(false);

    return () => {
      mounted = false;
    };
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    // Try Firestore loginCredentials first; this app no longer depends on Firebase Auth.
    try {
      // Query by email only to avoid needing a composite index on email+password.
      const q = query(
        collection(db, 'loginCredentials'),
        where('email', '==', email)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const creds = snap.docs[0].data();
        if (creds.password === password) {
          const profile = await getUserProfile(creds.uid);
          if (profile) {
            setUser(profile);
            localStorage.setItem('fd_user', JSON.stringify(profile));
            return profile;
          }
        }
      }
    } catch (err) {
      console.error('Firestore login query error:', err);
      if (err.code === 'permission-denied') {
        throw new Error('Database access denied. Check Firestore rules.');
      }
    }

    throw new Error('Invalid email or password');
  };

  // ── Register (customers only — no Firebase Auth needed) ───────────────────
  const register = async ({ name, email, phone, password }) => {
    // Check if email already exists
    const existing = await getDocs(
      query(collection(db, 'loginCredentials'), where('email', '==', email))
    );
    if (!existing.empty) throw new Error('An account with this email already exists');

    const uid = genId();
    const avatars = ['👩','👨','🧑','👱','🧔','👩‍🦱','👨‍🦱','🧑‍🦰'];
    const avatar  = avatars[Math.floor(Math.random() * avatars.length)];

    const profile = {
      id: uid, name, email, phone,
      role: 'customer', avatar,
      wallet: 0, feastCoins: 0, favourites: [],
      createdAt: new Date().toISOString()
    };

    // Save to Firestore users collection
    await setDoc(doc(db, 'users', uid), profile);

    // Save to loginCredentials for auth lookup
    await setDoc(doc(db, 'loginCredentials', uid), {
      uid, email, password, role: 'customer', name, avatar
    });

    setUser(profile);
    localStorage.setItem('fd_user', JSON.stringify(profile));
    return profile;
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    localStorage.removeItem('fd_user');
    setUser(null);
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🍔</div>
        <p style={{ color:'#888' }}>Loading FoodDash...</p>
      </div>
    </div>
  );

  if (initError) {
    console.error('Auth initialization error:', initError);
    // Continue anyway - show login page with error
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
