import React from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { FlameIcon, HeartIcon, SparkleIcon } from './Icons';
import { resolveMenuItemImage } from '../utils/menuImages';
import { updateUser } from '../firebase/services';
import PriceDisplay from './PriceDisplay';
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
  const { user } = useAuth();
  const [saved, setSaved] = React.useState(false);
  const cartItem = cart.items.find(i => i.id === item.id);
  const qty = cartItem ? cartItem.quantity : 0;
  const isAvailableToOrder = canOrder && item.available;
  const image = resolveMenuItemImage(item);
  const isNewUser = Boolean(user?.isNewUser);

  React.useEffect(() => {
    setSaved(Array.isArray(user?.savedItems) && user.savedItems.some(savedItem => savedItem?.id === item.id && savedItem?.restaurantId === restaurantId));
  }, [item.id, restaurantId, user?.savedItems]);

  const handleToggleSaved = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user?.id) return;

    const current = Array.isArray(user.savedItems) ? user.savedItems : [];
    const exists = current.some(savedItem => savedItem?.id === item.id && savedItem?.restaurantId === restaurantId);
    const next = exists
      ? current.filter(savedItem => !(savedItem?.id === item.id && savedItem?.restaurantId === restaurantId))
      : [{ id: item.id, restaurantId, restaurantName, name: item.name, price: item.price, image, category: item.category, addedAt: new Date().toISOString() }, ...current];
    setSaved(!exists);
    await updateUser(user.id, { savedItems: next });
  };

  return (
    <div className={`${styles.card} ${!isAvailableToOrder ? styles.unavailable : ''}`}>
      <div className={styles.media}>
        {image ? (
          <img
            src={image}
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
        <button
          type="button"
          className={`${styles.saveBtn} ${saved ? styles.saveActive : ''}`}
          onClick={handleToggleSaved}
          title={saved ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          <HeartIcon className={styles.saveIcon} />
        </button>
      </div>

      <div className={styles.info}>
        <div className={styles.nameRow}>
          <h4>{item.name}</h4>
          {!isAvailableToOrder && <span className={styles.unavailBadge}>{canOrder ? 'Unavailable' : 'Closed'}</span>}
        </div>
        {item.category && <span className={styles.category}>{item.category}</span>}
        <p>{item.description}</p>
        <div className={styles.bottom}>
          <span className={styles.price}>
            <PriceDisplay originalPrice={item.price} isNewUser={isNewUser} />
          </span>
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
