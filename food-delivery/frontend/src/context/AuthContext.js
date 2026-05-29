import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  setPersistence,
  browserLocalPersistence,
  signOut,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { getUserProfile } from '../firebase/services';

const AuthContext = createContext();

// Generate a simple unique ID
const genId = () => 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizePhone = (value) => String(value || '').replace(/\D/g, '').slice(-10);
const makeUsername = (name, email = '') => {
  const source = String(name || email?.split('@')?.[0] || '').trim().toLowerCase();
  return source.replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
};

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
    savedItems: [],
    createdAt: new Date().toISOString(),
    provider: authUser.providerData?.[0]?.providerId || 'firebase-auth',
  });

  const findProfileByEmail = async (email) => {
    if (!email) return null;
    const snap = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  };

  const findLoginRecordByIdentifier = async (identifier) => {
    const raw = String(identifier || '').trim();
    const normalizedIdentifier = normalizeEmail(raw);
    const username = makeUsername(raw);
    const phone = normalizePhone(raw);
    const lookups = [
      { field: 'email', value: normalizedIdentifier },
      { field: 'username', value: username },
      { field: 'nameKey', value: username },
      { field: 'normalizedPhone', value: phone },
      { field: 'phone', value: raw },
      { field: 'name', value: raw },
    ].filter(item => item.value);

    const seen = new Set();
    for (const { field, value } of lookups) {
      const key = `${field}:${value}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const credentialsSnap = await getDocs(query(collection(db, 'loginCredentials'), where(field, '==', value)));
      if (!credentialsSnap.empty) {
        return { id: credentialsSnap.docs[0].id, ...credentialsSnap.docs[0].data(), source: 'credentials' };
      }

      const usersSnap = await getDocs(query(collection(db, 'users'), where(field, '==', value)));
      if (!usersSnap.empty) {
        return { id: usersSnap.docs[0].id, uid: usersSnap.docs[0].id, ...usersSnap.docs[0].data(), source: 'users' };
      }
    }

    return null;
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
      normalizedPhone: merged.normalizedPhone || normalizePhone(merged.phone || authUser.phoneNumber || ''),
      username: merged.username || makeUsername(merged.name || authUser.displayName, merged.email || authUser.email),
      nameKey: merged.nameKey || makeUsername(merged.name || authUser.displayName, merged.email || authUser.email),
      role: merged.role || 'customer',
      avatar: merged.avatar || authUser.photoURL || pickAvatar(authEmail || authUser.uid),
      wallet: merged.wallet ?? 0,
      feastCoins: merged.feastCoins ?? 0,
      favourites: Array.isArray(merged.favourites) ? merged.favourites : [],
      savedItems: Array.isArray(merged.savedItems) ? merged.savedItems : [],
      provider: authUser.providerData?.[0]?.providerId || merged.provider || 'firebase-auth',
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', nextUser.id), nextUser, { merge: true });
      await setDoc(doc(db, 'loginCredentials', nextUser.id), {
        uid: nextUser.id,
        authUid: authUser.uid,
        email: nextUser.email,
        phone: nextUser.phone,
        normalizedPhone: nextUser.normalizedPhone,
        username: nextUser.username,
        nameKey: nextUser.nameKey,
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
  const login = async (identifier, password) => {
    const normalizedIdentifier = normalizeEmail(identifier);
    const emailIdentifier = normalizedIdentifier.includes('@') ? normalizedIdentifier : '';
    let loginRecord = null;
    let resolvedEmail = emailIdentifier;

    if (!normalizedIdentifier) throw new Error('Email, phone, or username is required');

    try {
      loginRecord = await findLoginRecordByIdentifier(normalizedIdentifier);
      resolvedEmail = loginRecord?.email || resolvedEmail;
    } catch (lookupError) {
      console.warn('Login identifier lookup failed:', lookupError);
    }

    try {
      if (!resolvedEmail) {
        throw new Error('No account found for that email, phone, or username');
      }
      const credential = await signInWithEmailAndPassword(auth, normalizeEmail(resolvedEmail), password);
      return await hydrateUserFromAuth(credential.user);
    } catch (authError) {
      try {
        const creds = loginRecord || await findLoginRecordByIdentifier(normalizedIdentifier);
        if (creds) {
          if (creds.password === password) {
            const profile = await getUserProfile(creds.uid) || {
              id: creds.uid,
              authUid: null,
              name: creds.name || normalizedIdentifier.split('@')[0] || 'Guest',
              email: creds.email || resolvedEmail || '',
              phone: creds.phone || '',
              normalizedPhone: creds.normalizedPhone || normalizePhone(creds.phone || ''),
              username: creds.username || makeUsername(creds.name, creds.email),
              nameKey: creds.nameKey || makeUsername(creds.name, creds.email),
              role: creds.role || 'customer',
              avatar: creds.avatar || pickAvatar(normalizedIdentifier || creds.uid),
              wallet: 0,
              feastCoins: 0,
              favourites: [],
              savedItems: [],
              createdAt: new Date().toISOString(),
              provider: 'legacy',
            };

            const nextProfile = {
              ...profile,
              id: profile.id || creds.uid,
              email: profile.email || creds.email || resolvedEmail || '',
              phone: profile.phone || creds.phone || '',
              normalizedPhone: profile.normalizedPhone || creds.normalizedPhone || normalizePhone(profile.phone || creds.phone || ''),
              username: profile.username || creds.username || makeUsername(profile.name || creds.name, profile.email || creds.email),
              nameKey: profile.nameKey || creds.nameKey || makeUsername(profile.name || creds.name, profile.email || creds.email),
              role: profile.role || 'customer',
              authUid: profile.authUid || null,
              updatedAt: new Date().toISOString(),
            };

            await setDoc(doc(db, 'users', nextProfile.id), nextProfile, { merge: true });
            await setDoc(doc(db, 'loginCredentials', nextProfile.id), {
              uid: nextProfile.id,
              authUid: nextProfile.authUid || null,
              email: nextProfile.email,
              phone: nextProfile.phone,
              normalizedPhone: nextProfile.normalizedPhone,
              username: nextProfile.username,
              nameKey: nextProfile.nameKey,
              name: nextProfile.name,
              avatar: nextProfile.avatar,
              role: nextProfile.role,
              provider: nextProfile.provider || 'legacy',
            }, { merge: true });
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

      const message = authError?.message || 'Unable to sign in';
      if (/No account found/i.test(message)) throw authError;
      throw new Error('Invalid login details. Use your email, phone, or username with the correct password.');
    }
  };

  const continueWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const credential = await signInWithPopup(auth, provider);
      return hydrateUserFromAuth(credential.user);
    } catch (err) {
      const code = err?.code || '';
      // If popup is blocked or not supported, fallback to redirect flow but persist state in localStorage
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/operation-not-supported-in-this-environment' ||
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request'
      ) {
        try {
          await setPersistence(auth, browserLocalPersistence);
          await signInWithRedirect(auth, provider);
          // signInWithRedirect will redirect the page; return to avoid falling through
          return;
        } catch (redirectErr) {
          console.error('Google redirect fallback failed:', redirectErr);
          throw new Error('Google sign-in blocked. Try opening FeastFleet in a standard browser (Chrome/Safari) or use email/password sign-in.');
        }
      }
      if (code === 'auth/unauthorized-domain') {
        throw new Error('This domain is not allowed in Firebase Authentication. Add your FeastFleet domain in Firebase Auth authorized domains (Firebase Console).');
      }
      throw err;
    }
  };

  const requestPasswordReset = async (email) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) throw new Error('Email is required');

    try {
      try {
        await sendPasswordResetEmail(auth, normalizedEmail, {
          url: `${window.location.origin}/login`,
          handleCodeInApp: false,
        });
      } catch (firstErr) {
        console.warn('Password reset with custom URL failed, retrying without action settings:', firstErr);
        // Retry without action settings to allow Firebase Console defaults to be used
        await sendPasswordResetEmail(auth, normalizedEmail);
      }
      return { ok: true, message: `Password reset email sent to ${normalizedEmail}. Check your inbox and spam folder.` };
    } catch (error) {
      console.error('sendPasswordResetEmail error:', error);
      try {
        const legacy = await getDocs(query(collection(db, 'loginCredentials'), where('email', '==', normalizedEmail)));
        if (!legacy.empty) {
          throw new Error('This account uses the legacy password system, so email reset is not available yet. Please sign in with the current password or contact support.');
        }
      } catch (lookupError) {
        if (lookupError.message) throw lookupError;
      }

      // Map common firebase error codes to friendlier messages
      const code = error?.code || '';
      if (code === 'auth/user-not-found') {
        throw new Error('No Firebase account exists for that email yet. Please sign in or create an account first.');
      }
      if (code === 'auth/invalid-email') {
        throw new Error('The email address is invalid. Please check and try again.');
      }
      if (code === 'auth/invalid-action-code' || code === 'auth/unauthorized-domain') {
        throw new Error('Password reset blocked by project settings. Ensure your app origin is added to Firebase Auth authorized domains and email action URLs are configured.');
      }
      // If sending failed for other reasons, give guidance to check Firebase Console
      throw new Error(error.message || 'Unable to send password reset email. Check Firebase Authentication email templates and project settings (authorized domains, email action templates).');
    }
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const register = async ({ name, email, phone, password }) => {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    const authUser = credential.user;
    const existingProfile = await findProfileByEmail(normalizedEmail);
    const profileId = existingProfile?.id || authUser.uid;
    const avatar = existingProfile?.avatar || pickAvatar(normalizedEmail || authUser.uid);
    const username = existingProfile?.username || makeUsername(name, normalizedEmail);

    const profile = {
      ...(existingProfile || {}),
      id: profileId,
      authUid: authUser.uid,
      name: existingProfile?.name || name,
      email: existingProfile?.email || normalizedEmail,
      phone: existingProfile?.phone || phone,
      normalizedPhone: existingProfile?.normalizedPhone || normalizedPhone,
      username,
      nameKey: existingProfile?.nameKey || makeUsername(existingProfile?.name || name, normalizedEmail),
      role: existingProfile?.role || 'customer',
      avatar,
      wallet: existingProfile?.wallet ?? 0,
      feastCoins: existingProfile?.feastCoins ?? 0,
      favourites: Array.isArray(existingProfile?.favourites) ? existingProfile.favourites : [],
      savedItems: Array.isArray(existingProfile?.savedItems) ? existingProfile.savedItems : [],
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
        phone: profile.phone,
        normalizedPhone: profile.normalizedPhone,
        username: profile.username,
        nameKey: profile.nameKey,
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
