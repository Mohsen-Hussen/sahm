"use client";

import { useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type FilterFn,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ChevronsUpDown, Download, RefreshCw, Search } from "lucide-react";
import type { Channel, OrderStatus } from "@/db/schema";
import type { OrderRow } from "@/server/queries";
import { setOrderStatus } from "@/app/s/[store]/actions";
import { Button, Card, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/toast";
import { LiveIndicator, useLiveEvents } from "@/components/live/use-live-events";
import { cn } from "@/lib/cn";
import { toCsv } from "@/lib/csv";
import { formatDateTime } from "@/lib/format";
import { formatMoney, formatNumber } from "@/lib/money";
import { ORDER_TRANSITIONS } from "@/lib/permissions";

const STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];
const CHANNEL_LABEL: Record<Channel, string> = {
  web: "Web",
  mobile: "Mobile app",
  marketplace: "Marketplace",
};
const ROW_HEIGHT = 56;

const matchesQuery: FilterFn<OrderRow> = (row, _id, value: string) => {
  const q = value.trim().toLowerCase();
  if (!q) return true;
  const o = row.original;
  return (
    o.number.toLowerCase().includes(q) ||
    o.customer.toLowerCase().includes(q) ||
    o.city.toLowerCase().includes(q)
  );
};

type Props = {
  slug: string;
  currency: string;
  orders: OrderRow[];
  canUpdate: boolean;
  initialQuery?: string;
};

