/**
 * Capacitor plugin wrappers with web fallbacks.
 * These allow the app to work in browser during development
 * and use native capabilities in the Android app.
 */

let CapApp = null;
let CapStatusBar = null;
let CapSplashScreen = null;

export async function initCapacitorPlugins() {
  if (typeof window === 'undefined') return;
  try {
    const { App } = await import('@capacitor/app');
    const { StatusBar } = await import('@capacitor/status-bar');
    const { SplashScreen } = await import('@capacitor/splash-screen');
    CapApp = App;
    CapStatusBar = StatusBar;
    CapSplashScreen = SplashScreen;
  } catch {
    // Plugins not available (running in browser)
  }
}

export function isNativePlatform() {
  if (typeof window === 'undefined') return false;
  // Capacitor adds a special property to window
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

export function addBackButtonListener(callback) {
  if (!CapApp) return () => {};
  const listener = CapApp.addListener('backButton', callback);
  return () => listener.remove();
}

export async function setStatusBarStyle(style) {
  if (!CapStatusBar) return;
  try {
    await CapStatusBar.setStyle({ style });
  } catch {}
}

export async function hideSplashScreen() {
  if (!CapSplashScreen) return;
  try {
    await CapSplashScreen.hide();
  } catch {}
}

export async function showSplashScreen() {
  if (!CapSplashScreen) return;
  try {
    await CapSplashScreen.show();
  } catch {}
}

