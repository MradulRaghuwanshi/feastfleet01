import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MenuItem from '../../components/MenuItem';
import ReviewSection from '../../components/ReviewSection';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { getRestaurant } from '../../firebase/services';
import { isVegItem } from '../../utils/diet';
import { getInflatedPrice } from '../../utils/offerPricing';
import styles from './RestaurantMenu.module.css';

// Lazy load the map to prevent leaflet from crashing the whole app
const LiveTrackingMap = React.lazy(() => import('../../components/LiveTrackingMap'));

export default function RestaurantMenu() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [vegOnly, setVegOnly] = useState(false);
  const { cart, totalItems } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    getRestaurant(id).then(setRestaurant);
  }, [id]);

  if (!restaurant) return <MenuSkeleton />;

  const canOrder = restaurant.isAcceptingOrdersNow ?? restaurant.isOpen;
  const isNewUser = Boolean(user?.isNewUser);
  const visibleMenu = vegOnly ? restaurant.menu.filter(isVegItem) : restaurant.menu;
  const categories = ['All', ...new Set(visibleMenu.map(i => i.category).filter(Boolean))];
  const filtered = activeCategory === 'All' ? visibleMenu : visibleMenu.filter(i => i.category === activeCategory);
  const recommended = visibleMenu.filter(item => item.isPopular).slice(0, 4);
  const displayedSubtotal = Math.round(
    cart.items.reduce((sum, item) => {
      const unitInflated = getInflatedPrice(item.price, undefined, isNewUser);
      return sum + unitInflated * Number(item.quantity || 0);
    }, 0)
  );

  return (
    <div className={styles.page}>
      <div className={styles.header} style={{ backgroundImage: `url(${restaurant.image})` }}>
        <div className={styles.overlay}>
          <button className={styles.back} onClick={() => navigate(-1)}>Back</button>
          <div className={styles.headerInfo}>
            <h1>{restaurant.name}</h1>
            <div className={styles.meta}>
              <span>{restaurant.rating} rating</span>
              <span>{restaurant.deliveryTime}</span>
            {restaurant.hasOwnDelivery ? (
              <span className={styles.ownDelivery}>Free restaurant delivery</span>
            ) : (
              <span>₹{restaurant.deliveryFee} delivery</span>
            )}
                <span className={`${styles.statusBadge} ${canOrder ? styles.open : styles.closed}`}>
                  {canOrder ? 'Open now' : (restaurant.orderStatusLabel || 'Closed')}
              </span>
            </div>
            <p className={styles.address}>{restaurant.address}</p>
              {restaurant.description && <p className={styles.description}>{restaurant.description}</p>}
              {!canOrder && (
                <div className={styles.closedNotice}>
                  {restaurant.orderStatusReason || 'This restaurant is not accepting orders right now.'}
                </div>
              )}
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {restaurant.offer && (
          <div className={styles.offerStrip}>
            <strong>{restaurant.offer}</strong>
            <span>Applied automatically where eligible</span>
          </div>
        )}

        {recommended.length > 0 && (
          <section className={styles.recommendations}>
            <div className={styles.sectionHeader}>
              <h2>Chef-loved picks</h2>
              <span>Fast add</span>
            </div>
            <div className={styles.recoRail}>
              {recommended.map(item => (
                <button key={item.id} className={styles.recoCard} onClick={() => setActiveCategory(item.category || 'All')}>
                  {item.image && <img src={item.image} alt="" loading="lazy" decoding="async" />}
                  <span>{item.name}</span>
                  <strong>Rs {getInflatedPrice(item.price, undefined, isNewUser)}</strong>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className={styles.categories}>
          <button
            type="button"
            className={`${styles.catBtn} ${vegOnly ? styles.active : ''}`}
            onClick={() => {
              setVegOnly(value => !value);
              setActiveCategory('All');
            }}
          >
            Pure Veg
          </button>
          {categories.map(c => (
            <button key={c} className={`${styles.catBtn} ${activeCategory === c ? styles.active : ''}`}
              onClick={() => setActiveCategory(c)}>{c}</button>
          ))}
        </div>
        <div className={styles.menuGrid}>
          {filtered.map((item, index) => (
            <MenuItem
              key={item.id}
              item={item}
              restaurantId={restaurant.id}
              restaurantName={restaurant.name}
              hasOwnDelivery={restaurant.hasOwnDelivery}
              canOrder={canOrder}
              priority={index < 3}
            />
          ))}
        </div>
      </div>

      <div style={{maxWidth:900,margin:'0 auto',padding:'0 16px'}}>
        <ReviewSection restaurantId={restaurant.id} />
      </div>

      <section className={styles.similar}>
        <div className={styles.sectionHeader}>
          <h2>More reasons to order</h2>
          <span>Freshly prepared, live tracked, easy reorder</span>
        </div>
        <div className={styles.reasonGrid}>
          <span>Secure online payment</span>
          <span>Clear delivery fees</span>
          <span>Reward coins on checkout</span>
        </div>
      </section>

      {totalItems > 0 && (
        <div className={styles.cartBar}>
          <span>{totalItems} item{totalItems > 1 ? 's' : ''} · ₹{displayedSubtotal}</span>
          <button onClick={() => navigate('/checkout')} disabled={!canOrder}>
            {canOrder ? 'View Cart →' : 'Closed'}
          </button>
        </div>
      )}
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.headerSkeleton} />
      <div className={styles.content}>
        <div className={styles.categorySkeleton}>
          {Array.from({ length: 5 }).map((_, index) => <span key={index} />)}
        </div>
        <div className={styles.menuGrid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={styles.itemSkeleton}>
              <div />
              <section>
                <span />
                <span />
                <span />
              </section>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
