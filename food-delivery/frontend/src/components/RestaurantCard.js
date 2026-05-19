import React from 'react';
import { Link } from 'react-router-dom';
import styles from './RestaurantCard.module.css';

export default function RestaurantCard({ restaurant, isFavourite, onToggleFavourite, highlightQuery = '' }) {
  const acceptingOrders = restaurant.isAcceptingOrdersNow ?? restaurant.isOpen;
  const statusLabel = restaurant.orderStatusLabel || (acceptingOrders ? 'Open' : 'Closed');

  return (
    <div className={`${styles.card} ${!acceptingOrders ? styles.closed : ''}`}>
      <div className={styles.imgWrapper}>
        {restaurant.image && (
          <img
            src={restaurant.image}
            alt={restaurant.name}
            className={styles.img}
            loading="lazy"
            decoding="async"
          />
        )}
        {!acceptingOrders && <div className={styles.closedOverlay}>{statusLabel}</div>}
        {restaurant.offer && <div className={styles.offerBadge}>🏷️ {restaurant.offer}</div>}
        {onToggleFavourite && (
          <button className={`${styles.favBtn} ${isFavourite ? styles.favActive : ''}`}
            onClick={e => { e.preventDefault(); onToggleFavourite(); }}
            title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}>
            {isFavourite ? '❤️' : '🤍'}
          </button>
        )}
      </div>
      <Link to={`/restaurant/${restaurant.id}`} className={styles.info}>
        <div className={styles.nameRow}>
          <h3>{highlightText(restaurant.name, highlightQuery)}</h3>
          {restaurant.isFeatured && <span className={styles.featuredBadge}>⭐ Featured</span>}
        </div>
        <p className={styles.cuisine}>{highlightText(restaurant.cuisine, highlightQuery)}</p>
        <p className={styles.availability}>
          {acceptingOrders ? 'Accepting orders now' : (restaurant.orderStatusReason || 'Temporarily closed')}
        </p>
        {restaurant.tags?.length > 0 && (
          <div className={styles.tags}>
            {restaurant.tags.map(t => <span key={t} className={styles.tag}>{t}</span>)}
          </div>
        )}
        <div className={styles.meta}>
          <span className={styles.rating}>⭐ {restaurant.rating}</span>
          <span>({restaurant.reviewCount || 0} reviews)</span>
          <span>🕐 {restaurant.deliveryTime}</span>
          {restaurant.hasOwnDelivery ? (
            <span className={styles.ownDeliveryBadge}>🛵 Free Delivery</span>
          ) : (
            <span>🚚 ₹{restaurant.deliveryFee}</span>
          )}
        </div>
      </Link>
    </div>
  );
}

function highlightText(text, query) {
  const value = String(text || '');
  const needle = query.trim();
  if (!needle) return value;

  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = value.split(new RegExp(`(${escaped})`, 'ig'));
  return parts.map((part, index) => (
    part.toLowerCase() === needle.toLowerCase()
      ? <mark key={index} style={{ background: '#ffe0b2', color: 'inherit', borderRadius: 4, padding: '0 2px' }}>{part}</mark>
      : <React.Fragment key={index}>{part}</React.Fragment>
  ));
}
