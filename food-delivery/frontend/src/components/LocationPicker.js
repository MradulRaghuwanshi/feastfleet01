import React, { useState } from 'react';
import styles from './LocationPicker.module.css';
import { buildGoogleMapsViewUrl, GOOGLE_MAPS_API_KEY } from '../utils/googleMaps';
import { DEFAULT_DELIVERY_LOCATION } from '../context/LocationContext';

async function geocode(query) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
    { headers: { 'Accept-Language': 'en' } }
  );
  return res.json();
}

async function reverseGeocode(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { 'Accept-Language': 'en' } }
  );
  const data = await res.json();
  const addr = data.address || {};
  return {
    lat: parseFloat(lat), lng: parseFloat(lng),
    address: [addr.house_number, addr.road, addr.suburb || addr.neighbourhood,
      addr.city || addr.town || addr.village, addr.state, addr.postcode
    ].filter(Boolean).join(', ') || data.display_name,
    city: addr.city || addr.town || addr.village || '',
    postcode: addr.postcode || ''
  };
}

export default function LocationPicker({ initialLocation, onConfirm, onClose }) {
  const [search, setSearch]     = useState('');
  const [results, setResults]   = useState([]);
  const [selected, setSelected] = useState(initialLocation || DEFAULT_DELIVERY_LOCATION);
  const [loading, setLoading]   = useState(false);
  const [manualLat, setManualLat] = useState(initialLocation?.lat || DEFAULT_DELIVERY_LOCATION.lat);
  const [manualLng, setManualLng] = useState(initialLocation?.lng || DEFAULT_DELIVERY_LOCATION.lng);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    const data = await geocode(search);
    setResults(data);
    setLoading(false);
  };

  const selectResult = async (r) => {
    setLoading(true);
    const loc = await reverseGeocode(r.lat, r.lon);
    setSelected(loc);
    setManualLat(r.lat);
    setManualLng(r.lon);
    setResults([]);
    setSearch('');
    setLoading(false);
  };

  const handleManualCoords = async () => {
    if (!manualLat || !manualLng) return;
    setLoading(true);
    const loc = await reverseGeocode(manualLat, manualLng);
    setSelected(loc);
    setLoading(false);
  };

  const mapUrl = selected
    ? buildGoogleMapsViewUrl({ lat: selected.lat, lng: selected.lng, zoom: 15 })
      || `https://www.openstreetmap.org/export/embed.html?bbox=${selected.lng - 0.01},${selected.lat - 0.01},${selected.lng + 0.01},${selected.lat + 0.01}&layer=mapnik&marker=${selected.lat},${selected.lng}`
    : buildGoogleMapsViewUrl({ lat: DEFAULT_DELIVERY_LOCATION.lat, lng: DEFAULT_DELIVERY_LOCATION.lng, zoom: 13 })
      || `https://www.openstreetmap.org/export/embed.html?bbox=${DEFAULT_DELIVERY_LOCATION.lng - 0.01},${DEFAULT_DELIVERY_LOCATION.lat - 0.01},${DEFAULT_DELIVERY_LOCATION.lng + 0.01},${DEFAULT_DELIVERY_LOCATION.lat + 0.01}&layer=mapnik&marker=${DEFAULT_DELIVERY_LOCATION.lat},${DEFAULT_DELIVERY_LOCATION.lng}`;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Set Delivery Location</h3>
          <button onClick={onClose} className={styles.closeBtn}>x</button>
        </div>

        {/* Search */}
        <div className={styles.searchRow}>
          <input
            type="text"
            placeholder="Search for an address..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} disabled={loading}>
            {loading ? '...' : 'Search'}
          </button>
        </div>

        {results.length > 0 && (
          <ul className={styles.results}>
            {results.map((r, i) => (
              <li key={i} onClick={() => selectResult(r)}>{r.display_name}</li>
            ))}
          </ul>
        )}

        {/* Map preview */}
        <div className={styles.mapWrapper}>
          {!GOOGLE_MAPS_API_KEY && (
            <div className={styles.mapNotice}>
              Set REACT_APP_GOOGLE_MAPS_API_KEY to enable Google Maps preview.
            </div>
          )}
          <iframe
            title="Location Map"
            src={mapUrl}
            className={styles.mapFrame}
            frameBorder="0"
            scrolling="no"
          />
        </div>

        {/* Manual coordinates */}
        <div className={styles.coordRow}>
          <input type="number" placeholder="Latitude" value={manualLat}
            onChange={e => setManualLat(e.target.value)} step="0.0001" />
          <input type="number" placeholder="Longitude" value={manualLng}
            onChange={e => setManualLng(e.target.value)} step="0.0001" />
          <button onClick={handleManualCoords} disabled={loading}>Set</button>
        </div>

        {/* Selected address */}
        {selected && (
          <div className={styles.addressPreview}>
            <span>&#128205;</span>
            <span>{selected.address}</span>
          </div>
        )}

        <button
          className={styles.confirmBtn}
          onClick={() => selected && onConfirm(selected)}
          disabled={!selected || loading}
        >
          Confirm Location
        </button>
      </div>
    </div>
  );
}
