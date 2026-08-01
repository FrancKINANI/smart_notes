import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export function useOffline() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast({
        title: "Connection restored",
        description: "Your internet connection is available again",
        variant: "default", // Replaces 'success' with a valid value
        duration: 3000,
      });
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast({
        title: "Offline mode",
        description: "The app is now working in offline mode",
        variant: "destructive", // Replaces 'warning' with a valid value
        duration: 5000,
      });
    };

    // Check the initial connection state
    setIsOffline(!navigator.onLine);

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Clean up listeners
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [toast]);

  // Function to check if a resource is available offline
  const checkOfflineAvailability = async (url: string): Promise<boolean> => {
    if (!("caches" in window)) {
      return false;
    }

    try {
      const cache = await caches.match(url);
      return cache !== undefined;
    } catch (error) {
      console.error("Error checking the cache:", error);
      return false;
    }
  };

  // Function to preload a resource into the cache
  const preloadResource = async (url: string): Promise<void> => {
    if (!("caches" in window)) {
      return;
    }

    try {
      const cache = await caches.open("offline-resources");
      await cache.add(url);
    } catch (error) {
      console.error("Error preloading the resource:", error);
    }
  };

  return {
    isOffline,
    checkOfflineAvailability,
    preloadResource,
  };
}
