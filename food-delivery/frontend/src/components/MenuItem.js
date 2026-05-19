import React from 'react';
import { useCart } from '../context/CartContext';
import { FlameIcon, SparkleIcon } from './Icons';
import styles from './MenuItem.module.css';

export default function MenuItem({
  item,
  restaurantId,
  restaurantName,
  hasOwnDelivery,
  canOrder = true,
  priority = false,
}) {
  const { cart, addItem, removeItem } = useCart();
  const cartItem = cart.items.find(i => i.id === item.id);
  const qty = cartItem ? cartItem.quantity : 0;
  const isAvailableToOrder = canOrder && item.available;

  return (
    <div className={`${styles.card} ${!isAvailableToOrder ? styles.unavailable : ''}`}>
      <div className={styles.media}>
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className={styles.img}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
          />
        ) : (
          <div className={styles.imgFallback}><SparkleIcon /></div>
        )}
        {item.isPopular && (
          <span className={styles.popularBadge}>
            <FlameIcon className={styles.badgeIcon} />
            Popular
          </span>
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.nameRow}>
          <h4>{item.name}</h4>
          {!isAvailableToOrder && <span className={styles.unavailBadge}>{canOrder ? 'Unavailable' : 'Closed'}</span>}
        </div>
        {item.category && <span className={styles.category}>{item.category}</span>}
        <p>{item.description}</p>
        <div className={styles.bottom}>
          <span className={styles.price}>Rs {Number(item.price || 0).toFixed(0)}</span>
          {isAvailableToOrder ? (
            qty === 0 ? (
              <button className={styles.addBtn} onClick={() => addItem(item, restaurantId, restaurantName, hasOwnDelivery)}>Add</button>
            ) : (
              <div className={styles.qty}>
                <button onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`}>-</button>
                <span>{qty}</span>
                <button onClick={() => addItem(item, restaurantId, restaurantName, hasOwnDelivery)} aria-label={`Add ${item.name}`}>+</button>
              </div>
            )
          ) : (
            <span className={styles.soldOut}>{canOrder ? 'Sold out' : 'Restaurant closed'}</span>
          )}
        </div>
      </div>
    </div>
  );
}
