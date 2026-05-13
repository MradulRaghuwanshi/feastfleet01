import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import styles from './BottomNav.module.css';

export default function BottomNav() {
  const { totalItems } = useCart();
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstallClick = () => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const Android = /Android/.test(navigator.userAgent);

    if (Android) {
      // Trigger APK download for Android
      const link = document.createElement('a');
      link.href = '/app-NativeAppAI.apk';
      link.download = 'app-NativeAppAI.apk';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsInstalling(true);
      setTimeout(() => setIsInstalling(false), 2000);
      console.log('APK download initiated');
    } else if (iOS) {
      alert('To install FeastFleet:\n1. Tap the Share button\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add"');
    } else {
      alert('Please use Android or iOS to install the native app');
    }
  };

  return (
    <nav className={styles.nav}>
      <NavLink to="/" end className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <span>🏠</span><span>Home</span>
      </NavLink>
      <NavLink to="/orders" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <span>📦</span><span>Orders</span>
      </NavLink>
      <NavLink to="/checkout" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <span className={styles.cartIcon}>🛒{totalItems > 0 && <span className={styles.badge}>{totalItems}</span>}</span>
        <span>Cart</span>
      </NavLink>
      <NavLink to="/wallet" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <span>🪙</span><span>Coins</span>
      </NavLink>
      <NavLink to="/favourites" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <span>❤️</span><span>Saved</span>
      </NavLink>
      <button
        className={`${styles.item} ${styles.installBtn} ${isInstalling ? styles.installing : ''}`}
        onClick={handleInstallClick}
        title="Download and install native app"
      >
        <span>{isInstalling ? '⬇️' : '📲'}</span>
        <span>{isInstalling ? 'Installing...' : 'Install'}</span>
      </button>
    </nav>
  );
}
