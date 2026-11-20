"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveEvent } from "@/server/live";

export type LiveStatus = "connecting" | "live" | "offline";

/** Subscribes to the store's Server-Sent Events stream; reconnects automatically. */
export function useLiveEvents(slug: string, onEvent: (event: LiveEvent) => void) {
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const handler = useRef(onEvent);
  useEffect(() => {
    handler.current = onEvent;
  });

  useEffect(() => {
    const source = new EventSource(`/api/stores/${slug}/live`);
    const listener = (e: MessageEvent<string>) => handler.current(JSON.parse(e.data) as LiveEvent);
    const types: LiveEvent["type"][] = ["order.created", "order.updated", "stock.updated"];
    types.forEach((t) => source.addEventListener(t, listener as EventListener));
    source.onopen = () => setStatus("live");
    source.onerror = () =>
      setStatus(source.readyState === EventSource.CLOSED ? "offline" : "connecting");
    return () => source.close();
  }, [slug]);

  return status;
}

export function LiveIndicator({ status }: { status: LiveStatus }) {
  const label = status === "live" ? "Live" : status === "connecting" ? "Connecting…" : "Offline";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted" role="status">
      <span className="relative flex size-2">
        {status === "live" && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex size-2 rounded-full ${
            status === "live"
              ? "bg-emerald-500"
              : status === "connecting"
                ? "bg-amber-400"
                : "bg-slate-400"
          }`}
        />
      </span>
      {label}
    </span>
  );
}
