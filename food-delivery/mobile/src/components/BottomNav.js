import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCart } from '../context/CartContext';
import styles from './BottomNav.module.css';

export default function BottomNav() {
  const { totalItems } = useCart();
  const router = useRouter();

  const isActive = (path) => router.pathname === path;

  return (
    <nav className={styles.nav}>
      <Link href="/" className={`${styles.item} ${isActive('/') ? styles.active : ''}`}>
        <span>🏠</span><span>Home</span>
      </Link>
      <Link href="/orders/" className={`${styles.item} ${isActive('/orders/') ? styles.active : ''}`}>
        <span>📦</span><span>Orders</span>
      </Link>
      <Link href="/checkout/" className={`${styles.item} ${isActive('/checkout/') ? styles.active : ''}`}>
        <span className={styles.cartIcon}>🛒{totalItems > 0 && <span className={styles.badge}>{totalItems}</span>}</span>
        <span>Cart</span>
      </Link>
      <Link href="/favourites/" className={`${styles.item} ${isActive('/favourites/') ? styles.active : ''}`}>
        <span>❤️</span><span>Saved</span>
      </Link>
    </nav>
  );
}

