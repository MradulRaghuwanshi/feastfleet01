import React from 'react';
import styles from './About.module.css';

export default function About() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.kicker}>About FeastFleet</p>
        <h1>Fresh food, simple ordering, and quick local delivery.</h1>
        <p>
          FeastFleet connects customers with nearby restaurants, keeps orders easy to track,
          and rewards every bite with FeastCoins.
        </p>
      </section>

      <section className={styles.contactBand}>
        <div>
          <span>Contact No.</span>
          <a href="tel:9238023903">9238023903</a>
        </div>
        <div>
          <span>Email ID</span>
          <a href="mailto:support@feastfleet.in">support@feastfleet.in</a>
        </div>
      </section>
    </main>
  );
}
