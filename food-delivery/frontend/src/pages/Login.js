import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './Login.module.css';

export default function Login() {
  const { login, register } = useAuth();
  const [tab, setTab]         = useState('login');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm]   = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try { await login(loginForm.email, loginForm.password); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (!signupForm.name.trim())            return setError('Name is required');
    if (!signupForm.email.trim())           return setError('Email is required');
    if (!signupForm.phone.trim())           return setError('Phone number is required');
    if (signupForm.password.length < 6)     return setError('Password must be at least 6 characters');
    if (signupForm.password !== signupForm.confirmPassword) return setError('Passwords do not match');
    setLoading(true);
    try { await register(signupForm); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleInstall = async () => {
    // Check if the install prompt is available
    const promptEvent = window.deferredPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      window.deferredPrompt = null;
    } else {
      // Fallback: Provide better installation instructions
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);

      if (isIOS) {
        alert('To install FeastFleet on iOS:\n\n1. Tap the Share button (📤) at the bottom\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" in the top right\n\nThe app will appear on your home screen!');
      } else if (isAndroid) {
        alert('To install FeastFleet on Android:\n\n1. Tap the menu (⋮) in the top right\n2. Tap "Add to Home screen" or "Install app"\n3. Follow the prompts to install\n\nOr refresh the page and look for the install banner at the top.');
      } else {
        alert('To install FeastFleet:\n\n• Chrome: Look for "Install FeastFleet" in the address bar\n• Firefox: Tap the menu (⋮) → "Install This Site as an App"\n• Edge: Tap the app icon in the address bar\n\nOr refresh the page and try again.');
      }
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>🍔 FoodDash</div>
        <p className={styles.tagline}>Order food from the best restaurants near you</p>
        <div className={styles.downloadSection}>
          <button className={styles.downloadAppBtn} onClick={handleInstall}>
            📥 Install Web App
          </button>
          <span className={styles.downloadHint}>Use the browser install prompt, or add to home screen manually.</span>
        </div>

        <div className={styles.tabs}>
          <button className={`${styles.tabBtn} ${tab === 'login'  ? styles.activeTab : ''}`} onClick={() => { setTab('login');  setError(''); }}>Sign In</button>
          <button className={`${styles.tabBtn} ${tab === 'signup' ? styles.activeTab : ''}`} onClick={() => { setTab('signup'); setError(''); }}>Create Account</button>
        </div>

        {tab === 'login' && (
          <>
            <form onSubmit={handleLogin} className={styles.form}>
              <label>Email Address
                <input type="email" required placeholder="you@example.com"
                  value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} />
              </label>
              <label>Password
                <input type="password" required placeholder="Enter your password"
                  value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} />
              </label>
              {error && <p className={styles.error}>⚠ {error}</p>}
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <p className={styles.switchHint}>
              New here?{' '}
              <button className={styles.switchLink} onClick={() => { setTab('signup'); setError(''); }}>
                Create a free account
              </button>
            </p>
          </>
        )}

        {tab === 'signup' && (
          <>
            <form onSubmit={handleSignup} className={styles.form}>
              <label>Full Name
                <input type="text" required placeholder="e.g. Priya Sharma"
                  value={signupForm.name} onChange={e => setSignupForm({ ...signupForm, name: e.target.value })} />
              </label>
              <label>Email Address
                <input type="email" required placeholder="you@example.com"
                  value={signupForm.email} onChange={e => setSignupForm({ ...signupForm, email: e.target.value })} />
              </label>
              <label>Mobile Number
                <input type="tel" required placeholder="+91 98765 43210"
                  value={signupForm.phone} onChange={e => setSignupForm({ ...signupForm, phone: e.target.value })} />
              </label>
              <label>Password
                <input type="password" required placeholder="Min 6 characters"
                  value={signupForm.password} onChange={e => setSignupForm({ ...signupForm, password: e.target.value })} />
              </label>
              <label>Confirm Password
                <input type="password" required placeholder="Re-enter your password"
                  value={signupForm.confirmPassword} onChange={e => setSignupForm({ ...signupForm, confirmPassword: e.target.value })} />
              </label>
              {error && <p className={styles.error}>⚠ {error}</p>}
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
            <p className={styles.switchHint}>
              Already have an account?{' '}
              <button className={styles.switchLink} onClick={() => { setTab('login'); setError(''); }}>
                Sign in
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
