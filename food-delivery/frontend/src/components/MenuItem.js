import React from 'react';
import { useCart } from '../context/CartContext';
import styles from './MenuItem.module.css';

export default function MenuItem({ item, restaurantId, restaurantName, hasOwnDelivery, canOrder = true }) {
  const { cart, addItem, removeItem } = useCart();
  const cartItem = cart.items.find(i => i.id === item.id);
  const qty = cartItem ? cartItem.quantity : 0;
  const isAvailableToOrder = canOrder && item.available;

  return (
    <div className={`${styles.card} ${!isAvailableToOrder ? styles.unavailable : ''}`}>
      <img src={item.image} alt={item.name} className={styles.img} />
      <div className={styles.info}>
        <div className={styles.nameRow}>
          <h4>{item.name}</h4>
          {!isAvailableToOrder && <span className={styles.unavailBadge}>{canOrder ? 'Unavailable' : 'Closed'}</span>}
        </div>
        <p>{item.description}</p>
        <div className={styles.bottom}>
          <span className={styles.price}>₹{item.price.toFixed(0)}</span>
          {isAvailableToOrder ? (
            qty === 0 ? (
              <button className={styles.addBtn} onClick={() => addItem(item, restaurantId, restaurantName, hasOwnDelivery)}>+ Add</button>
            ) : (
              <div className={styles.qty}>
                <button onClick={() => removeItem(item.id)}>−</button>
                <span>{qty}</span>
                <button onClick={() => addItem(item, restaurantId, restaurantName, hasOwnDelivery)}>+</button>
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
