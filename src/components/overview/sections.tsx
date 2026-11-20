import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getDb } from "@/db/client";
import { Card, CardHeader, EmptyState, Skeleton } from "@/components/ui";
import { formatMoney, formatNumber } from "@/lib/money";
import { timeAgo } from "@/lib/format";
import {
  getActivity,
  getChannelBreakdown,
  getLowStock,
  getRevenueSeries,
  getTopProducts,
} from "@/server/queries";
import { RevenueChart } from "./revenue-chart";

type Props = { storeId: number; currency: string; days: number };

export async function RevenueCard({ storeId, currency, days }: Props) {
  const series = await getRevenueSeries(await getDb(), storeId, days);
  return (
    <Card className="flex flex-col lg:col-span-2">
      <CardHeader
        title="Revenue"
        description={`Daily net revenue, last ${days} days, compared with the ${days} days before`}
        action={
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded bg-brand-500" /> This period
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0 w-4 border-t-2 border-dashed border-slate-400" /> Previous
            </span>
          </div>
        }
      />
      <div className="min-h-72 flex-1 p-4">
        <RevenueChart data={series} currency={currency} />
      </div>
    </Card>
  );
}

const CHANNEL_LABEL = {
  web: "Web store",
  mobile: "Mobile app",
  marketplace: "Marketplaces",
} as const;
const CHANNEL_COLOR = { web: "#2563eb", mobile: "#10b981", marketplace: "#f59e0b" } as const;

export async function ChannelMix({ storeId, currency, days }: Props) {
  const rows = await getChannelBreakdown(await getDb(), storeId, days);
  const total = rows.reduce((s, r) => s + r.revenue, 0) || 1;
  return (
    <Card>
      <CardHeader title="Sales by channel" description="Share of net revenue" />
      <div className="space-y-4 p-5">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
          {rows.map((r) => (
            <div
              key={r.channel}
              style={{
                width: `${(r.revenue / total) * 100}%`,
                backgroundColor: CHANNEL_COLOR[r.channel],
              }}
            />
          ))}
        </div>
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.channel} className="flex items-center gap-3 text-sm">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: CHANNEL_COLOR[r.channel] }}
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{CHANNEL_LABEL[r.channel]}</span>
                <span className="tabular text-xs text-muted">{formatNumber(r.orders)} orders</span>
              </span>
              <span className="text-right">
                <span className="tabular block font-medium">
                  {formatMoney(r.revenue, currency, { compact: true })}
                </span>
                <span className="tabular text-xs text-muted">
                  {Math.round((r.revenue / total) * 100)}%
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

export async function TopProducts({ storeId, currency, days }: Props) {
  const rows = await getTopProducts(await getDb(), storeId, days);
  const max = rows[0]?.revenue || 1;
  return (
    <Card>
      <CardHeader title="Top products" description={`By revenue, last ${days} days`} />
      {rows.length === 0 ? (
        <EmptyState title="No sales in this period" />
      ) : (
        <ol className="divide-y divide-line">
          {rows.map((p, i) => (
            <li key={p.id} className="px-5 py-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="tabular w-4 text-muted">{i + 1}</span>
                <span className="flex-1 truncate font-medium">{p.name}</span>
                <span className="tabular font-medium">
                  {formatMoney(p.revenue, currency, { compact: true })}
                </span>
              </div>
              <div className="mt-1.5 ml-7 flex items-center gap-3">
                <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${(p.revenue / max) * 100}%` }}
                  />
                </div>
                <span className="tabular text-xs text-muted">{formatNumber(p.units)} sold</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export async function LowStock({ storeId, slug }: { storeId: number; slug: string }) {
  const rows = await getLowStock(await getDb(), storeId);
  return (
    <Card>
      <CardHeader
        title="Low stock"
        description="At or below the reorder level"
        action={
          <Link
            href={`/s/${slug}/inventory?filter=low`}
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            Manage
          </Link>
        }
      />
      {rows.length === 0 ? (
        <EmptyState title="Everything is well stocked" />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-5 py-3 text-sm">
              <AlertTriangle
                aria-hidden
                className={p.stock === 0 ? "size-4 text-rose-500" : "size-4 text-amber-500"}
              />
              <span className="flex-1 truncate">{p.name}</span>
              <span
                className={`tabular font-medium ${p.stock === 0 ? "text-rose-600" : "text-amber-700"}`}
              >
                {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export async function ActivityList({ storeId }: { storeId: number }) {
  const rows = await getActivity(await getDb(), storeId, 6);
  return (
    <Card>
      <CardHeader title="Team activity" description="Changes made in this store" />
      <ul className="divide-y divide-line">
        {rows.map((a) => (
          <li key={a.id} className="px-5 py-3 text-sm">
            <p>
              <span className="font-medium">{a.actor}</span>{" "}
              <span className="text-slate-600">
                {a.message.charAt(0).toLowerCase() + a.message.slice(1)}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-muted">{timeAgo(a.createdAt)}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function SectionSkeleton({
  className = "",
  rows = 5,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <Card className={className}>
      <div className="border-b border-line px-5 py-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-2 h-3 w-48" />
      </div>
      <div className="space-y-3 p-5">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    </Card>
  );
}
