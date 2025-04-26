import { queryClient } from "./queryClient";

interface RequestConfig extends RequestInit {
  retries?: number;
  retryDelay?: number;
}

interface QueuedRequest {
  url: string;
  config: RequestConfig;
  timestamp: number;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

const requestQueue: QueuedRequest[] = [];
let isRetrying = false;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiRequest(
  url: string,
  config: RequestConfig = {}
): Promise<any> {
  const { retries = 3, retryDelay = 1000, ...fetchConfig } = config;

  try {
    const response = await fetch(url, {
      ...fetchConfig,
      credentials: "include", // Add credentials support
      headers: {
        "Content-Type": "application/json",
        ...fetchConfig.headers,
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(
        data?.message || `HTTP error! status: ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    // Si nous sommes hors ligne, mettre la requête en file d'attente
    if (
      !navigator.onLine ||
      (error instanceof Error && error.message.includes("Failed to fetch"))
    ) {
      return new Promise((resolve, reject) => {
        requestQueue.push({
          url,
          config: {
            ...config,
            retries: Math.max(0, retries - 1),
            retryDelay: retryDelay * 2,
          },
          timestamp: Date.now(),
          resolve,
          reject,
        });

        // Si nous ne sommes pas déjà en train de réessayer, commencer à réessayer
        if (!isRetrying) {
          retryQueuedRequests();
        }
      });
    }

    // Si nous avons encore des tentatives, réessayer après un délai
    if (retries > 0) {
      await sleep(retryDelay);
      return apiRequest(url, {
        ...config,
        retries: retries - 1,
        retryDelay: retryDelay * 2,
      });
    }

    throw error;
  }
}

async function retryQueuedRequests() {
  if (isRetrying || requestQueue.length === 0) return;

  isRetrying = true;

  while (requestQueue.length > 0) {
    if (!navigator.onLine) {
      await new Promise((resolve) => {
        window.addEventListener("online", resolve, { once: true });
      });
    }

    const request = requestQueue.shift();
    if (!request) continue;

    try {
      const response = await apiRequest(request.url, request.config);
      request.resolve(response);

      // Invalider les requêtes en cache qui pourraient être affectées
      const urlParts = request.url.split("/");
      const resourceType = urlParts[urlParts.length - 2]; // ex: 'notes', 'flashcards'
      queryClient.invalidateQueries([resourceType]);
    } catch (error) {
      // Si la requête échoue toujours après le nombre maximum de tentatives
      if (request.config.retries === 0) {
        request.reject(error);
      } else {
        // Remettre la requête dans la file d'attente avec un délai plus long
        requestQueue.push({
          ...request,
          config: {
            ...request.config,
            retries: (request.config.retries || 1) - 1,
            retryDelay: (request.config.retryDelay || 1000) * 2,
          },
        });
      }
    }

    // Attendre un peu entre chaque tentative pour éviter de surcharger le serveur
    await sleep(1000);
  }

  isRetrying = false;
}

// Écouter les événements de connexion
window.addEventListener("online", () => {
  retryQueuedRequests();
});

export const api = {
  get: (url: string, config?: RequestConfig) =>
    apiRequest(url, { ...config, method: "GET" }),

  post: (url: string, data: any, config?: RequestConfig) =>
    apiRequest(url, {
      ...config,
      method: "POST",
      body: JSON.stringify(data),
    }),

  put: (url: string, data: any, config?: RequestConfig) =>
    apiRequest(url, {
      ...config,
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (url: string, config?: RequestConfig) =>
    apiRequest(url, { ...config, method: "DELETE" }),
};
