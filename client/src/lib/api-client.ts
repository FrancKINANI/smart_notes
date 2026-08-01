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
    // If we are offline, queue the request
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

        // If we are not already retrying, start retrying
        if (!isRetrying) {
          retryQueuedRequests();
        }
      });
    }

    // If we still have attempts, retry after a delay
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

      // Invalidate cached queries that might be affected
      const urlParts = request.url.split("/");
      const resourceType = urlParts[urlParts.length - 2]; // e.g., 'notes', 'flashcards'
      queryClient.invalidateQueries([resourceType]);
    } catch (error) {
      // If the request still fails after the maximum number of attempts
      if (request.config.retries === 0) {
        request.reject(error);
      } else {
        // Put the request back in the queue with a longer delay
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

    // Wait a bit between each attempt to avoid overloading the server
    await sleep(1000);
  }

  isRetrying = false;
}

// Listen for connection events
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
