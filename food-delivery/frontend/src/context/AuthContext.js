import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { firebaseLogin, firebaseLogout, onAuthChange, getUserProfile } from '../firebase/services';

const AuthContext = createContext();

// Generate a simple unique ID
const genId = () => 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let initTimer = null;

    const initAuth = async () => {
      try {
        // Check localStorage first for Firestore-only users (no Firebase Auth)
        const saved = localStorage.getItem('fd_user');
        if (saved && mounted) {
          try {
            const parsed = JSON.parse(saved);
            setUser(parsed);
          } catch {
            localStorage.removeItem('fd_user');
          }
        }

        // Also listen to Firebase Auth state for staff accounts
        const unsub = onAuthChange(async (firebaseUser) => {
          if (!mounted) return;
          try {
            if (firebaseUser) {
              const profile = await getUserProfile(firebaseUser.uid);
              if (profile && mounted) {
                setUser(profile);
                localStorage.setItem('fd_user', JSON.stringify(profile));
              }
            }
            if (mounted) setLoading(false);
          } catch (err) {
            console.error('Firebase profile error:', err);
            if (mounted) setLoading(false);
          }
        });

        // If no Firebase auth listener fires within 2s, stop loading
        initTimer = setTimeout(() => {
          if (mounted) setLoading(false);
        }, 2000);

        return () => { unsub(); clearTimeout(initTimer); };
      } catch (err) {
        console.error('Auth init error:', err);
        if (mounted) {
          setInitError(err);
          setLoading(false);
        }
      }
    };

    const cleanup = initAuth();
    return () => {
      mounted = false;
      if (initTimer) clearTimeout(initTimer);
      if (cleanup) cleanup();
    };
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    // 1. Try Firestore loginCredentials (works for all users, no Firebase Auth needed)
    try {
      // Query by email only to avoid needing a composite index on email+password
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
      // Continue to Firebase Auth fallback, but surface critical errors
      if (err.code === 'permission-denied') {
        throw new Error('Database access denied. Check Firestore rules.');
      }
    }

    // 2. Fallback: try Firebase Auth (for staff with Auth enabled)
    try {
      const cred = await firebaseLogin(email, password);
      const profile = await getUserProfile(cred.user.uid);
      if (profile) {
        setUser(profile);
        localStorage.setItem('fd_user', JSON.stringify(profile));
        return profile;
      }
    } catch (e) {
      if (e.code !== 'auth/configuration-not-found' &&
          e.code !== 'auth/operation-not-allowed' &&
          e.code !== 'auth/user-not-found') {
        throw e;
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
    await firebaseLogout().catch(() => {});
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
