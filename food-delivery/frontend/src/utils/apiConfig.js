// Centralized API configuration.
// Supports either:
// - REACT_APP_API_URL=https://host (will become https://host/api)
// - REACT_APP_API_URL=https://host/api (kept as-is)
const isLocalHost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const PRODUCTION_API_URL = 'https://feastfleet-backend-0ozz.onrender.com/api';

function withApiSuffix(url) {
  const trimmed = String(url || '').replace(/\/$/, '');
  if (!trimmed) return '';
  if (/\/api$/i.test(trimmed)) return trimmed;
  return `${trimmed}/api`;
}

const envBase = withApiSuffix(process.env.REACT_APP_API_URL);
export const API_BASE_URL = envBase || (isLocalHost ? 'http://localhost:5000/api' : PRODUCTION_API_URL);

/**
 * Build a full API URL from a path.
 * @param {string} path - e.g. 'restaurants', 'orders/123'
 * @returns {string} Full URL
 */
export function apiUrl(path) {
  const base = API_BASE_URL.replace(/\/$/, '');
  const p = path.replace(/^\//, '');
  return `${base}/${p}`;
}

