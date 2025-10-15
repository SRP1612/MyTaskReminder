// sw.js - Service Worker for Task Reminder App

self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', event => {
  const task = event.data;
  console.log('Service Worker: Message received.', task);

  const now = new Date();
  const dueDate = new Date(task.due);
  const delay = dueDate.getTime() - now.getTime();

  if (delay > 0) {
    console.log(`Service Worker: Scheduling notification for "${task.name}" in ${delay / 1000} seconds.`);
    
    setTimeout(() => {
      self.registration.showNotification('Task Reminder!', {
        body: task.name,
        icon: 'https://placehold.co/192x192/blue/white?text=🔔',
        badge: 'https://placehold.co/96x96/blue/white?text=🔔',
        vibrate: [200, 100, 200],
        // Add a tag to make notifications unique
        tag: task.id.toString() 
      });
      console.log(`Service Worker: Notification shown for "${task.name}".`);
    }, delay);
  } else {
    console.log(`Service Worker: Task "${task.name}" is already past due. No notification scheduled.`);
  }
});

// --- NEW CODE ---
// This new event listener handles what happens when a notification is clicked.
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked.');

  // Close the notification pop-up
  event.notification.close();

  // This code searches for an already open app window and focuses it.
  // If no window is open, it opens a new one.
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        // Use the scope of the service worker to find the correct app
        if (client.url === self.registration.scope && 'focus' in client) {
          return client.focus();
        }
      }
      // If we didn't find an open window, open a new one
      if (clients.openWindow) {
        return clients.openWindow(self.registration.scope);
      }
    })
  );
});

