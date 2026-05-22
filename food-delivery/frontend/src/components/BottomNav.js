import React from 'react';
import { NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import styles from './BottomNav.module.css';
import { ReceiptIcon, CoinIcon, HistoryIcon, HomeIcon, HeartIcon } from './Icons';

export default function BottomNav() {
  const { totalItems } = useCart();

  return (
    <nav className={styles.nav}>
      <NavLink to="/" end className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <span className={styles.icon}><HomeIcon /></span><span>Home</span>
      </NavLink>
      <NavLink to="/checkout" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <span className={`${styles.icon} ${styles.cartIcon}`}>
          <ReceiptIcon />
          {totalItems > 0 && <span className={styles.badge}>{totalItems}</span>}
        </span>
        <span>Order</span>
      </NavLink>
      <NavLink to="/wallet" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <span className={styles.icon}><CoinIcon /></span><span>Coins</span>
      </NavLink>
      <NavLink to="/orders" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <span className={styles.icon}><HistoryIcon /></span><span>History</span>
      </NavLink>
      <NavLink to="/favourites" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <span className={styles.icon}><HeartIcon /></span><span>Saved</span>
      </NavLink>
    </nav>
  );
}
