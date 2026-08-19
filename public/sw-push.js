// Custom Service Worker logic for Web Push Protocol & Offline Notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'Loady - Prepaid Alert';
    const options = {
      body: payload.body || 'Your prepaid promo status has updated.',
      icon: payload.icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: payload.tag || 'loady-promo-threshold',
      renotify: true,
      data: payload.data || { url: '/' },
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open_app', title: 'Open Loady' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
