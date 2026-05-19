import React from 'react';
import { Link } from 'react-router-dom';
import { ClockIcon, HeartIcon, StarIcon, TagIcon, TruckIcon } from './Icons';
import styles from './RestaurantCard.module.css';

export default function RestaurantCard({
  restaurant,
  isFavourite,
  onToggleFavourite,
  highlightQuery = '',
  priority = false,
}) {
  const acceptingOrders = restaurant.isAcceptingOrdersNow ?? restaurant.isOpen;
  const statusLabel = restaurant.orderStatusLabel || (acceptingOrders ? 'Open' : 'Closed');
  const deliveryLabel = restaurant.hasOwnDelivery
    ? 'Free delivery'
    : `Rs ${restaurant.deliveryFee || 0} delivery`;

  return (
    <div className={`${styles.card} ${!acceptingOrders ? styles.closed : ''}`}>
      <div className={styles.imgWrapper}>
        {restaurant.image && (
          <img
            src={restaurant.image}
            alt={restaurant.name}
            className={styles.img}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
          />
        )}
        <div className={styles.imageWash} />
        {!acceptingOrders && <div className={styles.closedOverlay}>{statusLabel}</div>}
        {restaurant.offer && (
          <div className={styles.offerBadge}>
            <TagIcon className={styles.badgeIcon} />
            <span>{restaurant.offer}</span>
          </div>
        )}
        <div className={styles.topMeta}>
          <span className={styles.ratingPill}>
            <StarIcon className={styles.pillIcon} />
            {Number(restaurant.rating || 0).toFixed(1)}
          </span>
          <span className={`${styles.statusPill} ${acceptingOrders ? styles.statusOpen : styles.statusClosed}`}>
            {statusLabel}
          </span>
        </div>
        {onToggleFavourite && (
          <button
            className={`${styles.favBtn} ${isFavourite ? styles.favActive : ''}`}
            onClick={e => { e.preventDefault(); onToggleFavourite(); }}
            title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
          >
            <HeartIcon className={styles.heartIcon} />
          </button>
        )}
      </div>

      <Link to={`/restaurant/${restaurant.id}`} className={styles.info}>
        <div className={styles.nameRow}>
          <h3>{highlightText(restaurant.name, highlightQuery)}</h3>
          {restaurant.isFeatured && <span className={styles.featuredBadge}>Featured</span>}
        </div>
        <p className={styles.cuisine}>{highlightText(restaurant.cuisine, highlightQuery)}</p>
        <div className={styles.quickFacts}>
          <span><ClockIcon className={styles.factIcon} />{restaurant.deliveryTime || '30-45 min'}</span>
          <span><TruckIcon className={styles.factIcon} />{deliveryLabel}</span>
        </div>
        {restaurant.tags?.length > 0 && (
          <div className={styles.tags}>
            {restaurant.tags.map(t => <span key={t} className={styles.tag}>{t}</span>)}
          </div>
        )}
        <div className={styles.footerRow}>
          <span>{restaurant.reviewCount || 0} reviews</span>
          <strong>{acceptingOrders ? 'Order now' : (restaurant.orderStatusReason || 'Temporarily closed')}</strong>
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
