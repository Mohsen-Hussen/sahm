"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardHeader, StatusBadge } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/format";
import type { LiveOrder } from "@/server/live";
import { LiveIndicator, useLiveEvents } from "./use-live-events";

const LIMIT = 7;

export function LiveFeed({
  slug,
  currency,
  initial,
}: {
  slug: string;
  currency: string;
  initial: LiveOrder[];
}) {
  const [orders, setOrders] = useState(initial);
  const [fresh, setFresh] = useState<Set<number>>(new Set());
  const [, tick] = useState(0);

  const status = useLiveEvents(slug, (event) => {
    if (event.type === "order.created") {
      setOrders((prev) =>
        [event.order, ...prev.filter((o) => o.id !== event.order.id)].slice(0, LIMIT),
      );
      setFresh((prev) => new Set(prev).add(event.order.id));
    } else if (event.type === "order.updated") {
      setOrders((prev) =>
        prev.map((o) => (o.id === event.id ? { ...o, status: event.status } : o)),
      );
    }
  });

  // Keep "x min ago" labels current.
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Card>
      <CardHeader
        title="Live orders"
        description="New orders appear as they're placed"
        action={<LiveIndicator status={status} />}
      />
      <ul className="divide-y divide-line" aria-live="polite" aria-relevant="additions">
        {orders.map((o) => (
          <li key={o.id} className={fresh.has(o.id) ? "animate-pulse-in" : undefined}>
            <Link
              href={`/s/${slug}/orders?q=${o.number}`}
              className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{o.customer}</p>
                <p className="text-xs text-muted">
                  {o.number} · {o.items} {o.items === 1 ? "item" : "items"} · {timeAgo(o.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="tabular font-medium">{formatMoney(o.total, currency)}</p>
                <StatusBadge status={o.status} className="mt-1" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
