import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { getUserProfile } from '../firebase/services';

const AuthContext = createContext();

// Generate a simple unique ID
const genId = () => 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('fd_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem('fd_user');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser) {
        if (!saved) setUser(null);
        setLoading(false);
        return;
      }

      try {
        const profile = await hydrateUserFromAuth(authUser);
        setUser(profile);
        localStorage.setItem('fd_user', JSON.stringify(profile));
      } catch (error) {
        console.error('Auth hydration error:', error);
        const fallbackUser = buildFallbackUser(authUser);
        setUser(fallbackUser);
        localStorage.setItem('fd_user', JSON.stringify(fallbackUser));
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const avatarPool = ['👩', '👨', '🧑', '👱', '🧔', '👩‍🦱', '👨‍🦱', '🧑‍🦰'];

  const pickAvatar = (seed = '') => avatarPool[Math.abs(seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % avatarPool.length];

  const buildFallbackUser = (authUser) => ({
    id: authUser.uid,
    authUid: authUser.uid,
    name: authUser.displayName || authUser.email?.split('@')[0] || 'Guest',
    email: authUser.email || '',
    phone: authUser.phoneNumber || '',
    role: 'customer',
    avatar: authUser.photoURL || pickAvatar(authUser.email || authUser.uid),
    wallet: 0,
    feastCoins: 0,
    favourites: [],
    createdAt: new Date().toISOString(),
    provider: authUser.providerData?.[0]?.providerId || 'firebase-auth',
  });

  const findProfileByEmail = async (email) => {
    if (!email) return null;
    const snap = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  };

  const hydrateUserFromAuth = async (authUser) => {
    const authEmail = authUser.email?.trim().toLowerCase() || '';
    let profile = null;

    try {
      profile = await getUserProfile(authUser.uid);
    } catch {
      profile = null;
    }

    if (!profile && authEmail) {
      profile = await findProfileByEmail(authEmail);
    }

    const merged = profile || buildFallbackUser(authUser);
    const nextUser = {
      ...merged,
      id: merged.id || authUser.uid,
      authUid: authUser.uid,
      name: merged.name || authUser.displayName || authEmail.split('@')[0] || 'Guest',
      email: merged.email || authUser.email || '',
      phone: merged.phone || authUser.phoneNumber || '',
      role: merged.role || 'customer',
      avatar: merged.avatar || authUser.photoURL || pickAvatar(authEmail || authUser.uid),
      wallet: merged.wallet ?? 0,
      feastCoins: merged.feastCoins ?? 0,
      favourites: Array.isArray(merged.favourites) ? merged.favourites : [],
      provider: authUser.providerData?.[0]?.providerId || merged.provider || 'firebase-auth',
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', nextUser.id), nextUser, { merge: true });
      await setDoc(doc(db, 'loginCredentials', nextUser.id), {
        uid: nextUser.id,
        authUid: authUser.uid,
        email: nextUser.email,
        name: nextUser.name,
        avatar: nextUser.avatar,
        role: nextUser.role,
        provider: nextUser.provider,
      }, { merge: true });
    } catch (error) {
      console.warn('Unable to sync auth profile to Firestore:', error);
    }

    return nextUser;
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();

    try {
      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      return await hydrateUserFromAuth(credential.user);
    } catch (authError) {
      try {
        const q = query(collection(db, 'loginCredentials'), where('email', '==', normalizedEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const creds = snap.docs[0].data();
          if (creds.password === password) {
            const profile = await getUserProfile(creds.uid) || {
              id: creds.uid,
              authUid: null,
              name: creds.name || normalizedEmail.split('@')[0] || 'Guest',
              email: normalizedEmail,
              role: creds.role || 'customer',
              avatar: creds.avatar || pickAvatar(normalizedEmail || creds.uid),
              wallet: 0,
              feastCoins: 0,
              favourites: [],
              createdAt: new Date().toISOString(),
              provider: 'legacy',
            };

            const nextProfile = {
              ...profile,
              id: profile.id || creds.uid,
              email: profile.email || normalizedEmail,
              role: profile.role || 'customer',
              authUid: profile.authUid || null,
              updatedAt: new Date().toISOString(),
            };

            await setDoc(doc(db, 'users', nextProfile.id), nextProfile, { merge: true });
            setUser(nextProfile);
            localStorage.setItem('fd_user', JSON.stringify(nextProfile));
            return nextProfile;
          }
        }
      } catch (legacyError) {
        console.error('Legacy login query error:', legacyError);
        if (legacyError.code === 'permission-denied') {
          throw new Error('Database access denied. Check Firestore rules.');
        }
      }

      throw authError;
    }
  };

  const continueWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const credential = await signInWithPopup(auth, provider);
    return hydrateUserFromAuth(credential.user);
  };

  const requestPasswordReset = async (email) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) throw new Error('Email is required');

    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      return { ok: true, message: `Password reset email sent to ${normalizedEmail}. Check your inbox and spam folder.` };
    } catch (error) {
      try {
        const legacy = await getDocs(query(collection(db, 'loginCredentials'), where('email', '==', normalizedEmail)));
        if (!legacy.empty) {
          throw new Error('This account uses the legacy password system, so email reset is not available yet. Please sign in with the current password or contact support.');
        }
      } catch (lookupError) {
        if (lookupError.message) throw lookupError;
      }

      if (error.code === 'auth/user-not-found') {
        throw new Error('No Firebase account exists for that email yet. Please sign in or create an account first.');
      }
      throw new Error(error.message || 'Unable to send password reset email');
    }
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const register = async ({ name, email, phone, password }) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();

    const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    const authUser = credential.user;
    const existingProfile = await findProfileByEmail(normalizedEmail);
    const profileId = existingProfile?.id || authUser.uid;
    const avatar = existingProfile?.avatar || pickAvatar(normalizedEmail || authUser.uid);

    const profile = {
      ...(existingProfile || {}),
      id: profileId,
      authUid: authUser.uid,
      name: existingProfile?.name || name,
      email: existingProfile?.email || normalizedEmail,
      phone: existingProfile?.phone || phone,
      role: existingProfile?.role || 'customer',
      avatar,
      wallet: existingProfile?.wallet ?? 0,
      feastCoins: existingProfile?.feastCoins ?? 0,
      favourites: Array.isArray(existingProfile?.favourites) ? existingProfile.favourites : [],
      provider: 'password',
      createdAt: existingProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', profile.id), profile, { merge: true });
      await setDoc(doc(db, 'loginCredentials', profile.id), {
        uid: profile.id,
        authUid: authUser.uid,
        email: profile.email,
        name: profile.name,
        avatar: profile.avatar,
        role: profile.role,
        provider: 'password',
      }, { merge: true });
    } catch (error) {
      console.warn('Unable to persist newly registered profile:', error);
    }

    setUser(profile);
    localStorage.setItem('fd_user', JSON.stringify(profile));
    return profile;
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    await signOut(auth).catch(() => {});
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
    <AuthContext.Provider value={{ user, login, logout, register, continueWithGoogle, requestPasswordReset }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
