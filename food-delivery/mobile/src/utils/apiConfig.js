// Centralized API configuration for Next.js + Capacitor
// Use NEXT_PUBLIC_ prefix for env vars that need to be available client-side

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://feastfleet-api.onrender.com';

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

