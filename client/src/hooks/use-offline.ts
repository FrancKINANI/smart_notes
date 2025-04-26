import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export function useOffline() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast({
        title: "Connexion rétablie",
        description: "Votre connexion internet est de nouveau disponible",
        variant: "default", // Remplace 'success' par une valeur valide
        duration: 3000,
      });
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast({
        title: "Mode hors-ligne",
        description: "L'application fonctionne maintenant en mode hors-ligne",
        variant: "destructive", // Remplace 'warning' par une valeur valide
        duration: 5000,
      });
    };

    // Vérifier l'état initial de la connexion
    setIsOffline(!navigator.onLine);

    // Ajouter les écouteurs d'événements
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Nettoyer les écouteurs
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [toast]);

  // Fonction pour vérifier si une ressource est disponible hors-ligne
  const checkOfflineAvailability = async (url: string): Promise<boolean> => {
    if (!("caches" in window)) {
      return false;
    }

    try {
      const cache = await caches.match(url);
      return cache !== undefined;
    } catch (error) {
      console.error("Erreur lors de la vérification du cache:", error);
      return false;
    }
  };

  // Fonction pour précharger une ressource dans le cache
  const preloadResource = async (url: string): Promise<void> => {
    if (!("caches" in window)) {
      return;
    }

    try {
      const cache = await caches.open("offline-resources");
      await cache.add(url);
    } catch (error) {
      console.error("Erreur lors du préchargement de la ressource:", error);
    }
  };

  return {
    isOffline,
    checkOfflineAvailability,
    preloadResource,
  };
}
