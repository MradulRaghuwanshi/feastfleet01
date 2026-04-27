import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import LocationBar from './LocationBar';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); setMenuOpen(false); };

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>🍔 FoodDash</Link>

      {user?.role === 'customer' && (
        <div className={styles.locationWrapper}><LocationBar /></div>
      )}

      <div className={styles.right}>
        {user?.role === 'customer' && (
          <>
            <Link to="/favourites" className={styles.link} title="Favourites">❤️</Link>
            <Link to="/orders" className={styles.link}>My Orders</Link>
            {user.wallet > 0 && (
              <span className={styles.wallet}>💰 ₹{user.wallet.toFixed(0)}</span>
            )}
            <Link to="/checkout" className={styles.cartBtn}>
              🛒 {totalItems > 0 && <span className={styles.badge}>{totalItems}</span>}
            </Link>
          </>
        )}

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
              {user?.wallet !== undefined && user.wallet > 0 && (
                <div className={styles.walletRow}>💰 Wallet: <strong>₹{user.wallet.toFixed(0)}</strong></div>
              )}
              <hr className={styles.hr} />
              <button className={styles.logoutBtn} onClick={handleLogout}>🚪 Sign Out</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
