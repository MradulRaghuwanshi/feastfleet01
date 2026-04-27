import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import RestaurantCard from '../components/RestaurantCard';
import { getFavourites, toggleFavourite } from '../firebase/services';
import styles from './customer/Favourites.module.css';

export default function Favourites() {
  const { user } = useAuth();
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFavourites = () => {
    getFavourites(user.id).then(data => { setFavourites(data); setLoading(false); });
  };

  useEffect(() => { fetchFavourites(); }, [user.id]);

  const handleToggle = async (restaurantId) => {
    await toggleFavourite(user.id, restaurantId, true);
    fetchFavourites();
  };

  return (
    <div className={styles.page}>
      <h2>❤️ My Favourites</h2>
      {loading ? <p className={styles.loading}>Loading...</p>
        : favourites.length === 0 ? (
          <div className={styles.empty}>
            <p>No favourites yet</p>
            <small>Tap the heart on any restaurant to save it here</small>
          </div>
        ) : (
          <div className={styles.grid}>
            {favourites.map(r => (
              <RestaurantCard key={r.id} restaurant={r}
                isFavourite={true}
                onToggleFavourite={() => handleToggle(r.id)} />
            ))}
          </div>
        )}
    </div>
  );
}

