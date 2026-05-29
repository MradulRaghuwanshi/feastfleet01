import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useVegMode } from '../../context/VegModeContext';
import RestaurantCard from '../../components/RestaurantCard';
import { getFavourites, toggleFavourite } from '../../firebase/services';
import { hasVegItems } from '../../utils/diet';
import styles from './Favourites.module.css';

export default function Favourites() {
  const { user } = useAuth();
  const { vegMode } = useVegMode();
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFavourites = () => {
    getFavourites(user.id).then(data => { setFavourites(data); setLoading(false); });
  };

  useEffect(() => { fetchFavourites(); }, [user.id]);

  const visibleFavourites = vegMode ? favourites.filter(restaurant => !Array.isArray(restaurant.menu) || hasVegItems(restaurant.menu || [])) : favourites;

  const handleToggle = async (restaurantId) => {
    await toggleFavourite(user.id, restaurantId, true);
    fetchFavourites();
  };

  return (
    <div className={styles.page}>
      <h2>❤️ My Favourites</h2>
      {loading ? <p className={styles.loading}>Loading...</p>
        : visibleFavourites.length === 0 ? (
          <div className={styles.empty}>
            <p>No favourites yet</p>
            <small>Tap the heart on any restaurant to save it here</small>
          </div>
        ) : (
          <div className={styles.grid}>
            {visibleFavourites.map(r => (
              <RestaurantCard key={r.id} restaurant={r}
                isFavourite={true}
                onToggleFavourite={() => handleToggle(r.id)} />
            ))}
          </div>
        )}
    </div>
  );
}
