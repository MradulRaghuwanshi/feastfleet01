/**
 * Version information for FeastFleet
 * Updated with each release
 */

export const APP_VERSION = '1.1.0';
export const BUILD_DATE = new Date().toISOString().split('T')[0];
export const ENVIRONMENT = process.env.NODE_ENV || 'development';

export const getVersionInfo = () => ({
  version: APP_VERSION,
  buildDate: BUILD_DATE,
  environment: ENVIRONMENT,
});

// Log version info in console
if (typeof window !== 'undefined') {
  console.log(`%c🚀 FeastFleet v${APP_VERSION}`, 'color: #ff6b35; font-weight: bold; font-size: 14px;');
  console.log(`%c📅 Build: ${BUILD_DATE} | 🔧 ${ENVIRONMENT}`, 'color: #666; font-size: 12px;');
}
