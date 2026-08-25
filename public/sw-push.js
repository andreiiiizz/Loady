// ==============================================================================
// LOADY UNIFIED SERVICE WORKER: Workbox Caching + Firebase Cloud Messaging (FCM)
// Merged into a single service worker registration to prevent scope conflicts.
// ==============================================================================

// 1. Import Firebase Compat scripts for Web Worker / Service Worker context
try {
  importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

  if (typeof firebase !== 'undefined') {
    firebase.initializeApp({
      apiKey: "AIzaSyDummyApiKeyReplaceWithYourOwnKey123",
      authDomain: "loady-ph.firebaseapp.com",
      projectId: "loady-ph",
      storageBucket: "loady-ph.appspot.com",
      messagingSenderId: "109283746501",
      appId: "1:109283746501:web:a1b2c3d4e5f6g7h8i9j0k1"
    });

    const messaging = firebase.messaging();

    // FCM Background Message Handler
    messaging.onBackgroundMessage((payload) => {
      const notificationTitle = payload.notification?.title || payload.data?.title || 'Loady - Prepaid Alert';
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'Your prepaid promo status has updated.',
        icon: payload.notification?.icon || payload.data?.icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: payload.data?.tag || 'loady-promo-alert',
        renotify: true,
        data: payload.data || { url: '/' },
        vibrate: [200, 100, 200],
        actions: [
          { action: 'open_app', title: 'Open Loady' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      };

      return self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
} catch (swErr) {
  console.warn('Firebase Messaging in Service Worker failed to initialize:', swErr);
}

// 2. Generic Web Push Fallback Listener
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || payload.notification?.title || 'Loady Alert';
    const options = {
      body: payload.body || payload.notification?.body || 'Prepaid update received.',
      icon: payload.icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: payload.tag || 'loady-push-generic',
      renotify: true,
      data: payload.data || { url: '/' },
      vibrate: [200, 100, 200]
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Loady Alert', {
        body: text,
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      })
    );
  }
});

// 3. Notification Click & App Navigation Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
