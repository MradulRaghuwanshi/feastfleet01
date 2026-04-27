import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MenuItem from '../../components/MenuItem';
import ReviewSection from '../../components/ReviewSection';
import { useCart } from '../../context/CartContext';
import { getRestaurant } from '../../firebase/services';
import styles from './RestaurantMenu.module.css';

// Lazy load the map to prevent leaflet from crashing the whole app
const LiveTrackingMap = React.lazy(() => import('../../components/LiveTrackingMap'));

export default function RestaurantMenu() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const { totalItems, subtotal } = useCart();

  useEffect(() => {
    getRestaurant(id).then(setRestaurant);
  }, [id]);

  if (!restaurant) return <p className={styles.loading}>Loading menu...</p>;

  const categories = ['All', ...new Set(restaurant.menu.map(i => i.category))];
  const filtered = activeCategory === 'All' ? restaurant.menu : restaurant.menu.filter(i => i.category === activeCategory);

  return (
    <div className={styles.page}>
      <div className={styles.header} style={{ backgroundImage: `url(${restaurant.image})` }}>
        <div className={styles.overlay}>
          <button className={styles.back} onClick={() => navigate(-1)}>← Back</button>
          <div className={styles.headerInfo}>
            <h1>{restaurant.name}</h1>
            <div className={styles.meta}>
              <span>⭐ {restaurant.rating}</span>
              <span>🕐 {restaurant.deliveryTime}</span>
            {restaurant.hasOwnDelivery ? (
              <span className={styles.ownDelivery}>🛵 Free Delivery (Restaurant)</span>
            ) : (
              <span>🚚 ₹{restaurant.deliveryFee} delivery</span>
            )}
              <span className={`${styles.statusBadge} ${restaurant.isOpen ? styles.open : styles.closed}`}>
                {restaurant.isOpen ? '● Open' : '● Closed'}
              </span>
            </div>
            <p className={styles.address}>📍 {restaurant.address}</p>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.categories}>
          {categories.map(c => (
            <button key={c} className={`${styles.catBtn} ${activeCategory === c ? styles.active : ''}`}
              onClick={() => setActiveCategory(c)}>{c}</button>
          ))}
        </div>
        <div className={styles.menuGrid}>
          {filtered.map(item => (
            <MenuItem key={item.id} item={item} restaurantId={restaurant.id} restaurantName={restaurant.name} hasOwnDelivery={restaurant.hasOwnDelivery} />
          ))}
        </div>
      </div>

      <div style={{maxWidth:900,margin:'0 auto',padding:'0 16px'}}>
        <ReviewSection restaurantId={restaurant.id} />
      </div>

      {totalItems > 0 && (
        <div className={styles.cartBar}>
          <span>{totalItems} item{totalItems > 1 ? 's' : ''} · ₹{subtotal.toFixed(0)}</span>
          <button onClick={() => navigate('/checkout')}>View Cart →</button>
        </div>
      )}
    </div>
  );
}
