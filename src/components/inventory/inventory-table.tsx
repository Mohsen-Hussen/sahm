"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import type { ProductRow } from "@/server/queries";
import { changeStock } from "@/app/s/[store]/actions";
import { Button, Card } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useLiveEvents } from "@/components/live/use-live-events";
import { cn } from "@/lib/cn";
import { daysOfCover } from "@/lib/inventory";
import { formatMoney, formatNumber } from "@/lib/money";

export function InventoryTable({
  slug,
  currency,
  products,
  canUpdate,
  lowOnly: initialLowOnly,
}: {
  slug: string;
  currency: string;
  products: ProductRow[];
  canUpdate: boolean;
  lowOnly: boolean;
}) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [lowOnly, setLowOnly] = useState(initialLowOnly);
  const [remote, setRemote] = useState<Record<number, number>>({});

  useLiveEvents(slug, (event) => {
    if (event.type === "stock.updated")
      setRemote((m) => ({ ...m, [event.productId]: event.stock }));
  });

  const base = useMemo(
    () => products.map((p) => (p.id in remote ? { ...p, stock: remote[p.id] } : p)),
    [products, remote],
  );
  const [rows, applyDelta] = useOptimistic(base, (state, change: { id: number; delta: number }) =>
    state.map((p) =>
      p.id === change.id ? { ...p, stock: Math.max(0, p.stock + change.delta) } : p,
    ),
  );

  const adjust = (product: ProductRow, delta: number) =>
    startTransition(async () => {
      applyDelta({ id: product.id, delta });
      const result = await changeStock(slug, product.id, delta);
      if (!result.ok) toast.show(result.error, "error");
    });

  const shown = lowOnly ? rows.filter((p) => p.stock <= p.reorderLevel) : rows;
  const stockValue = rows.reduce((s, p) => s + p.stock * p.price, 0);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <p className="text-sm text-muted">
          Stock value{" "}
          <span className="tabular font-medium text-ink">{formatMoney(stockValue, currency)}</span>{" "}
          · {rows.filter((p) => p.stock <= p.reorderLevel).length} items need reordering
        </p>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={lowOnly}
            onChange={(e) => setLowOnly(e.target.checked)}
            className="size-4 rounded border-line accent-ink"
          />
          Low stock only
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium text-muted">
            <tr className="border-b border-line">
              <th className="px-5 py-2.5 font-medium">Product</th>
              <th className="px-3 py-2.5 font-medium">Price</th>
              <th className="px-3 py-2.5 text-right font-medium">Sold · 30 d</th>
              <th className="px-3 py-2.5 font-medium">Stock</th>
              <th className="px-3 py-2.5 text-right font-medium">Days of cover</th>
              {canUpdate && <th className="px-5 py-2.5 text-right font-medium">Adjust</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((p) => {
              const low = p.stock <= p.reorderLevel;
              const cover = daysOfCover(p.stock, p.sold30d);
              const pct = Math.min(100, (p.stock / Math.max(p.reorderLevel * 4, 1)) * 100);
              return (
                <tr key={p.id} data-testid={`product-${p.sku}`}>
                  <td className="px-5 py-3">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted">
                      {p.sku} · {p.category}
                    </p>
                  </td>
                  <td className="tabular px-3 py-3">{formatMoney(p.price, currency)}</td>
                  <td className="tabular px-3 py-3 text-right">{formatNumber(p.sold30d)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        data-testid="stock"
                        className={cn(
                          "tabular w-10 font-medium",
                          p.stock === 0 ? "text-rose-600" : low && "text-amber-700",
                        )}
                      >
                        {p.stock}
                      </span>
                      <div className="h-1.5 w-24 rounded-full bg-slate-100" aria-hidden>
                        <div
                          className={cn(
                            "h-full rounded-full",
                            p.stock === 0 ? "bg-rose-500" : low ? "bg-amber-500" : "bg-emerald-500",
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {low && (
                        <span className="text-xs text-muted">reorder at {p.reorderLevel}</span>
                      )}
                    </div>
                  </td>
                  <td className="tabular px-3 py-3 text-right">
                    {cover === null ? "—" : `${cover} d`}
                  </td>
                  {canUpdate && (
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          aria-label={`Remove one ${p.name}`}
                          onClick={() => adjust(p, -1)}
                          disabled={p.stock === 0}
                        >
                          <Minus aria-hidden className="size-3.5" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          aria-label={`Add one ${p.name}`}
                          onClick={() => adjust(p, 1)}
                        >
                          <Plus aria-hidden className="size-3.5" />
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => adjust(p, 24)}>
                          Restock +24
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {shown.length === 0 && (
          <p className="py-12 text-center text-sm text-muted">Nothing is low on stock.</p>
        )}
      </div>
    </Card>
  );
}
