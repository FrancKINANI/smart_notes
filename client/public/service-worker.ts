/// <reference lib="webworker" />

import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import {
  CacheFirst,
  StaleWhileRevalidate,
  NetworkFirst,
} from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";

declare let self: ServiceWorkerGlobalScope;

// Précache des ressources statiques
precacheAndRoute(self.__WB_MANIFEST);

// Cache pour les ressources statiques (images, CSS, JS)
registerRoute(
  ({ request }) =>
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image",
  new CacheFirst({
    cacheName: "static-resources",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 jours
      }),
    ],
  })
);

// Cache pour les données de l'API
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  new NetworkFirst({
    cacheName: "api-cache",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);

// Cache pour les notes de l'utilisateur
registerRoute(
  ({ url }) => url.pathname.includes("/api/notes"),
  new StaleWhileRevalidate({
    cacheName: "notes-cache",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60, // 1 heure
      }),
    ],
  })
);

// Gestionnaire de synchronisation en arrière-plan
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-notes") {
    event.waitUntil(syncNotes());
  }
});

// Fonction pour synchroniser les notes
async function syncNotes() {
  try {
    const cache = await caches.open("offline-notes");
    const requests = await cache.keys();

    for (const request of requests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
        }
      } catch (error) {
        console.error("Erreur de synchronisation:", error);
      }
    }
  } catch (error) {
    console.error("Erreur lors de la synchronisation des notes:", error);
  }
}

// Gestionnaire de notifications push
self.addEventListener("push", (event) => {
  const data = event.data?.json();

  if (data) {
    const options = {
      body: data.body,
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      data: data.url,
      actions: [
        {
          action: "open",
          title: "Ouvrir",
        },
        {
          action: "close",
          title: "Fermer",
        },
      ],
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// Gestionnaire de clics sur les notifications
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "open") {
    const urlToOpen = event.notification.data;

    event.waitUntil(
      clients.matchAll({ type: "window" }).then((windowClients) => {
        // Ouvrir l'URL dans une fenêtre existante si possible
        for (const client of windowClients) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        // Sinon ouvrir une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});
