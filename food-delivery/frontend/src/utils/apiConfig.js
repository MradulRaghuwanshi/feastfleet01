// Centralized API configuration
// Set REACT_APP_API_URL in your hosting environment (Netlify, Vercel, etc.)
// If not set, falls back to relative /api (works with local proxy or Netlify redirects)
export const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

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

