import React, { useEffect, useState, useRef } from 'react';
import { pushAgentLocation, listenToAgentLocation } from '../firebase/services';
import styles from './LiveTrackingMap.module.css';

const STATUS_LABELS = {
  Placed: 'Order Placed',
  Confirmed: 'Order Confirmed',
  Preparing: 'Preparing Your Food',
  'Out for Delivery': 'Out for Delivery',
  Delivered: 'Delivered',
};

const STATUS_COLORS = {
  Placed: '#3b82f6',
  Confirmed: '#f59e0b',
  Preparing: '#8b5cf6',
  'Out for Delivery': '#10b981',
  Delivered: '#059669',
};

export default function LiveTrackingMap({ orderId, role, agentId, onAgentLocationUpdate }) {
  const [tracking, setTracking]   = useState(null);
  const [agentPos, setAgentPos]   = useState(null);
  const watchRef                  = useRef(null);

  // Fetch tracking data from backend
  useEffect(() => {
    if (!orderId) return;
    const fetchTracking = () => {
      fetch(`/api/tracking/${orderId}`)
        .then(r => r.json())
        .then(data => { setTracking(data); })
        .catch(() => {});
    };
    fetchTracking();
    const interval = setInterval(fetchTracking, 8000);
    return () => clearInterval(interval);
  }, [orderId]);

  // Subscribe to agent GPS from Firebase Realtime DB
  useEffect(() => {
    if (!tracking?.agent?.id) return;
    const unsub = listenToAgentLocation(tracking.agent.id, loc => {
      setAgentPos({ lat: loc.lat, lng: loc.lng });
    });
    return unsub;
  }, [tracking?.agent?.id]);

  // Delivery agent: push live GPS
  useEffect(() => {
    if (role !== 'delivery' || !agentId) return;
    const push = pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setAgentPos({ lat, lng });
      pushAgentLocation(agentId, lat, lng).catch(() => {});
      if (onAgentLocationUpdate) onAgentLocationUpdate({ lat, lng });
    };
    if (navigator.geolocation) {
      watchRef.current = navigator.geolocation.watchPosition(push, () => {}, {
        enableHighAccuracy: true, maximumAge: 4000, timeout: 8000
      });
    }
    return () => {
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [role, agentId, onAgentLocationUpdate]);

  if (!tracking) return (
    <div className={styles.loading}>
      <div className={styles.spinner} />
      <p>Loading tracking info...</p>
    </div>
  );

  const { restaurant, customer, agent, status } = tracking;
  const statusColor = STATUS_COLORS[status] || '#ff6b35';

  // Build OpenStreetMap iframe URL centered between restaurant and customer
  const centerLat = ((restaurant?.lat || 19.076) + (customer?.lat || 19.076)) / 2;
  const centerLng = ((restaurant?.lng || 72.877) + (customer?.lng || 72.877)) / 2;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${centerLng - 0.02},${centerLat - 0.02},${centerLng + 0.02},${centerLat + 0.02}&layer=mapnik&marker=${centerLat},${centerLng}`;

  return (
    <div className={styles.wrapper}>
      {/* Status bar */}
      <div className={styles.statusBar} style={{ background: statusColor }}>
        <span className={styles.statusDot} />
        <span>{STATUS_LABELS[status] || status}</span>
      </div>

      {/* Map iframe */}
      <div className={styles.mapWrapper}>
        <iframe
          title="Order Tracking Map"
          src={mapUrl}
          className={styles.mapFrame}
          frameBorder="0"
          scrolling="no"
        />
        {/* Overlay pins */}
        <div className={styles.legend}>
          <span className={styles.pin} style={{ background: '#ff6b35' }}>R</span>
          <span className={styles.pinLabel}>{restaurant?.name}</span>
          <span className={styles.pin} style={{ background: '#3b82f6', marginLeft: 12 }}>C</span>
          <span className={styles.pinLabel}>{customer?.name}</span>
          {agent?.name && (
            <>
              <span className={styles.pin} style={{ background: '#10b981', marginLeft: 12 }}>D</span>
              <span className={styles.pinLabel}>{agent.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className={styles.infoRow}>
        <div className={styles.infoCard}>
          <div className={styles.infoIcon} style={{ background: '#fff5f0', color: '#ff6b35' }}>R</div>
          <div>
            <p className={styles.infoLabel}>Restaurant</p>
            <p className={styles.infoVal}>{restaurant?.name}</p>
            <p className={styles.infoAddr}>{restaurant?.address}</p>
          </div>
        </div>
        {agent?.name && (
          <div className={styles.infoCard}>
            <div className={styles.infoIcon} style={{ background: '#f0fdf4', color: '#10b981' }}>D</div>
            <div>
              <p className={styles.infoLabel}>Delivery Partner</p>
              <p className={styles.infoVal}>{agent.name}</p>
              <p className={styles.infoAddr}>
                {agentPos?.lat
                  ? `Live: ${agentPos.lat.toFixed(4)}, ${agentPos.lng.toFixed(4)}`
                  : 'Locating...'}
              </p>
            </div>
          </div>
        )}
        <div className={styles.infoCard}>
          <div className={styles.infoIcon} style={{ background: '#eff6ff', color: '#3b82f6' }}>C</div>
          <div>
            <p className={styles.infoLabel}>Deliver to</p>
            <p className={styles.infoVal}>{customer?.name}</p>
            <p className={styles.infoAddr}>{customer?.address}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
