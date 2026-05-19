import React, { useEffect, useMemo, useState } from 'react';
import RestaurantCard from '../../components/RestaurantCard';
import { FlameIcon, SparkleIcon, TagIcon, TruckIcon } from '../../components/Icons';
import { getRestaurants, getActivePromos, getRestaurant, getCachedRestaurantsSnapshot, searchRestaurants } from '../../firebase/services';
import styles from './Home.module.css';

const DEFAULT_CUISINES = ['All', 'Italian', 'American', 'Japanese', 'Mexican', 'Healthy'];
const OFFER_BG = ['#ff6b35', '#0f766e', '#7c3aed', '#dc2626', '#2563eb', '#ca8a04'];

export default function Home() {
  const [restaurants, setRestaurants] = useState(() => getCachedRestaurantsSnapshot('') || []);
  const [loading, setLoading] = useState(() => !(getCachedRestaurantsSnapshot('') || []).length);
  const [promos, setPromos] = useState([]);
  const [copied, setCopied] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState({ restaurants: [], dishes: [] });
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    let alive = true;
    const cached = getCachedRestaurantsSnapshot('');

    if (cached?.length) {
      setRestaurants(cached);
      setLoading(false);
    } else if (!restaurants.length) {
      setLoading(true);
    }

    getRestaurants('')
      .then(data => { if (alive) setRestaurants(data); })
      .catch(() => { if (alive && !cached?.length) setRestaurants([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    getActivePromos()
      .then(data => setPromos(data || []))
      .catch(() => setPromos([]));
  }, []);

  useEffect(() => {
    let alive = true;
    const query = searchQuery.trim();

    if (!query) {
      setSearchResults({ restaurants: [], dishes: [] });
      setSearchLoading(false);
      setSearchError('');
      return () => { alive = false; };
    }

    setSearchLoading(true);
    setSearchError('');
    const timer = setTimeout(() => {
      searchRestaurants(query)
        .then(data => {
          if (!alive) return;
          setSearchResults({
            restaurants: data?.restaurants || [],
            dishes: data?.dishes || [],
          });
        })
        .catch(error => {
          if (!alive) return;
          setSearchResults({ restaurants: [], dishes: [] });
          setSearchError(error?.message || 'Search failed');
        })
        .finally(() => {
          if (alive) setSearchLoading(false);
        });
    }, 250);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

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

  const ownDelivery = restaurants.filter(r => r.hasOwnDelivery);
  const platformDelivery = restaurants.filter(r => !r.hasOwnDelivery);
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

  const searchBox = (
    <div className={styles.searchWrap}>
      <label className={styles.searchLabel} htmlFor="restaurant-search">Search restaurants, items or categories</label>
      <div className={styles.searchBar}>
        <input
          id="restaurant-search"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Try: roll express, maggi, shakes, fast food"
          className={styles.searchInput}
        />
        {searchQuery && (
          <button className={styles.clearBtn} onClick={() => setSearchQuery('')} type="button">
            Clear
          </button>
        )}
      </div>
      {(searchLoading || searchError || searchQuery.trim()) && (
        <div className={styles.searchMeta}>
          {searchLoading && <span>Searching...</span>}
          {searchError && <span className={styles.searchError}>{searchError}</span>}
          {!searchLoading && !searchError && searchQuery.trim() && (
            <span>{searchResults.restaurants.length} restaurants, {searchResults.dishes.length} items found</span>
          )}
        </div>
      )}
    </div>
  );

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
      </section>
      {searchBox}

      {searchQuery.trim() ? (
        <SearchResults restaurants={searchResults.restaurants} dishes={searchResults.dishes} loading={searchLoading} />
      ) : (
        <>
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
                <div className={styles.noResults}>No restaurants found.</div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function SearchResults({ restaurants, dishes, loading }) {
  if (loading) {
    return <div className={styles.searchEmpty}>Searching restaurants and menu items...</div>;
  }

  if (!restaurants.length && !dishes.length) {
    return <div className={styles.searchEmpty}>No matches found. Try a restaurant name, item or category.</div>;
  }

  return (
    <div className={styles.searchResults}>
      {restaurants.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Restaurants</h2>
            <span>{restaurants.length} match{restaurants.length === 1 ? '' : 'es'}</span>
          </div>
          <div className={styles.grid}>
            {restaurants.map((r, index) => (
              <RestaurantCard key={r.id} restaurant={r} priority={index < 2} />
            ))}
          </div>
        </section>
      )}

      {dishes.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Items and Categories</h2>
            <span>{dishes.length} match{dishes.length === 1 ? '' : 'es'}</span>
          </div>
          <div className={styles.searchItemList}>
            {dishes.map(item => (
              <div key={`${item.restaurantId}:${item.id}`} className={styles.searchItemCard}>
                <div className={styles.searchItemMeta}>
                  <strong>{item.name}</strong>
                  <span>{item.category || 'Menu item'} · {item.restaurantName}</span>
                </div>
                <div className={styles.searchItemPrice}>Rs {Number(item.price || 0).toFixed(0)}</div>
              </div>
            ))}
          </div>
        </section>
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
