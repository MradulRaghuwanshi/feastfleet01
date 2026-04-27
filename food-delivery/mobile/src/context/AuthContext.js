import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { firebaseLogin, firebaseLogout, onAuthChange, getUserProfile } from '../firebase/services';
import { getPreference, setPreference, removePreference } from '../lib/preferences';

const AuthContext = createContext();

// Generate a simple unique ID
const genId = () => 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      // Check Preferences/localStorage first for Firestore-only users
      try {
        const saved = await getPreference('fd_user');
        if (saved && mounted) {
          setUser(saved);
        }
      } catch {
        // ignore
      }

      // Also listen to Firebase Auth state for staff accounts
      const unsub = onAuthChange(async (firebaseUser) => {
        if (firebaseUser) {
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile && mounted) {
            setUser(profile);
            await setPreference('fd_user', profile);
          }
        }
        if (mounted) setLoading(false);
      });

      // If no Firebase auth listener fires within 3s, stop loading
      const timeout = setTimeout(() => {
        if (mounted) setLoading(false);
      }, 3000);

      return () => {
        unsub();
        clearTimeout(timeout);
      };
    }

    init();
    return () => { mounted = false; };
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    // 1. Try Firestore loginCredentials (works for all users, no Firebase Auth needed)
    try {
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
            await setPreference('fd_user', profile);
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

    // 2. Fallback: try Firebase Auth (for staff with Auth enabled)
    try {
      const cred = await firebaseLogin(email, password);
      const profile = await getUserProfile(cred.user.uid);
      if (profile) {
        setUser(profile);
        await setPreference('fd_user', profile);
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
    const existing = await getDocs(
      query(collection(db, 'loginCredentials'), where('email', '==', email))
    );
    if (!existing.empty) throw new Error('An account with this email already exists');

    const uid = genId();
    const avatars = ['👩','👨','🧑','👱','🧔','👩‍🦱','👨‍🦱','🧑‍🦰'];
    const avatar = avatars[Math.floor(Math.random() * avatars.length)];

    const profile = {
      id: uid, name, email, phone,
      role: 'customer', avatar,
      wallet: 0, favourites: [],
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', uid), profile);
    await setDoc(doc(db, 'loginCredentials', uid), {
      uid, email, password, role: 'customer', name, avatar
    });

    setUser(profile);
    await setPreference('fd_user', profile);
    return profile;
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    await firebaseLogout().catch(() => {});
    await removePreference('fd_user');
    setUser(null);
  };

  if (loading && !user) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>&#127828;</div>
        <p style={{ color:'#888' }}>Loading FeastFleet...</p>
      </div>
    </div>
  );

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

