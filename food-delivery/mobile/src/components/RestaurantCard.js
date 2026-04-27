import React from 'react';
import Link from 'next/link';
import styles from './RestaurantCard.module.css';

export default function RestaurantCard({ restaurant, isFavourite, onToggleFavourite }) {
  return (
    <div className={`${styles.card} ${!restaurant.isOpen ? styles.closed : ''}`}>
      <div className={styles.imgWrapper}>
        <img src={restaurant.image} alt={restaurant.name} className={styles.img} />
        {!restaurant.isOpen && <div className={styles.closedOverlay}>Closed</div>}
        {restaurant.offer && <div className={styles.offerBadge}>🏷️ {restaurant.offer}</div>}
        {onToggleFavourite && (
          <button className={`${styles.favBtn} ${isFavourite ? styles.favActive : ''}`}
            onClick={e => { e.preventDefault(); onToggleFavourite(); }}
            title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}>
            {isFavourite ? '❤️' : '🤍'}
          </button>
        )}
      </div>
      <Link href={`/restaurant/?id=${restaurant.id}`} className={styles.info}>
        <div className={styles.nameRow}>
          <h3>{restaurant.name}</h3>
          {restaurant.isFeatured && <span className={styles.featuredBadge}>⭐ Featured</span>}
        </div>
        <p className={styles.cuisine}>{restaurant.cuisine}</p>
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

