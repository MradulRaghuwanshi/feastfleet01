import React, { useEffect, useState } from 'react';
import styles from './NotificationToast.module.css';

export default function NotificationToast({ notif, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notif) {
      setVisible(true);
      const t = setTimeout(() => { setVisible(false); setTimeout(onDismiss, 300); }, 5500);
      return () => clearTimeout(t);
    }
  }, [notif, onDismiss]);

  if (!notif) return null;

  return (
    <div className={`${styles.toast} ${visible ? styles.show : styles.hide}`}>
      <div className={styles.icon}>🏷️</div>
      <div className={styles.content}>
        <p className={styles.title}>{notif.title}</p>
        <p className={styles.body}>{notif.body}</p>
        {notif.data?.promoCode && (
          <button className={styles.copyBtn}
            onClick={() => { navigator.clipboard.writeText(notif.data.promoCode); }}>
            Copy code: {notif.data.promoCode}
          </button>
        )}
      </div>
      <button className={styles.close} onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}>✕</button>
    </div>
  );
}
