import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import RestaurantCard from '../components/RestaurantCard';
import { getAppConfig, getRestaurants, searchRestaurants } from '../firebase/services';
import styles from './Home.module.css';

const DEFAULT_CUISINES = ['Italian', 'American', 'Japanese', 'Mexican', 'Healthy'];

export default function Home() {
  const [restaurants, setRestaurants] = useState([]);
  const [dishResults, setDishResults] = useState([]);
  const [cuisine, setCuisine] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [cuisines, setCuisines] = useState(['All', ...DEFAULT_CUISINES]);
  const searchTimerRef = useRef(null);
  const skipDebounceRef = useRef(false);

  const performSearch = async (query, activeCuisine) => {
    const normalizedQuery = query.trim();
    if (normalizedQuery) {
      setSearchLoading(true);
      try {
        const result = await searchRestaurants(normalizedQuery);
        const filteredRestaurants = (result.restaurants || []).filter(r => activeCuisine === 'All' || r.cuisine === activeCuisine);
        const filteredDishes = (result.dishes || []).filter(item => activeCuisine === 'All' || item.restaurantCuisine === activeCuisine);
        setRestaurants(filteredRestaurants);
        setDishResults(filteredDishes);
      } catch {
        setRestaurants([]);
        setDishResults([]);
      } finally {
        setSearchLoading(false);
        setLoading(false);
      }
      return;
    }

    setSearchLoading(false);
    setLoading(true);
    try {
      const data = await getRestaurants(activeCuisine !== 'All' ? activeCuisine : '');
      setRestaurants(data);
      setDishResults([]);
    } catch {
      setRestaurants([]);
      setDishResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    getAppConfig()
      .then(config => {
        if (!active) return;
        const configured = Array.isArray(config?.cuisines)
          ? config.cuisines
          : DEFAULT_CUISINES;
        setCuisines(['All', ...configured.filter(Boolean)]);
      })
      .catch(() => {
        if (active) setCuisines(['All', ...DEFAULT_CUISINES]);
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;

    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return () => { active = false; };
    }

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const timer = setTimeout(() => {
      if (!active) return;
      performSearch(searchQuery, cuisine);
    }, queryDelay(searchQuery));
    searchTimerRef.current = timer;

    return () => {
      active = false;
      clearTimeout(timer);
      if (searchTimerRef.current === timer) searchTimerRef.current = null;
    };
  }, [cuisine, searchQuery]);

  const showSearchState = searchQuery.trim().length > 0;
  const hasResults = restaurants.length > 0 || dishResults.length > 0;
  const isBusy = loading || searchLoading;

  const clearSearch = () => setSearchQuery('');

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    skipDebounceRef.current = true;
    performSearch(searchQuery, cuisine);
  };

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1>Hungry? We've got you covered.</h1>
        <p>Order from the best restaurants near you</p>
      </div>

      <form className={styles.searchPanel} onSubmit={handleSearchSubmit}>
        <div className={styles.searchIcon}>⌕</div>
        <div className={styles.searchBody}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search restaurants or dishes"
            className={styles.searchInput}
            aria-label="Search restaurants or dishes"
          />
          <div className={styles.searchMeta}>
            <span>{searchLoading ? 'Searching...' : 'Find places and menu items in one search'}</span>
            {searchQuery.trim() && (
              <button type="button" className={styles.clearBtn} onClick={clearSearch}>Clear</button>
            )}
          </div>
        </div>
        <button type="submit" className={styles.searchBtn}>Search</button>
      </form>

      <div className={styles.filters}>
        {cuisines.map(c => (
          <button
            key={c}
            className={`${styles.chip} ${cuisine === c ? styles.active : ''}`}
            onClick={() => setCuisine(c)}
          >{c}</button>
        ))}
      </div>

      {isBusy ? (
        <p className={styles.loading}>Loading restaurants...</p>
      ) : hasResults ? (
        <>
          {showSearchState && dishResults.length > 0 && (
            <section className={styles.resultsSection}>
              <div className={styles.sectionHeader}>
                <h2>Item matches</h2>
                <span>{dishResults.length}</span>
              </div>
              <div className={styles.dishGrid}>
                {dishResults.map(item => (
                  <Link key={`${item.restaurantId}-${item.id}`} to={`/restaurant/${item.restaurantId}`} className={styles.dishCard}>
                    <div className={styles.dishThumb} style={{ backgroundImage: item.imageUrl ? `url(${item.imageUrl})` : 'linear-gradient(135deg, #fff3e8, #ffe0c4)' }} />
                    <div className={styles.dishInfo}>
                      <h3>{highlightText(item.name, searchQuery)}</h3>
                      <p>{highlightText(item.restaurantName, searchQuery)}</p>
                      <div className={styles.dishMeta}>
                        <span>{highlightText(item.category, searchQuery)}</span>
                        <strong>₹{item.price}</strong>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className={styles.resultsSection}>
            <div className={styles.sectionHeader}>
              <h2>{showSearchState ? 'Restaurant matches' : 'Popular restaurants'}</h2>
              <span>{restaurants.length}</span>
            </div>
            <div className={styles.grid}>
              {restaurants.map(r => <RestaurantCard key={r.id} restaurant={r} highlightQuery={searchQuery} />)}
            </div>
          </section>
        </>
      ) : (
        <div className={styles.emptyState}>
          <h3>No matches found</h3>
          <p>Try a different restaurant name, dish name, or clear the search to browse all restaurants.</p>
        </div>
      )}
    </div>
  );
}

function queryDelay(value) {
  return value.trim() ? 250 : 0;
}

function highlightText(text, query) {
  const value = String(text || '');
  const needle = query.trim();
  if (!needle) return value;

  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = value.split(new RegExp(`(${escaped})`, 'ig'));
  return parts.map((part, index) => (
    part.toLowerCase() === needle.toLowerCase()
      ? <mark key={index} className={styles.highlightMark}>{part}</mark>
      : <React.Fragment key={index}>{part}</React.Fragment>
  ));
}
