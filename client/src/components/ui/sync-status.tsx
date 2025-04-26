import React, { useState, useEffect } from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPendingNotes, getPendingFlashcards } from "@/lib/indexedDB";
import { useOffline } from "@/hooks/use-offline";
import { Button } from "./button";

export function SyncStatus() {
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { isOffline } = useOffline();

  useEffect(() => {
    const checkUnsyncedItems = async () => {
      try {
        const [pendingNotes, pendingFlashcards] = await Promise.all([
          getPendingNotes(),
          getPendingFlashcards(),
        ]);
        setUnsyncedCount(pendingNotes.length + pendingFlashcards.length);
      } catch (error) {
        console.error(
          "Erreur lors de la vérification des éléments non synchronisés:",
          error
        );
      }
    };

    checkUnsyncedItems();
    const interval = setInterval(checkUnsyncedItems, 30000); // Vérifier toutes les 30 secondes

    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    if (isOffline || isSyncing) return;

    setIsSyncing(true);
    try {
      // Déclencher la synchronisation via le service worker
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register("sync-notes");

      // Attendre un peu pour laisser le temps à la synchronisation de démarrer
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mettre à jour le compteur
      const [pendingNotes, pendingFlashcards] = await Promise.all([
        getPendingNotes(),
        getPendingFlashcards(),
      ]);
      setUnsyncedCount(pendingNotes.length + pendingFlashcards.length);
    } catch (error) {
      console.error("Erreur lors de la synchronisation:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (unsyncedCount === 0 && !isOffline) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-2 text-sm shadow-lg",
        isOffline
          ? "bg-yellow-100 text-yellow-800"
          : "bg-blue-100 text-blue-800"
      )}
    >
      {isOffline ? (
        <CloudOff className="h-4 w-4" />
      ) : (
        <Cloud className="h-4 w-4" />
      )}

      <span>
        {isOffline
          ? "Mode hors-ligne"
          : `${unsyncedCount} élément${
              unsyncedCount > 1 ? "s" : ""
            } non synchronisé${unsyncedCount > 1 ? "s" : ""}`}
      </span>

      {!isOffline && unsyncedCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-2 h-6 w-6 p-0"
          onClick={handleSync}
          disabled={isSyncing}
        >
          <RefreshCw
            className={cn("h-4 w-4", {
              "animate-spin": isSyncing,
            })}
          />
          <span className="sr-only">Synchroniser</span>
        </Button>
      )}
    </div>
  );
}
