import React, { useState, useEffect } from 'react';
import './PWAInstall.css';

const PWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if PWA is already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      console.log('PWA already installed, hiding install prompt');
      setIsInstallable(false);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      window.deferredPrompt = e;
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      console.log('App installed successfully');
      setIsInstallable(false);
      setDeferredPrompt(null);
      window.deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if service worker is registered
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration) {
          console.log('Service worker is registered');
        } else {
          console.warn('Service worker is not registered');
        }
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const handleIOSInstall = () => {
    alert('To install FeastFleet:\n1. Tap the Share button\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add"');
  };

  if (!isInstallable && !isIOS) return null;

  return (
    <div className="pwa-install-banner">
      <div className="pwa-install-content">
        <div className="pwa-install-icon">
          🍽️
        </div>
        <div className="pwa-install-text">
          <h3>Get FeastFleet App</h3>
          <p>Install for a better experience with offline access and notifications</p>
        </div>
        <button
          className="pwa-install-button"
          onClick={isIOS ? handleIOSInstall : handleInstallClick}
        >
          {isIOS ? 'How to Install' : 'Install App'}
        </button>
        <button
          className="pwa-install-close"
          onClick={() => setIsInstallable(false)}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default PWAInstall;