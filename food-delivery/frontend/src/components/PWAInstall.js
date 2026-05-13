import React, { useState, useEffect } from 'react';
import './PWAInstall.css';

const PWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check device type
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const Android = /Android/.test(navigator.userAgent);
    setIsIOS(iOS);
    setIsAndroid(Android);

    // Check if PWA is already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      console.log('PWA already installed, hiding install prompt');
      setIsInstallable(false);
      return;
    }

    // Listen for the beforeinstallprompt event (PWA)
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

  const handleAPKDownload = () => {
    // Trigger APK download for Android
    const link = document.createElement('a');
    link.href = '/app-NativeAppAI.apk';
    link.download = 'app-NativeAppAI.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log('APK download initiated');
  };

  const handleIOSInstall = () => {
    alert('To install FeastFleet:\n1. Tap the Share button\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add"');
  };

  // Return null - Install button is now in BottomNav
  return null;
};

export default PWAInstall;