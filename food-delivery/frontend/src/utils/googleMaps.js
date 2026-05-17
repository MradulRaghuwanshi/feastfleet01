export const GOOGLE_MAPS_API_KEY =
  process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
  process.env.REACT_APP_GOOGLE_MAPS_KEY ||
  (typeof window !== 'undefined' && window.__GOOGLE_MAPS_API_KEY__) ||
  '';

const hasKey = () => Boolean(GOOGLE_MAPS_API_KEY);

const toFixedCoord = (value) => Number(value || 0).toFixed(6);

export function buildGoogleMapsViewUrl({ lat, lng, zoom = 14 }) {
  if (!hasKey()) return '';
  const centerLat = toFixedCoord(lat);
  const centerLng = toFixedCoord(lng);
  return `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&center=${centerLat},${centerLng}&zoom=${zoom}&maptype=roadmap`;
}

export function buildGoogleMapsPlaceUrl({ lat, lng, zoom = 14 }) {
  if (!hasKey()) return '';
  const centerLat = toFixedCoord(lat);
  const centerLng = toFixedCoord(lng);
  return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&q=${centerLat},${centerLng}&zoom=${zoom}`;
}
