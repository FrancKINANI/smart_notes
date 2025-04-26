import React from "react";
import { useOffline } from "@/hooks/use-offline";
import { cn } from "@/lib/utils";
import { WifiOff } from "lucide-react";

interface OfflineIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export function OfflineIndicator({
  className,
  ...props
}: OfflineIndicatorProps) {
  const { isOffline } = useOffline();

  if (!isOffline) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-yellow-100 px-4 py-2 text-sm text-yellow-800 shadow-lg dark:bg-yellow-900 dark:text-yellow-100",
        className
      )}
      {...props}
    >
      <WifiOff className="h-4 w-4" />
      <span>Mode hors-ligne</span>
    </div>
  );
}
