import React, { useEffect, useMemo, useState } from 'react';
import RestaurantCard from '../../components/RestaurantCard';
import { FlameIcon, SparkleIcon, TagIcon, TruckIcon } from '../../components/Icons';
import { getRestaurants, getActivePromos, getRestaurant, getCachedRestaurantsSnapshot } from '../../firebase/services';
import styles from './Home.module.css';

const DEFAULT_CUISINES = ['All', 'Italian', 'American', 'Japanese', 'Mexican', 'Healthy'];
const OFFER_BG = ['#ff6b35', '#0f766e', '#7c3aed', '#dc2626', '#2563eb', '#ca8a04'];

export default function Home() {
  const [restaurants, setRestaurants] = useState(() => getCachedRestaurantsSnapshot('') || []);
  const [cuisine, setCuisine] = useState('All');
  const [loading, setLoading] = useState(() => !(getCachedRestaurantsSnapshot('') || []).length);
  const [promos, setPromos] = useState([]);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    let alive = true;
    const activeCuisine = cuisine !== 'All' ? cuisine : '';
    const cached = getCachedRestaurantsSnapshot(activeCuisine);

    if (cached?.length) {
      setRestaurants(cached);
      setLoading(false);
    } else if (!restaurants.length) {
      setLoading(true);
    }

    getRestaurants(activeCuisine)
      .then(data => { if (alive) setRestaurants(data); })
      .catch(() => { if (alive && !cached?.length) setRestaurants([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [cuisine]);

  useEffect(() => {
    getActivePromos()
      .then(data => setPromos(data || []))
      .catch(() => setPromos([]));
  }, []);

  useEffect(() => {
    if (!restaurants.length) return undefined;
    const preload = () => {
      restaurants.slice(0, 4).forEach(restaurant => {
        getRestaurant(restaurant.id).catch(() => {});
      });
    };
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(preload, { timeout: 1500 });
      return () => window.cancelIdleCallback?.(id);
    }
    const timer = setTimeout(preload, 600);
    return () => clearTimeout(timer);
  }, [restaurants]);

  const cuisines = useMemo(() => {
    const fromData = restaurants.map(r => r.cuisine).filter(Boolean);
    return ['All', ...new Set([...DEFAULT_CUISINES.slice(1), ...fromData])];
  }, [restaurants]);

  const ownDelivery = restaurants.filter(r => r.hasOwnDelivery);
  const platformDelivery = restaurants.filter(r => !r.hasOwnDelivery);
  const featured = restaurants.find(r => r.isFeatured || r.isAcceptingOrdersNow);

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  const promoLabel = (p) => {
    if (p.type === 'percent') return `${p.value}% off`;
    if (p.type === 'flat') return `Rs ${p.value} off`;
    if (p.type === 'delivery') return 'Free delivery';
    return p.code;
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.kicker}><SparkleIcon /> FeastFleet picks</span>
          <h1>Fresh meals, faster checkout, better cravings.</h1>
          <p>Explore trusted restaurants, live offers, and quick delivery options near you.</p>
          <div className={styles.heroStats}>
            <span><FlameIcon /> Hot offers</span>
            <span><TruckIcon /> Fast delivery</span>
            <span><TagIcon /> Easy savings</span>
          </div>
        </div>
        {featured?.image && (
          <div className={styles.heroImage}>
            <img src={featured.image} alt={featured.name} loading="eager" fetchPriority="high" decoding="async" />
            <div>
              <strong>{featured.name}</strong>
              <span>{featured.cuisine}</span>
            </div>
          </div>
        )}
      </section>

      {promos.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2><FlameIcon /> Today's Offers</h2>
            <span>{promos.length} active</span>
          </div>
          <div className={styles.offersRow}>
            {promos.map((p, i) => (
              <div
                key={p.code}
                className={styles.offerCard}
                style={{ background: OFFER_BG[i % OFFER_BG.length] }}
              >
                <TagIcon className={styles.offerIcon} />
                <span className={styles.offerTitle}>{promoLabel(p)}</span>
                <span className={styles.offerSub}>{p.minOrder ? `Min Rs ${p.minOrder}` : 'No minimum'}</span>
                <button className={styles.copyBtn} onClick={() => copyCode(p.code)}>
                  {copied === p.code ? 'Copied' : p.code}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className={styles.filters} aria-label="Cuisine filters">
        {cuisines.map(c => (
          <button
            key={c}
            className={`${styles.chip} ${cuisine === c ? styles.active : ''}`}
            onClick={() => setCuisine(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {loading && restaurants.length === 0 ? (
        <RestaurantSkeleton />
      ) : (
        <>
          {loading && restaurants.length > 0 && (
            <div className={styles.refreshing}>Refreshing restaurants...</div>
          )}

          {ownDelivery.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2><TruckIcon /> Restaurant Delivery</h2>
                <span>No platform delivery wait</span>
              </div>
              <div className={styles.grid}>
                {ownDelivery.map((r, index) => (
                  <RestaurantCard key={r.id} restaurant={r} priority={index < 2} />
                ))}
              </div>
            </section>
          )}

          {platformDelivery.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2><SparkleIcon /> FeastFleet Delivery</h2>
                <span>Tracked by delivery partners</span>
              </div>
              <div className={styles.grid}>
                {platformDelivery.map((r, index) => (
                  <RestaurantCard key={r.id} restaurant={r} priority={ownDelivery.length === 0 && index < 2} />
                ))}
              </div>
            </section>
          )}

          {restaurants.length === 0 && (
            <div className={styles.noResults}>No restaurants found for this cuisine.</div>
          )}
        </>
      )}
    </div>
  );
}

function RestaurantSkeleton() {
  return (
    <div className={styles.grid}>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className={styles.skeletonCard}>
          <div className={styles.skeletonImage} />
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonShort} />
          <div className={styles.skeletonMeta} />
        </div>
      ))}
    </div>
  );
}
