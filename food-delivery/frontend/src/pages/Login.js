import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { DownloadAppIcon } from '../components/Icons';
import styles from './Login.module.css';

export default function Login() {
  const { login, register, continueWithGoogle, requestPasswordReset } = useAuth();
  const [tab, setTab] = useState('login');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [resetEmail, setResetEmail] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try { await login(loginForm.email, loginForm.password); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    setNotice('');
    try {
      await continueWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const result = await requestPasswordReset(resetEmail || loginForm.email || signupForm.email);
      setNotice(result.message);
      setShowReset(false);
    } catch (err) {
      setError(err.message || 'Unable to send reset email');
    } finally {
      setLoading(false);
    }
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

  const handleInstall = () => {
    const link = document.createElement('a');
    link.href = '/app-NativeAppAI.apk';
    link.download = 'app-NativeAppAI.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.page}>
      <section className={styles.story}>
        <span>FeastFleet</span>
        <h1>Food runs smoother when your account is ready.</h1>
        <p>Save addresses, earn Feast Coins, reorder favourites, and track every bite from kitchen to doorstep.</p>
        <div className={styles.storyStats}>
          <strong>25 min avg</strong>
          <strong>Secure pay</strong>
          <strong>Fast reorder</strong>
        </div>
      </section>
      <div className={styles.card}>
        <div className={styles.brand}>FeastFleet</div>
        <p className={styles.tagline}>Premium local food delivery, tuned for speed.</p>
        <div className={styles.downloadSection}>
          <button className={styles.downloadAppBtn} onClick={handleInstall}>
            <DownloadAppIcon className={styles.downloadIcon} />
            Download App
          </button>
          <span className={styles.downloadHint}>Download the FeastFleet Android APK.</span>
        </div>

        <div className={styles.tabs}>
          <button className={`${styles.tabBtn} ${tab === 'login'  ? styles.activeTab : ''}`} onClick={() => { setTab('login');  setError(''); }}>Sign In</button>
          <button className={`${styles.tabBtn} ${tab === 'signup' ? styles.activeTab : ''}`} onClick={() => { setTab('signup'); setError(''); }}>Create Account</button>
        </div>

        {notice && <p className={styles.notice}>{notice}</p>}

        {tab === 'login' && (
          <>
            <div className={styles.socialRow}>
              <button type="button" onClick={handleGoogle} disabled={googleLoading}>{googleLoading ? 'Connecting...' : 'Continue with Google'}</button>
              <button type="button" onClick={() => setShowReset(v => !v)}>{showReset ? 'Hide reset' : 'Reset password'}</button>
            </div>
            {showReset && (
              <form onSubmit={handleResetPassword} className={styles.resetPanel}>
                <label>Email for reset
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={resetEmail || loginForm.email}
                    onChange={e => setResetEmail(e.target.value)}
                  />
                </label>
                <p className={styles.resetHint}>We will send a password reset email from Firebase. Check inbox and spam.</p>
                <button type="submit" className={styles.resetBtn} disabled={loading}>{loading ? 'Sending...' : 'Send reset email'}</button>
              </form>
            )}
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
            <div className={styles.socialRow}>
              <button type="button" onClick={handleGoogle} disabled={googleLoading}>{googleLoading ? 'Connecting...' : 'Continue with Google'}</button>
              <button type="button" onClick={() => { setTab('login'); setShowReset(true); setError(''); }}>Reset password</button>
            </div>
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
