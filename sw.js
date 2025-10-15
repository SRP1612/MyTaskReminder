// sw.js - Service Worker for Task Reminder App

self.addEventListener('install', event => {
  // This event is fired when the service worker is first installed.
  console.log('Service Worker: Installing...');
  // self.skipWaiting() forces the waiting service worker to become the active service worker.
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // This event is fired when the service worker is activated.
  console.log('Service Worker: Activating...');
  // event.waitUntil(self.clients.claim()) ensures that the SW takes control of all open clients.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', event => {
  // This event listener fires when the main page (index.html) sends a message.
  const task = event.data;
  console.log('Service Worker: Message received.', task);

  const now = new Date();
  const dueDate = new Date(task.due);
  const delay = dueDate.getTime() - now.getTime();

  // We only schedule a notification if the due date is in the future.
  if (delay > 0) {
    console.log(`Service Worker: Scheduling notification for "${task.name}" in ${delay / 1000} seconds.`);
    
    setTimeout(() => {
      // When the timer is up, show the notification.
      // self.registration.showNotification is the API for displaying system notifications.
      self.registration.showNotification('Task Reminder!', {
        body: task.name,
        icon: 'https://placehold.co/192x192/blue/white?text=🔔', // A simple bell icon
        badge: 'https://placehold.co/96x96/blue/white?text=🔔', // Icon for the notification tray on Android
        vibrate: [200, 100, 200] // Vibrate pattern
      });
      console.log(`Service Worker: Notification shown for "${task.name}".`);
    }, delay);
  } else {
    console.log(`Service Worker: Task "${task.name}" is already past due. No notification scheduled.`);
  }
});
