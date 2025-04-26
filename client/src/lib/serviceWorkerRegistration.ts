const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
    window.location.hostname === "[::1]" ||
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
};

export function register(config?: Config) {
  if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
    const publicUrl = new URL(
      process.env.PUBLIC_URL || "",
      window.location.href
    );

    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener("load", () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
      } else {
        registerValidSW(swUrl, config);
      }
    });
  }
}

async function registerValidSW(swUrl: string, config?: Config) {
  try {
    const registration = await navigator.serviceWorker.register(swUrl);

    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.onstatechange = () => {
        if (installingWorker.state === "installed") {
          if (navigator.serviceWorker.controller) {
            console.log("New content is available; please refresh.");
            if (config?.onUpdate) {
              config.onUpdate(registration);
            }
          } else {
            console.log("Content is cached for offline use.");
            if (config?.onSuccess) {
              config.onSuccess(registration);
            }
          }
        }
      };
    };
  } catch (error) {
    console.error("Error during service worker registration:", error);
  }
}

async function checkValidServiceWorker(swUrl: string, config?: Config) {
  try {
    const response = await fetch(swUrl, {
      headers: { "Service-Worker": "script" },
    });

    const contentType = response.headers.get("content-type");

    if (
      response.status === 404 ||
      (contentType && !contentType.includes("javascript"))
    ) {
      const registration = await navigator.serviceWorker.ready;
      await registration.unregister();
      window.location.reload();
    } else {
      registerValidSW(swUrl, config);
    }
  } catch (error) {
    console.log(
      "No internet connection found. App is running in offline mode."
    );
  }
}

export function unregister() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

// Interface pour gérer la synchronisation en arrière-plan
export async function registerBackgroundSync() {
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register("sync-notes");
      console.log("Background sync registered!");
    } catch (error) {
      console.error("Background sync registration failed:", error);
    }
  }
}

// Interface pour gérer les notifications push
export async function subscribeToPushNotifications() {
  if ("serviceWorker" in navigator && "PushManager" in window) {
    try {
      const registration = await navigator.serviceWorker.ready;

      const existingSubscription =
        await registration.pushManager.getSubscription();
      if (existingSubscription) {
        return existingSubscription;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.VITE_VAPID_PUBLIC_KEY,
      });

      // Envoyer la subscription au serveur
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription),
      });

      return subscription;
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
    }
  }
}
