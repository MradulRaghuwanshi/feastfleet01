import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useVegMode } from '../../context/VegModeContext';
import RestaurantCard from '../../components/RestaurantCard';
import { FlameIcon, SparkleIcon, TagIcon, TruckIcon } from '../../components/Icons';
import { useCart } from '../../context/CartContext';
import { getRestaurants, getActivePromos, getRestaurant, getCachedRestaurantsSnapshot, searchRestaurants, getFavourites, toggleFavourite, updateUser } from '../../firebase/services';
import { hasVegItems, isVegItem } from '../../utils/diet';
import { withMenuItemImage } from '../../utils/menuImages';
import styles from './Home.module.css';

const DEFAULT_CUISINES = ['All', 'Pure Veg', 'Pizza', 'Biryani', 'Rolls', 'Burger', 'Chinese', 'Healthy', 'Desserts'];
const OFFER_BG = ['#ff6b35', '#0f766e', '#7c3aed', '#dc2626', '#2563eb', '#ca8a04'];
const TRENDING_SEARCHES = ['Paneer roll', 'Cold coffee', 'Veg thali', 'Maggi', 'Fresh juice'];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { vegMode } = useVegMode();
  const { totalItems, subtotal } = useCart();
  const [restaurants, setRestaurants] = useState(() => getCachedRestaurantsSnapshot('') || []);
  const [loading, setLoading] = useState(() => !(getCachedRestaurantsSnapshot('') || []).length);
  const [promos, setPromos] = useState([]);
  const [copied, setCopied] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState({ restaurants: [], dishes: [] });
  const [searchError, setSearchError] = useState('');
  const [menuIndex, setMenuIndex] = useState([]);
  const [indexLoading, setIndexLoading] = useState(false);
  const [activeCuisine, setActiveCuisine] = useState('All');
  const [favouriteIds, setFavouriteIds] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ff_recent_searches') || '[]'); }
    catch { return []; }
  });

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
    if (!user?.id || user.role !== 'customer') {
      setFavouriteIds([]);
      setSavedItems([]);
      return undefined;
    }
    let alive = true;
    getFavourites(user.id)
      .then(data => { if (alive) setFavouriteIds((data || []).map(item => item.id)); })
      .catch(() => { if (alive) setFavouriteIds([]); });
    setSavedItems(Array.isArray(user.savedItems) ? user.savedItems : []);
    return () => { alive = false; };
  }, [user?.id, user?.role]);

  const handleToggleFavourite = async (restaurantId) => {
    if (!user?.id) {
      navigate('/login');
      return;
    }
    const isFav = favouriteIds.includes(restaurantId);
    await toggleFavourite(user.id, restaurantId, isFav);
    setFavouriteIds(prev => isFav ? prev.filter(id => id !== restaurantId) : [...prev, restaurantId]);
  };

  const handleToggleSavedItem = async (item) => {
    if (!user?.id) {
      navigate('/login');
      return;
    }
    const current = Array.isArray(savedItems) ? savedItems : [];
    const exists = current.some(savedItem => savedItem?.id === item.id && savedItem?.restaurantId === item.restaurantId);
    const next = exists
      ? current.filter(savedItem => !(savedItem?.id === item.id && savedItem?.restaurantId === item.restaurantId))
      : [{ id: item.id, restaurantId: item.restaurantId, restaurantName: item.restaurantName, name: item.name, price: item.price, image: item.image, category: item.category, addedAt: new Date().toISOString() }, ...current];
    setSavedItems(next);
    await updateUser(user.id, { savedItems: next });
  };

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query || searchLoading || searchError) return undefined;
    const timer = setTimeout(() => {
      setRecentSearches(prev => {
        const next = [query, ...prev.filter(item => item.toLowerCase() !== query.toLowerCase())].slice(0, 5);
        localStorage.setItem('ff_recent_searches', JSON.stringify(next));
        return next;
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [searchError, searchLoading, searchQuery]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query || menuIndex.length || indexLoading || !restaurants.length) return undefined;

    let alive = true;
    const timer = setTimeout(() => {
      setIndexLoading(true);
      Promise.allSettled(restaurants.map(restaurant => getRestaurant(restaurant.id)))
        .then(results => {
          if (!alive) return;
          const index = results
            .map(result => result.status === 'fulfilled' ? result.value : null)
            .filter(Boolean)
            .flatMap(restaurant => (restaurant.menu || []).map(item => ({
              ...withMenuItemImage(item),
              restaurantId: restaurant.id,
              restaurantName: restaurant.name,
              restaurantCuisine: restaurant.cuisine,
              restaurantHasOwnDelivery: restaurant.hasOwnDelivery,
              restaurantCanOrder: restaurant.isAcceptingOrdersNow ?? restaurant.isOpen,
              restaurantDeliveryTime: restaurant.deliveryTime,
            })));
          setMenuIndex(index);
        })
        .finally(() => {
          if (alive) setIndexLoading(false);
        });
    }, 150);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [indexLoading, menuIndex.length, restaurants, searchQuery]);

  const localSearchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return { restaurants: [], dishes: [] };

    const terms = query.split(/\s+/).filter(Boolean);
    const matches = (value) => {
      const text = String(value || '').toLowerCase();
      return terms.every(term => text.includes(term));
    };
    const score = (text) => {
      const normalized = String(text || '').toLowerCase();
      if (normalized === query) return 0;
      if (normalized.startsWith(query)) return 1;
      return 2;
    };

    const foundRestaurants = restaurants
      .filter(r => matches(`${r.name || ''} ${r.cuisine || ''} ${(r.tags || []).join(' ')}`))
      .sort((a, b) => score(a.name) - score(b.name))
      .slice(0, 8);

    const foundDishes = menuIndex
      .filter(item => matches(`${item.name || ''} ${item.description || ''} ${item.category || ''} ${item.restaurantName || ''}`))
      .sort((a, b) => score(a.name) - score(b.name))
      .slice(0, 18);

    return { restaurants: foundRestaurants, dishes: foundDishes };
  }, [menuIndex, restaurants, searchQuery]);

  useEffect(() => {
    const query = searchQuery.trim();

    if (!query) {
      setSearchResults({ restaurants: [], dishes: [] });
      setSearchLoading(false);
      setSearchError('');
      return undefined;
    }

    if (menuIndex.length) {
      setSearchResults(localSearchResults);
      setSearchLoading(indexLoading);
      setSearchError('');
      return undefined;
    }

    let alive = true;
    setSearchLoading(true);
    setSearchError('');
    const timer = setTimeout(() => {
      searchRestaurants(query)
        .then(data => {
          if (!alive) return;
          setSearchResults({
            restaurants: data?.restaurants || [],
            dishes: (data?.dishes || []).map(withMenuItemImage),
          });
        })
        .catch(error => {
          if (!alive) return;
          setSearchResults(localSearchResults);
          setSearchError(error?.message || 'Search failed');
        })
        .finally(() => {
          if (alive) setSearchLoading(false);
        });
    }, 120);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [indexLoading, localSearchResults, menuIndex.length, searchQuery]);

  const cuisineOptions = useMemo(() => {
    const detected = restaurants
      .flatMap(r => String(r.cuisine || '').split(','))
      .map(c => c.trim())
      .filter(Boolean);
    return ['All', ...Array.from(new Set([...detected, ...DEFAULT_CUISINES.filter(c => c !== 'All')])).slice(0, 10)];
  }, [restaurants]);

  const vegRestaurantIds = useMemo(() => new Set(menuIndex.filter(isVegItem).map(item => item.restaurantId)), [menuIndex]);
  const pureVegMode = vegMode || activeCuisine === 'Pure Veg';

  const filteredRestaurants = useMemo(() => {
    const visibleRestaurants = pureVegMode
      ? restaurants.filter(r => hasVegItems(r.menu || []) || vegRestaurantIds.has(r.id))
      : restaurants;

    if (activeCuisine === 'All' || activeCuisine === 'Pure Veg') return visibleRestaurants;

    return visibleRestaurants.filter(r => {
      const haystack = `${r.cuisine || ''} ${(r.tags || []).join(' ')}`.toLowerCase();
      return haystack.includes(activeCuisine.toLowerCase());
    });
  }, [activeCuisine, pureVegMode, restaurants, vegRestaurantIds]);

  const trendingDishes = useMemo(() => {
    return restaurants
      .flatMap(r => (r.menu || []).map(item => ({ ...withMenuItemImage(item), restaurantId: r.id, restaurantName: r.name })))
      .filter(item => !pureVegMode || isVegItem(item))
      .filter(item => item.isPopular || Number(item.rating || 0) >= 4)
      .slice(0, 8);
  }, [pureVegMode, restaurants]);

  const ownDelivery = filteredRestaurants.filter(r => r.hasOwnDelivery);
  const platformDelivery = filteredRestaurants.filter(r => !r.hasOwnDelivery);
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
      <label className={styles.searchLabel} htmlFor="restaurant-search">What are you craving right now?</label>
      <div className={styles.searchBar}>
        <span className={styles.searchGlyph}>⌕</span>
        <input
          id="restaurant-search"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search biryani, rolls, juice, restaurant names"
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
      {!searchQuery.trim() && (
        <div className={styles.searchChips}>
          {[...recentSearches, ...TRENDING_SEARCHES].slice(0, 7).map(term => (
            <button key={term} type="button" onClick={() => setSearchQuery(term)}>{term}</button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.page}>
      <section
        className={styles.heroContest}
        aria-labelledby="contest-hero-title"
        style={{ '--hero-contest-image': `url(${process.env.PUBLIC_URL}/images/ankit-first.png)` }}
      >
        <div className={styles.heroContestText}>
          <span className={styles.heroContestBadge}><SparkleIcon /> Live price challenge</span>
          <h1 id="contest-hero-title">Beat the Fleet. Win FeastCoins.</h1>
          <p>Find the same delivered cart cheaper on another app? Send your proof, pass review, and get rewarded with FeastCoins.</p>
          <div className={styles.heroContestStats}>
            <span><FlameIcon /> Up to 100% order value</span>
            <span><TruckIcon /> Manual verification</span>
            <span><TagIcon /> Official claim form</span>
          </div>
          <div className={styles.heroContestActions}>
            <Link to="/contest" className={styles.heroContestPrimary}>View Contest Details</Link>
            <a href="https://forms.gle/QrPFo1WhiDB91ak89" target="_blank" rel="noreferrer" className={styles.heroContestSecondary}>Register / Claim</a>
          </div>
        </div>
        <div className={styles.heroContestVisual} aria-hidden="true">
          <div className={styles.heroContestPanel}>
            <div className={styles.heroPanelTop}>
              <span>Contest reward</span>
              <strong>100%</strong>
            </div>
            <p>FeastCoins back on approved same-cart claims.</p>
            <div className={styles.priceBattle}>
              <div className={styles.priceCard}>
                <span>Other app</span>
                <strong>Rs 499</strong>
              </div>
              <div className={styles.versusBadge}>VS</div>
              <div className={`${styles.priceCard} ${styles.winnerCard}`}>
                <span>FeastFleet</span>
                <strong>Rs 459</strong>
              </div>
            </div>
            <div className={styles.heroContestNote}>Compare, upload proof, claim FeastCoins.</div>
          </div>
        </div>
      </section>
      {searchBox}

      {searchQuery.trim() ? (
        <SearchResults
          restaurants={searchResults.restaurants}
          dishes={searchResults.dishes}
          loading={searchLoading}
          savedItems={savedItems}
          onToggleSavedItem={handleToggleSavedItem}
          vegOnly={pureVegMode}
        />
      ) : (
        <>
          <section className={styles.categoryRail} aria-label="Food categories">
            {cuisineOptions.map(cuisine => (
              <button
                key={cuisine}
                type="button"
                className={`${styles.categoryChip} ${activeCuisine === cuisine ? styles.categoryActive : ''}`}
                onClick={() => setActiveCuisine(cuisine)}
              >
                <span>{cuisine === 'All' ? '✦' : cuisine.slice(0, 1)}</span>
                {cuisine}
              </button>
            ))}
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

          {trendingDishes.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2><FlameIcon /> Trending dishes</h2>
                <span>Popular near you</span>
              </div>
              <div className={styles.trendingRow}>
                {trendingDishes.map(item => (
                  <Link
                    key={`${item.restaurantId}:${item.id}`}
                    to={`/restaurant/${item.restaurantId}`}
                    className={styles.dishCard}
                  >
                    {item.image && <img src={item.image} alt={item.name} loading="lazy" decoding="async" />}
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.restaurantName}</span>
                      <b>Rs {Number(item.price || 0).toFixed(0)}</b>
                    </div>
                  </Link>
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
                      <RestaurantCard
                        key={r.id}
                        restaurant={r}
                        priority={index < 2}
                        isFavourite={favouriteIds.includes(r.id)}
                        onToggleFavourite={() => handleToggleFavourite(r.id)}
                      />
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
                      <RestaurantCard
                        key={r.id}
                        restaurant={r}
                        priority={ownDelivery.length === 0 && index < 2}
                        isFavourite={favouriteIds.includes(r.id)}
                        onToggleFavourite={() => handleToggleFavourite(r.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {filteredRestaurants.length === 0 && (
                <div className={styles.noResults}>No restaurants found.</div>
              )}
            </>
          )}
        </>
      )}

      {totalItems > 0 && (
        <div className={styles.quickCart}>
          <div>
            <strong>{totalItems} item{totalItems === 1 ? '' : 's'} in cart</strong>
            <span>Rs {Number(subtotal || 0).toFixed(0)}</span>
          </div>
          <button type="button" onClick={() => navigate('/checkout')}>Checkout</button>
        </div>
      )}
    </div>
  );
}

function SearchResults({ restaurants, dishes, loading, savedItems, onToggleSavedItem, vegOnly }) {
  const { cart, addItem, removeItem } = useCart();
  const visibleRestaurants = vegOnly ? restaurants.filter(r => !Array.isArray(r.menu) || hasVegItems(r.menu || [])) : restaurants;
  const visibleDishes = vegOnly ? dishes.filter(isVegItem) : dishes;

  if (loading) {
    return <div className={styles.searchEmpty}>Searching restaurants and menu items...</div>;
  }

  if (!visibleRestaurants.length && !visibleDishes.length) {
    return <div className={styles.searchEmpty}>No matches found. Try a restaurant name, item or category.</div>;
  }

  return (
    <div className={styles.searchResults}>
      {visibleRestaurants.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Restaurants</h2>
            <span>{visibleRestaurants.length} match{visibleRestaurants.length === 1 ? '' : 'es'}</span>
          </div>
          <div className={styles.grid}>
            {visibleRestaurants.map((r, index) => (
              <RestaurantCard
                key={r.id}
                restaurant={r}
                priority={index < 2}
                isFavourite={favouriteIds.includes(r.id)}
                onToggleFavourite={() => handleToggleFavourite(r.id)}
              />
            ))}
          </div>
        </section>
      )}

      {visibleDishes.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Items and Categories</h2>
            <span>{visibleDishes.length} match{visibleDishes.length === 1 ? '' : 'es'}</span>
          </div>
          <div className={styles.searchItemList}>
            {visibleDishes.map(item => {
              const qty = cart.restaurantId === item.restaurantId
                ? cart.items.find(i => i.id === item.id)?.quantity || 0
                : 0;
              const canOrder = item.restaurantCanOrder !== false && item.available !== false;
              const handleAdd = (event) => {
                event.preventDefault();
                event.stopPropagation();
                addItem(item, item.restaurantId, item.restaurantName, item.restaurantHasOwnDelivery);
              };
              const handleRemove = (event) => {
                event.preventDefault();
                event.stopPropagation();
                removeItem(item.id);
              };

              return (
                <Link key={`${item.restaurantId}:${item.id}`} to={`/restaurant/${item.restaurantId}`} className={styles.searchItemCard}>
                <img src={item.image} alt={item.name} loading="lazy" decoding="async" />
                <div className={styles.searchItemMeta}>
                  <strong>{item.name}</strong>
                  <span>{item.category || 'Menu item'} · {item.restaurantName}</span>
                </div>
                <div className={styles.searchItemAction}>
                  <div className={styles.searchItemPrice}>Rs {Number(item.price || 0).toFixed(0)}</div>
                  <button
                    type="button"
                    className={`${styles.searchSaveBtn} ${savedItems.some(savedItem => savedItem?.id === item.id && savedItem?.restaurantId === item.restaurantId) ? styles.searchSaveActive : ''}`}
                    onClick={(event) => { event.preventDefault(); event.stopPropagation(); onToggleSavedItem(item); }}
                    title="Save to wishlist"
                  >
                    ♡
                  </button>
                  {canOrder ? (
                    qty === 0 ? (
                      <button type="button" onClick={handleAdd}>Add</button>
                    ) : (
                      <div className={styles.searchQty}>
                        <button type="button" onClick={handleRemove} aria-label={`Remove ${item.name}`}>-</button>
                        <span>{qty}</span>
                        <button type="button" onClick={handleAdd} aria-label={`Add ${item.name}`}>+</button>
                      </div>
                    )
                  ) : (
                    <span>Unavailable</span>
                  )}
                </div>
              </Link>
              );
            })}
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
