// Firebase Cloud Messaging Service Worker
// Config will be passed via postMessage from the main app

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

let messaging = null;

// Listen for config from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FCM_CONFIG') {
    try {
      firebase.initializeApp(event.data.config);
      messaging = firebase.messaging();
      
      // Handle background messages
      messaging.onBackgroundMessage((payload) => {
        const notificationTitle = payload.notification?.title || 'BUWAD Alert';
        const notificationOptions = {
          body: payload.notification?.body || '',
          icon: '/vite.svg',
          badge: '/vite.svg',
          tag: payload.data?.tag || 'buwad-notification',
          vibrate: [200, 100, 200],
          data: payload.data || {},
          actions: [
            { action: 'open', title: 'Open Dashboard' },
            { action: 'dismiss', title: 'Dismiss' }
          ],
          requireInteraction: payload.data?.priority === 'high'
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
      });
    } catch (error) {
      console.error('FCM Service Worker initialization error:', error);
    }
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});