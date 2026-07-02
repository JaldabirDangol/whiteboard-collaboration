"use client";

import { Wifi, WifiOff, Loader2, RefreshCw } from "lucide-react";

type Props = {
  connectionStatus: "connected" | "connecting" | "disconnected" | "error";
  onRetry?: () => void;
};

export default function BoardConnectionStatus({ connectionStatus, onRetry }: Props) {
  if (connectionStatus === "connected") return null;

  return (
    <div className="absolute left-1/2 top-2 z-20 -translate-x-1/2">
      <div
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur-sm ${
          connectionStatus === "connecting"
            ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
            : "bg-red-50 text-red-700 ring-1 ring-red-200"
        }`}
      >
        {connectionStatus === "connecting" ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            Connecting...
          </>
        ) : connectionStatus === "disconnected" ? (
          <>
            <WifiOff className="h-3 w-3" />
            Reconnecting...
          </>
        ) : (
          <>
            <Wifi className="h-3 w-3" />
            Connection lost
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="ml-1 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800 hover:bg-red-200 transition-colors"
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
