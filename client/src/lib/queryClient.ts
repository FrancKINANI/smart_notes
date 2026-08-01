import { QueryClient } from "@tanstack/react-query";
import { useOffline } from "@/hooks/use-offline";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      retry: (failureCount, error: any) => {
        if (
          error?.message?.includes("401") ||
          error?.message?.includes("404")
        ) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 2,
      retryDelay: 1000,
    },
  },
});

// Function to replay pending mutations
export async function replayPendingMutations() {
  const pendingMutations = JSON.parse(
    localStorage.getItem("pendingMutations") || "[]"
  );

  if (pendingMutations.length === 0) return;

  // Sort mutations by timestamp
  pendingMutations.sort((a: any, b: any) => a.timestamp - b.timestamp);

  // Replay each mutation
  for (const mutation of pendingMutations) {
    try {
      await queryClient.executeMutation(mutation);
    } catch (error) {
      console.error("Error resuming the mutation:", error);
    }
  }

  // Clear pending mutations
  localStorage.removeItem("pendingMutations");
}

// Custom hook for offline query management
export function useOfflineQuery(queryKey: any[], queryFn: () => Promise<any>) {
  const { isOffline } = useOffline();

  return queryClient.useQuery({
    queryKey,
    queryFn,
    staleTime: isOffline ? Infinity : undefined,
    cacheTime: isOffline ? Infinity : undefined,
    retry: !isOffline,
  });
}

// Listen for connection events to replay mutations
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    replayPendingMutations();
  });
}
