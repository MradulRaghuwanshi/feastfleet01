import React, { useEffect, useState } from 'react';
import RestaurantCard from '../../components/RestaurantCard';
import { getRestaurants, getActivePromos } from '../../firebase/services';
import styles from './Home.module.css';

const CUISINES = ['All', 'Italian', 'American', 'Japanese', 'Mexican', 'Healthy'];

const OFFER_BG = ['#ff6b35', '#e63946', '#2a9d8f', '#e9c46a', '#f4a261', '#264653'];

export default function Home() {
  const [restaurants, setRestaurants] = useState([]);
  const [cuisine, setCuisine] = useState('All');
  const [loading, setLoading] = useState(true);
  const [promos, setPromos] = useState([]);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    getRestaurants(cuisine !== 'All' ? cuisine : '')
      .then(data => { setRestaurants(data); })
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false));
  }, [cuisine]);

  useEffect(() => {
    getActivePromos()
      .then(data => setPromos(data || []))
      .catch(() => setPromos([]));
  }, []);

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  const promoLabel = (p) => {
    if (p.type === 'percent') return `${p.value}% OFF`;
    if (p.type === 'flat') return `₹${p.value} OFF`;
    if (p.type === 'delivery') return 'Free Delivery';
    return p.code;
  };

  const promoSub = (p) => {
    const min = p.minOrder ? `Min ₹${p.minOrder}` : '';
    return min;
  };

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1>Hungry? We've got you covered.</h1>
        <p>Order from the best restaurants near you</p>
      </div>

      {promos.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>🔥 Today's Offers</div>
          <div className={styles.offersRow}>
            {promos.map((p, i) => (
              <div
                key={p.code}
                className={styles.offerCard}
                style={{ background: OFFER_BG[i % OFFER_BG.length] }}
              >
                <span className={styles.offerEmoji}>
                  {p.type === 'percent' ? '🎉' : p.type === 'flat' ? '💰' : '🚚'}
                </span>
                <span className={styles.offerTitle}>{promoLabel(p)}</span>
                {promoSub(p) && <span className={styles.offerSub}>{promoSub(p)}</span>}
                <button className={styles.copyBtn} onClick={() => copyCode(p.code)}>
                  {copied === p.code ? '✓ Copied' : `Copy ${p.code}`}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.filters}>
        {CUISINES.map(c => (
          <button
            key={c}
            className={`${styles.chip} ${cuisine === c ? styles.active : ''}`}
            onClick={() => setCuisine(c)}
          >{c}</button>
        ))}
      </div>

      {loading ? (
        <p className={styles.loading}>Loading restaurants...</p>
      ) : (
        <>
          {/* Own Delivery Section */}
          {restaurants.filter(r => r.hasOwnDelivery).length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>🛵 Restaurants with Own Delivery</div>
              <div className={styles.grid}>
                {restaurants.filter(r => r.hasOwnDelivery).map(r => <RestaurantCard key={r.id} restaurant={r} />)}
              </div>
            </div>
          )}

          {/* Platform Delivery Section */}
          {restaurants.filter(r => !r.hasOwnDelivery).length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>🚚 Restaurants with Platform Delivery</div>
              <div className={styles.grid}>
                {restaurants.filter(r => !r.hasOwnDelivery).map(r => <RestaurantCard key={r.id} restaurant={r} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

