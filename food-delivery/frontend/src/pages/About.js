import React from 'react';
import styles from './About.module.css';

export default function About() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.kicker}>Contact Us</p>
        <h1>Need help, want to order, or have a question?</h1>
        <p>
          Reach FeastFleet directly on call or WhatsApp for support, order help, and quick assistance.
        </p>
      </section>

      <section className={styles.contactBand}>
        <div>
          <span>Call Us</span>
          <a href="tel:9238023903">9238023903</a>
        </div>
        <div>
          <span>WhatsApp</span>
          <a href="https://wa.me/919238023903?text=Hi%20FeastFleet%2C%20I%20need%20help%20with%20my%20order" target="_blank" rel="noreferrer">Chat on WhatsApp</a>
        </div>
      </section>
    </main>
  );
}
