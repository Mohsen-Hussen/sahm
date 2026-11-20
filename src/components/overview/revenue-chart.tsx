"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesPoint } from "@/server/queries";
import { formatDayKey } from "@/lib/format";
import { formatMoney } from "@/lib/money";

export function RevenueChart({ data, currency }: { data: SeriesPoint[]; currency: string }) {
  const total = data.reduce((s, p) => s + p.revenue, 0);
  return (
    <figure
      className="h-full min-h-72"
      aria-label={`Daily revenue, total ${formatMoney(total, currency)}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#eef0f3" />
          <XAxis
            dataKey="day"
            tickFormatter={formatDayKey}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
            tick={{ fontSize: 12, fill: "#64748b" }}
          />
          <YAxis
            width={64}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickFormatter={(v: number) => formatMoney(v, currency, { compact: true })}
          />
          <Tooltip
            cursor={{ stroke: "#cbd5e1" }}
            contentStyle={{ borderRadius: 10, borderColor: "#e5e7eb", fontSize: 12 }}
            labelFormatter={(label) => formatDayKey(String(label))}
            formatter={(value, name) => [
              formatMoney(Number(value), currency),
              name === "revenue" ? "This period" : "Previous period",
            ]}
          />
          <Line
            type="monotone"
            dataKey="previousRevenue"
            stroke="#94a3b8"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#rev)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </figure>
  );
}
