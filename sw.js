// sw.js - Service Worker for Task Reminder App

const pendingTasks = new Map();

self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(self.clients.claim());
});

const scheduleNotification = (task) => {
  const now = new Date();
  const dueDate = new Date(task.due);
  const delay = dueDate.getTime() - now.getTime();

  if (delay > 0) {
    console.log(`Service Worker: Scheduling notification for "${task.name}" in ${delay / 1000} seconds.`);
    
    setTimeout(() => {
      self.registration.showNotification('Task Reminder!', {
        body: task.name,
        icon: './icon-192.svg',
        badge: './icon-192.svg',
        vibrate: [500, 200, 500, 200, 500],
        silent: false,
        tag: task.id.toString(),
        // --- NEW LINE ---
        // This makes the notification persistent until the user interacts with it.
        requireInteraction: true,
        actions: [
          { action: 'snooze', title: 'Snooze 5 min' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      });
      console.log(`Service Worker: Notification shown for "${task.name}".`);
      pendingTasks.delete(task.id); // Remove after showing
    }, delay);
  } else {
    console.log(`Service Worker: Task "${task.name}" is already past due. No notification scheduled.`);
  }
};

self.addEventListener('message', event => {
  const task = event.data;
  console.log('Service Worker: Message received.', task);
  pendingTasks.set(task.id, task);
  scheduleNotification(task);
});

self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked.', event.action);

  const taskId = parseInt(event.notification.tag);

  if (event.action === 'snooze') {
    const task = pendingTasks.get(taskId);
    if (task) {
      // Update due time to 5 minutes from now
      task.due = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      scheduleNotification(task);
      console.log(`Service Worker: Snoozed "${task.name}" for 5 minutes.`);
    }
  } else {
    // Default or dismiss: close and focus
    event.notification.close();
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === self.registration.scope && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(self.registration.scope);
      }
    })
  );
});

