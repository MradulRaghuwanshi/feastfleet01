import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import LocationBar from './LocationBar';
import styles from './Navbar.module.css';

export default function Navbar() {
  // Using logo.png instead of svg for better browser compatibility
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [wallet, setWallet] = useState(null);

  const handleLogout = () => { logout(); navigate('/'); setMenuOpen(false); };
  const feastCoins = wallet?.isVirtual ? (user?.feastCoins ?? user?.wallet ?? 0) : (wallet?.currentBalance ?? user?.feastCoins ?? user?.wallet ?? 0);

  useEffect(() => {
    if (user?.role !== 'customer' || !user?.id) return undefined;

    let unsub = () => {};
    let cancelled = false;

    import('../firebase/services').then(({ listenToWallet }) => {
      if (cancelled) return;
      unsub = listenToWallet(user.id, setWallet);
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [user?.id, user?.role]);

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>
        <img src="/logo.png" alt="FeastFleet" className={styles.logoImg} />
        <span>FeastFleet</span>
      </Link>

      {user?.role === 'customer' && (
        <div className={styles.locationWrapper}><LocationBar /></div>
      )}

      <div className={styles.right}>
        {user?.role === 'customer' && (
          <>
            <Link to="/favourites" className={styles.link} title="Favourites">❤️</Link>
            <Link to="/orders" className={styles.link}>My Orders</Link>
            <Link to="/wallet" className={styles.wallet}>🪙 {Math.floor(feastCoins)} Coins</Link>
            <Link to="/about" className={styles.link}>About</Link>
            <Link to="/checkout" className={styles.cartBtn}>
              🛒 {totalItems > 0 && <span className={styles.badge}>{totalItems}</span>}
            </Link>
          </>
        )}

        {!user && (
          <>
            <Link to="/about" className={styles.link}>About</Link>
            <Link to="/checkout" className={styles.cartBtn}>
              🛒 {totalItems > 0 && <span className={styles.badge}>{totalItems}</span>}
            </Link>
            <button className={styles.avatarBtn} onClick={() => navigate('/login')}>
              <span className={styles.avatar}>👤</span>
              <span className={styles.userName}>Sign In</span>
            </button>
          </>
        )}

        {user && (
          <div className={styles.userMenu}>
            <button className={styles.avatarBtn} onClick={() => setMenuOpen(o => !o)}>
              <span className={styles.avatar}>{user?.avatar}</span>
              <span className={styles.userName}>{user?.name?.split(' ')[0]}</span>
              <span>▾</span>
            </button>
            {menuOpen && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownHeader}>
                  <strong>{user?.name}</strong>
                  <span className={`${styles.roleBadge} ${styles[user?.role]}`}>{user?.role}</span>
                </div>
                <div className={styles.dropdownEmail}>{user?.email}</div>
                {user?.role === 'customer' && (
                  <div className={styles.walletRow}>Feast Coins: <strong>{Math.floor(feastCoins)}</strong></div>
                )}
                <hr className={styles.hr} />
                <button className={styles.logoutBtn} onClick={handleLogout}>🚪 Sign Out</button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
