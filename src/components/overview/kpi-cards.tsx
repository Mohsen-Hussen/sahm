import { getDb } from "@/db/client";
import { Card, Delta, Skeleton } from "@/components/ui";
import { formatMoney, formatNumber, percentChange } from "@/lib/money";
import { getKpis, getRevenueSeries } from "@/server/queries";
import { Sparkline } from "./sparkline";

export async function KpiCards({
  storeId,
  currency,
  days,
}: {
  storeId: number;
  currency: string;
  days: number;
}) {
  const db = await getDb();
  const [kpis, series] = await Promise.all([
    getKpis(db, storeId, days),
    getRevenueSeries(db, storeId, days),
  ]);
  const items = [
    {
      label: "Net revenue",
      value: formatMoney(kpis.revenue.current, currency),
      change: percentChange(kpis.revenue.current, kpis.revenue.previous),
      spark: series.map((p) => p.revenue),
    },
    {
      label: "Orders",
      value: formatNumber(kpis.orders.current),
      change: percentChange(kpis.orders.current, kpis.orders.previous),
      spark: series.map((p) => p.orders),
    },
    {
      label: "Average order value",
      value: formatMoney(kpis.aov.current, currency),
      change: percentChange(kpis.aov.current, kpis.aov.previous),
    },
    {
      label: "Refund rate",
      value: `${kpis.refundRate.current.toFixed(1)}%`,
      change: percentChange(kpis.refundRate.current, kpis.refundRate.previous),
      inverse: true,
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted">{item.label}</p>
            {item.spark && <Sparkline values={item.spark} />}
          </div>
          <p className="tabular mt-1 text-2xl font-semibold tracking-tight">{item.value}</p>
          <div className="mt-2 flex items-center gap-2">
            <Delta value={item.change} inverse={item.inverse} />
            <span className="text-xs text-muted">vs prior {days} days</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function KpiCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Card key={i} className="space-y-3 p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-40" />
        </Card>
      ))}
    </div>
  );
}
