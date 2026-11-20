import Link from "next/link";
import { cn } from "@/lib/cn";

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];

export function parseRange(value: unknown): Range {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (RANGES as readonly number[]).includes(n) ? (n as Range) : 30;
}

export function RangeTabs({ slug, active }: { slug: string; active: Range }) {
  return (
    <nav
      aria-label="Date range"
      className="inline-flex rounded-lg border border-line bg-surface p-0.5"
    >
      {RANGES.map((r) => (
        <Link
          key={r}
          href={`/s/${slug}?range=${r}`}
          scroll={false}
          aria-current={r === active ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium",
            r === active ? "bg-ink text-white" : "text-muted hover:text-ink",
          )}
        >
          {r} days
        </Link>
      ))}
    </nav>
  );
}