export function OrdersTable({ slug, currency, orders, canUpdate, initialQuery = "" }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [refreshing, startRefresh] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [remoteStatus, setRemoteStatus] = useState<Record<number, OrderStatus>>({});
  const [incoming, setIncoming] = useState(0);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  const live = useLiveEvents(slug, (event) => {
    if (event.type === "order.created") setIncoming((n) => n + 1);
    if (event.type === "order.updated")
      setRemoteStatus((m) => ({ ...m, [event.id]: event.status }));
  });

  const base = useMemo(
    () => orders.map((o) => (remoteStatus[o.id] ? { ...o, status: remoteStatus[o.id] } : o)),
    [orders, remoteStatus],
  );
  // The new status shows instantly; React rolls it back if the Server Action fails.
  const [rows, applyOptimistic] = useOptimistic(
    base,
    (state, change: { id: number; status: OrderStatus }) =>
      state.map((o) => (o.id === change.id ? { ...o, status: change.status } : o)),
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    for (const o of rows) counts[o.status] = (counts[o.status] ?? 0) + 1;
    return counts;
  }, [rows]);

  const updateStatus = (order: OrderRow, next: OrderStatus) => {
    startTransition(async () => {
      applyOptimistic({ id: order.id, status: next });
      setPendingIds((s) => new Set(s).add(order.id));
      const result = await setOrderStatus(slug, order.id, next);
      setPendingIds((s) => {
        const copy = new Set(s);
        copy.delete(order.id);
        return copy;
      });
      if (result.ok) toast.show(`${order.number} marked ${next}`);
      else toast.show(result.error, "error");
    });
  };

  const columns = useMemo<ColumnDef<OrderRow>[]>(
    () => [
      {
        accessorKey: "number",
        header: "Order",
        filterFn: matchesQuery,
        cell: ({ row }) => <span className="font-medium">{row.original.number}</span>,
      },
      {
        accessorKey: "createdAt",
        header: "Placed",
        sortingFn: "datetime",
        cell: ({ getValue }) => (
          <span className="tabular text-slate-600">{formatDateTime(getValue<Date>())}</span>
        ),
      },
      {
        accessorKey: "customer",
        header: "Customer",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate">{row.original.customer}</p>
            <p className="truncate text-xs text-muted">{row.original.city}</p>
          </div>
        ),
      },
      {
        accessorKey: "channel",
        header: "Channel",
        cell: ({ getValue }) => (
          <span className="text-slate-600">{CHANNEL_LABEL[getValue<Channel>()]}</span>
        ),
      },
      {
        accessorKey: "items",
        header: "Items",
        cell: ({ getValue }) => <span className="tabular">{getValue<number>()}</span>,
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ getValue }) => (
          <span className="tabular font-medium">{formatMoney(getValue<number>(), currency)}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        filterFn: "equals",
        cell: ({ row }) => {
          const o = row.original;
          const options = ORDER_TRANSITIONS[o.status];
          if (!canUpdate || options.length === 0) return <StatusBadge status={o.status} />;
          return (
            <div className="flex items-center gap-2">
              <StatusBadge
                status={o.status}
                className={pendingIds.has(o.id) ? "opacity-60" : undefined}
              />
              <label className="sr-only" htmlFor={`status-${o.id}`}>
                Change status of {o.number}
              </label>
              <select
                id={`status-${o.id}`}
                value=""
                onChange={(e) => e.target.value && updateStatus(o, e.target.value as OrderStatus)}
                className="h-7 rounded-md border border-line bg-surface px-1.5 text-xs text-slate-600 hover:border-slate-300"
              >
                <option value="">Move to…</option>
                {options.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currency, canUpdate, pendingIds],
  );

  const columnFilters = useMemo(
    () => [
      { id: "number", value: query },
      ...(status === "all" ? [] : [{ id: "status", value: status }]),
    ],
    [query, status],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    getRowId: (row) => String(row.id),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const visible = table.getRowModel().rows;
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  const filteredTotal = visible.reduce(
    (s, r) =>
      s + (["paid", "shipped", "delivered"].includes(r.original.status) ? r.original.total : 0),
    0,
  );

  const exportCsv = () => {
    const csv = toCsv(
      ["Order", "Placed (ISO)", "Customer", "City", "Channel", "Items", "Total", "Status"],
      visible.map(({ original: o }) => [
        o.number,
        new Date(o.createdAt).toISOString(),
        o.customer,
        o.city,
        o.channel,
        o.items,
        (o.total / 100).toFixed(2),
        o.status,
      ]),
    );
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `${slug}-orders.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  const grid =
    "grid grid-cols-[7rem_8.5rem_minmax(10rem,1fr)_7rem_4rem_8rem_13rem] items-center gap-4 px-5";

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
        <div className="relative min-w-[14rem] flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search order, customer or district"
            aria-label="Search orders"
            className="h-9 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <LiveIndicator status={live} />
        <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!visible.length}>
          <Download aria-hidden className="size-3.5" /> Export CSV
        </Button>
      </div>

      <div
        className="flex gap-1.5 overflow-x-auto border-b border-line px-5 py-3"
        role="group"
        aria-label="Filter by status"
      >
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => setStatus(s)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize ring-1 ring-inset",
              status === s
                ? "bg-ink text-white ring-ink"
                : "text-slate-600 ring-line hover:bg-slate-50",
            )}
          >
            {s} <span className="tabular opacity-70">{formatNumber(statusCounts[s] ?? 0)}</span>
          </button>
        ))}
      </div>

      {incoming > 0 && (
        <button
          type="button"
          onClick={() =>
            startRefresh(() => {
              router.refresh();
              setIncoming(0);
            })
          }
          className="flex w-full items-center justify-center gap-2 border-b border-line bg-brand-50 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
        >
          <RefreshCw aria-hidden className={cn("size-3.5", refreshing && "animate-spin")} />
          {incoming} new {incoming === 1 ? "order" : "orders"} — show
        </button>
      )}

      <div className="overflow-x-auto">
        <div
          role="table"
          aria-label="Orders"
          aria-rowcount={visible.length}
          className="min-w-[62rem]"
        >
          <div role="rowgroup">
            {table.getHeaderGroups().map((hg) => (
              <div
                role="row"
                key={hg.id}
                className={cn(
                  grid,
                  "h-10 border-b border-line bg-slate-50 text-xs font-medium text-muted",
                )}
              >
                {hg.headers.map((h) => {
                  const sorted = h.column.getIsSorted();
                  const sortable = ["createdAt", "total", "items", "customer"].includes(
                    h.column.id,
                  );
                  return (
                    <div
                      role="columnheader"
                      key={h.id}
                      aria-sort={
                        sorted ? (sorted === "asc" ? "ascending" : "descending") : undefined
                      }
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 hover:text-ink"
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sorted === "asc" ? (
                            <ArrowUp aria-hidden className="size-3" />
                          ) : sorted === "desc" ? (
                            <ArrowDown aria-hidden className="size-3" />
                          ) : (
                            <ChevronsUpDown aria-hidden className="size-3 opacity-50" />
                          )}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div
            ref={scrollRef}
            role="rowgroup"
            className="h-[min(36rem,calc(100dvh-22rem))] min-h-80 overflow-y-auto"
          >
            {visible.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted">No orders match these filters.</p>
            ) : (
              <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
                {virtualizer.getVirtualItems().map((item) => {
                  const row = visible[item.index];
                  return (
                    <div
                      role="row"
                      aria-rowindex={item.index + 1}
                      key={row.id}
                      data-testid={`order-${row.original.number}`}
                      className={cn(
                        grid,
                        "absolute inset-x-0 border-b border-line text-sm hover:bg-slate-50/70",
                      )}
                      style={{ height: ROW_HEIGHT, transform: `translateY(${item.start}px)` }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <div role="cell" key={cell.id} className="min-w-0">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-xs text-muted">
        <span>
          Showing{" "}
          <span className="tabular font-medium text-ink">{formatNumber(visible.length)}</span> of{" "}
          <span className="tabular">{formatNumber(rows.length)}</span> orders
        </span>
        <span>
          Net revenue in view:{" "}
          <span className="tabular font-medium text-ink">
            {formatMoney(filteredTotal, currency)}
          </span>
        </span>
      </footer>
    </Card>
  );
}
