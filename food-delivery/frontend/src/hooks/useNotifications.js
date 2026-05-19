import { useEffect, useState, useCallback } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingInstance } from '../firebase/config';

// ─── IMPORTANT ────────────────────────────────────────────────────────────────
// You need a VAPID key from Firebase Console:
// Project Settings → Cloud Messaging → Web Push certificates → Generate key pair
// Paste the key below:
const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY || 'YOUR_VAPID_KEY_HERE';

export function useNotifications(user) {
  const notificationsSupported = typeof window !== 'undefined' && 'Notification' in window;
  const [permission, setPermission] = useState(notificationsSupported ? Notification.permission : 'unsupported');
  const [inAppNotif, setInAppNotif] = useState(null); // for foreground toasts

  const registerToken = useCallback(async () => {
    if (!notificationsSupported || !user?.id) return;
    if (VAPID_KEY === 'YOUR_VAPID_KEY_HERE') return; // not configured yet

    try {
      const messaging = await getMessagingInstance();
      if (!messaging) return;

      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (!token) return;

      // Save token to backend
      await fetch('/api/notifications/save-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, token })
      });

      // Listen for foreground messages
      onMessage(messaging, (payload) => {
        const { title, body } = payload.notification || {};
        setInAppNotif({ title, body, data: payload.data, id: Date.now() });
        // Auto-dismiss after 6s
        setTimeout(() => setInAppNotif(null), 6000);
      });
    } catch (err) {
      console.warn('FCM registration failed:', err.message);
    }
  }, [notificationsSupported, user]);

  const requestPermission = async () => {
    if (!notificationsSupported) return 'unsupported';
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') await registerToken();
    return result;
  };

  useEffect(() => {
    if (permission === 'granted') registerToken();
  }, [permission, registerToken]);

  return { permission, requestPermission, inAppNotif, dismissNotif: () => setInAppNotif(null) };
}
