import React, { useState } from 'react';
import styles from './NotificationBanner.module.css';

export default function NotificationBanner({ onAllow, onDismiss }) {
  const [loading, setLoading] = useState(false);

  const handleAllow = async () => {
    setLoading(true);
    await onAllow();
    setLoading(false);
  };

  return (
    <div className={styles.banner}>
      <span className={styles.icon}>🔔</span>
      <div className={styles.text}>
        <strong>Get notified about exclusive offers!</strong>
        <span>Allow notifications to receive promo codes and deals.</span>
      </div>
      <div className={styles.actions}>
        <button className={styles.allowBtn} onClick={handleAllow} disabled={loading}>
          {loading ? 'Enabling...' : 'Allow'}
        </button>
        <button className={styles.dismissBtn} onClick={onDismiss}>Not now</button>
      </div>
    </div>
  );
}
