// Centralized API configuration
// Set REACT_APP_API_URL in your hosting environment (Netlify, Vercel, etc.).
// When running locally without a proxy on the frontend origin, fall back to the backend port.
const isLocalHost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const API_BASE_URL = process.env.REACT_APP_API_URL || (isLocalHost ? 'http://localhost:5000/api' : '/api');

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

