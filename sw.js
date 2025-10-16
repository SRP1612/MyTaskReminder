// sw.js - Service Worker for Task Reminder App

const pendingTasks = new Map();
const scheduleTimers = new Map();

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
    // clear any existing timer for this task
    if (scheduleTimers.has(task.id)) {
      clearTimeout(scheduleTimers.get(task.id));
      scheduleTimers.delete(task.id);
    }

    const timerId = setTimeout(() => {
      self.registration.showNotification('Task Reminder!', {
        body: task.name,
        icon: './icon-192.svg',
        badge: './icon-192.svg',
        vibrate: [500, 200, 500, 200, 500],
        silent: false,
        tag: task.id.toString(),
        requireInteraction: true,
        // Keep actions minimal because we'll open a window for full UI
        actions: [
          { action: 'open', title: 'Open' }
        ]
      });
      console.log(`Service Worker: Notification shown for "${task.name}".`);
      // Open the notification window immediately
      const url = new URL('notification.html', self.registration.scope);
      url.searchParams.set('taskId', String(task.id));
      clients.openWindow(url.href);
      // remove timer entry but keep task in pendingTasks so the client window can act on it
      scheduleTimers.delete(task.id);
    }, delay);

    scheduleTimers.set(task.id, timerId);
  } else {
    console.log(`Service Worker: Task "${task.name}" is already past due. Scheduling immediate notification.`);
    // Show immediate notification if due time passed
    self.registration.showNotification('Task Reminder!', {
      body: task.name,
      icon: './icon-192.svg',
      badge: './icon-192.svg',
      vibrate: [500, 200, 500, 200, 500],
      silent: false,
      tag: task.id.toString(),
      requireInteraction: true,
      actions: [ { action: 'open', title: 'Open' } ]
    });
    // Open the notification window immediately
    const url = new URL('notification.html', self.registration.scope);
    url.searchParams.set('taskId', String(task.id));
    clients.openWindow(url.href);
  }
};

self.addEventListener('message', event => {
  const data = event.data;
  // Handle reset
  if (data && data.action === 'reset') {
    for (const [id, t] of scheduleTimers.entries()) {
      clearTimeout(t);
    }
    scheduleTimers.clear();
    pendingTasks.clear();
    self.registration.getNotifications().then(notifs => {
      for (const n of notifs) n.close();
    });
    console.log('Service Worker: Reset completed - timers cleared and notifications closed.');
    return;
  }
  // Handle complete
  if (data && data.action === 'complete') {
    const id = data.taskId;
    if (scheduleTimers.has(id)) {
      clearTimeout(scheduleTimers.get(id));
      scheduleTimers.delete(id);
    }
    pendingTasks.delete(id);
    console.log('Service Worker: Task completed, removed from pending:', id);
    return;
  }
  // Handle reschedule
  if (data && data.action === 'reschedule') {
    const id = data.taskId;
    const task = pendingTasks.get(id);
    if (task) {
      task.due = data.newDue; // ISO string
      pendingTasks.set(id, task);
      scheduleNotification(task);
      console.log('Service Worker: Task rescheduled from client:', id, data.newDue);
    }
    return;
  }
  // Handle test notification
  if (data && data.action === 'test') {
    const task = data.task;
    console.log('Service Worker: Test notification triggered for:', task.name);
    self.registration.showNotification('Task Reminder!', {
      body: task.name,
      icon: './icon-192.svg',
      badge: './icon-192.svg',
      vibrate: [500, 200, 500, 200, 500],
      silent: false,
      tag: task.id.toString(),
      requireInteraction: true,
      actions: [
        { action: 'open', title: 'Open' }
      ]
    });
    // Open the notification window immediately
    const url = new URL('notification.html', self.registration.scope);
    url.searchParams.set('taskId', String(task.id));
    clients.openWindow(url.href);
    return;
  }
  // Otherwise, treat as new/updated task
  if (data && data.id) {
    const task = data;
    console.log('Service Worker: Message received.', task);
    pendingTasks.set(task.id, task);
    scheduleNotification(task);
  }
});

self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked.', event.action);

  const taskId = parseInt(event.notification.tag);

  // Open a small client window that provides the snooze/completed UI
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Try to focus an existing window at our app scope
      for (const client of clientList) {
        if (client.url === self.registration.scope && 'focus' in client) {
          client.focus();
          // open notification.html in a new window to ensure UI is shown
          if (clients.openWindow) {
            const url = new URL('notification.html', self.registration.scope);
            url.searchParams.set('taskId', String(taskId));
            return clients.openWindow(url.href);
          }
          return;
        }
      }
      // no matching client, just open notification.html
      if (clients.openWindow) {
        const url = new URL('notification.html', self.registration.scope);
        url.searchParams.set('taskId', String(taskId));
        return clients.openWindow(url.href);
      }
    })
  );
  event.notification.close();
});

