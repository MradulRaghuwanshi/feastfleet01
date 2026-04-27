import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import styles from './BottomNav.module.css';

export default function BottomNav() {
  const { totalItems } = useCart();
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
      <NavLink to="/favourites" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <span>❤️</span><span>Saved</span>
      </NavLink>
    </nav>
  );
}
