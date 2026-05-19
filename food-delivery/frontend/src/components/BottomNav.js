import React from 'react';
import { NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import styles from './BottomNav.module.css';
import { ReceiptIcon, CoinIcon, HistoryIcon, AdminIcon } from './Icons';

export default function BottomNav() {
  const { totalItems } = useCart();

  return (
    <nav className={styles.nav}>
      <NavLink to="/checkout" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <span className={`${styles.icon} ${styles.cartIcon}`}>
          <ReceiptIcon />
          {totalItems > 0 && <span className={styles.badge}>{totalItems}</span>}
        </span>
        <span>Order</span>
      </NavLink>
      <NavLink to="/wallet" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <span className={styles.icon}><CoinIcon /></span><span>FeastCoin</span>
      </NavLink>
      <NavLink to="/orders" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <span className={styles.icon}><HistoryIcon /></span><span>History</span>
      </NavLink>
      <NavLink to="/admin" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <span className={styles.icon}><AdminIcon /></span><span>Admin</span>
      </NavLink>
    </nav>
  );
}
