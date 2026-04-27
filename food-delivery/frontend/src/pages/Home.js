import React, { useEffect, useState } from 'react';
import RestaurantCard from '../components/RestaurantCard';
import { getRestaurants } from '../firebase/services';
import styles from './Home.module.css';

const CUISINES = ['All', 'Italian', 'American', 'Japanese', 'Mexican', 'Healthy'];

export default function Home() {
  const [restaurants, setRestaurants] = useState([]);
  const [cuisine, setCuisine] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRestaurants(cuisine !== 'All' ? cuisine : '')
      .then(data => { setRestaurants(data); })
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false));
  }, [cuisine]);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1>Hungry? We've got you covered.</h1>
        <p>Order from the best restaurants near you</p>
      </div>

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
        <div className={styles.grid}>
          {restaurants.map(r => <RestaurantCard key={r.id} restaurant={r} />)}
        </div>
      )}
    </div>
  );
}
