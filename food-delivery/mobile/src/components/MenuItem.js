import React from 'react';
import { useCart } from '../context/CartContext';
import styles from './MenuItem.module.css';

export default function MenuItem({ item, restaurantId, restaurantName, hasOwnDelivery }) {
  const { cart, addItem, removeItem } = useCart();
  const cartItem = cart.items.find(i => i.id === item.id);
  const qty = cartItem ? cartItem.quantity : 0;

  return (
    <div className={`${styles.card} ${!item.available ? styles.unavailable : ''}`}>
      <img src={item.image} alt={item.name} className={styles.img} />
      <div className={styles.info}>
        <div className={styles.nameRow}>
          <h4>{item.name}</h4>
          {!item.available && <span className={styles.unavailBadge}>Unavailable</span>}
        </div>
        <p>{item.description}</p>
        <div className={styles.bottom}>
          <span className={styles.price}>₹{item.price.toFixed(0)}</span>
          {item.available ? (
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
            <span className={styles.soldOut}>Sold out</span>
          )}
        </div>
      </div>
    </div>
  );
}
