// Firebase Service Worker for background push notifications
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyAjz7-JdOVMYXHEsb-BOQ0V3MoaGH2Qo_Y",
  authDomain:        "feastfleet-54b7e.firebaseapp.com",
  projectId:         "feastfleet-54b7e",
  storageBucket:     "feastfleet-54b7e.firebasestorage.app",
  messagingSenderId: "72016164039",
  appId:             "1:72016164039:web:f9ff1f82721b3c81c67ae2",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message:', payload);
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    tag: payload.data?.orderId || payload.data?.promoCode || 'feastfleet-notification',
    data: payload.data,
    actions: [
      { action: 'open', title: '🛒 Order Now' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  });
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    const data = event.notification.data || {};
    const target = data.orderId && data.audience === 'customer'
      ? `/order-confirmation/${data.orderId}`
      : '/';
    event.waitUntil(clients.openWindow(target));
  }
});
