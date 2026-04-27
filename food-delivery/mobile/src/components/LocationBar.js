import React, { useState, Suspense } from 'react';
import { useDeliveryLocation } from '../context/LocationContext';
import LocationPicker from './LocationPicker';
import styles from './LocationBar.module.css';

export default function LocationBar() {
  const { location, detectLocation, setManualLocation } = useDeliveryLocation();
  const [showPicker, setShowPicker] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState('');

  const handleDetect = async () => {
    setDetecting(true);
    setError('');
    try {
      await detectLocation();
    } catch (e) {
      setError(e.message);
    } finally {
      setDetecting(false);
    }
  };

  const handleConfirm = (loc) => {
    setManualLocation(loc);
    setShowPicker(false);
  };

  return (
    <>
      <div className={styles.bar}>
        <span className={styles.pin}>📍</span>
        {location ? (
          <button className={styles.addressBtn} onClick={() => setShowPicker(true)} title="Change location">
            <span className={styles.label}>Deliver to</span>
            <span className={styles.address}>{location.city || location.address.split(',')[0]}</span>
            <span className={styles.chevron}>▾</span>
          </button>
        ) : (
          <div className={styles.actions}>
            <button className={styles.detectBtn} onClick={handleDetect} disabled={detecting}>
              {detecting ? 'Detecting...' : 'Detect location'}
            </button>
            <span className={styles.or}>or</span>
            <button className={styles.manualBtn} onClick={() => setShowPicker(true)}>Set manually</button>
          </div>
        )}
        {error && <span className={styles.error}>{error}</span>}
      </div>

      {showPicker && (
        <LocationPicker
          initialLocation={location}
          onConfirm={handleConfirm}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
