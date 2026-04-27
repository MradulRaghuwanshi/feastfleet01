import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MenuItem from '../components/MenuItem';
import { useCart } from '../context/CartContext';
import styles from './RestaurantMenu.module.css';

export default function RestaurantMenu() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const { totalItems, subtotal } = useCart();

  useEffect(() => {
    fetch(`/api/restaurants/${id}`)
      .then(r => r.json())
      .then(setRestaurant);
  }, [id]);

  if (!restaurant) return <p className={styles.loading}>Loading menu...</p>;

  const categories = ['All', ...new Set(restaurant.menu.map(i => i.category))];
  const filtered = activeCategory === 'All'
    ? restaurant.menu
    : restaurant.menu.filter(i => i.category === activeCategory);

  return (
    <div className={styles.page}>
      <div className={styles.header} style={{ backgroundImage: `url(${restaurant.image})` }}>
        <div className={styles.overlay}>
          <button className={styles.back} onClick={() => navigate(-1)}>← Back</button>
          <h1>{restaurant.name}</h1>
          <div className={styles.meta}>
            <span>⭐ {restaurant.rating}</span>
            <span>🕐 {restaurant.deliveryTime}</span>
            {restaurant.hasOwnDelivery ? (
              <span className={styles.ownDelivery}>🛵 Free Delivery (Restaurant)</span>
            ) : (
              <span>🚚 ₹{restaurant.deliveryFee} delivery</span>
            )}
            <span>{restaurant.cuisine}</span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.categories}>
          {categories.map(c => (
            <button
              key={c}
              className={`${styles.catBtn} ${activeCategory === c ? styles.active : ''}`}
              onClick={() => setActiveCategory(c)}
            >{c}</button>
          ))}
        </div>

        <div className={styles.menuGrid}>
          {filtered.map(item => (
            <MenuItem
              key={item.id}
              item={item}
              restaurantId={restaurant.id}
              restaurantName={restaurant.name}
              hasOwnDelivery={restaurant.hasOwnDelivery}
            />
          ))}
        </div>
      </div>

      {totalItems > 0 && (
        <div className={styles.cartBar}>
          <span>{totalItems} item{totalItems > 1 ? 's' : ''} | ₹{subtotal.toFixed(0)}</span>
          <button onClick={() => navigate('/checkout')}>View Cart →</button>
        </div>
      )}
    </div>
  );
}
