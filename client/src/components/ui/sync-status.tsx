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
          "Error checking unsynced items:",
          error
        );
      }
    };

    checkUnsyncedItems();
    const interval = setInterval(checkUnsyncedItems, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    if (isOffline || isSyncing) return;

    setIsSyncing(true);
    try {
      // Trigger sync via the service worker
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register("sync-notes");

      // Wait a bit to let the sync start
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update the counter
      const [pendingNotes, pendingFlashcards] = await Promise.all([
        getPendingNotes(),
        getPendingFlashcards(),
      ]);
      setUnsyncedCount(pendingNotes.length + pendingFlashcards.length);
    } catch (error) {
      console.error("Error during sync:", error);
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
          ? "Offline mode"
          : `${unsyncedCount} item${
              unsyncedCount > 1 ? "s" : ""
            } unsynced`}
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
          <span className="sr-only">Sync</span>
        </Button>
      )}
    </div>
  );
}
