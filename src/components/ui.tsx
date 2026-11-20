import type { ComponentProps, ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { OrderStatus, Role } from "@/db/schema";
import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/money";
import { ROLE_LABEL } from "@/lib/permissions";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgb(15_23_42/0.04)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}

const buttonVariants = {
  primary: "bg-ink text-white hover:bg-slate-800 disabled:bg-slate-400",
  secondary: "border border-line bg-surface hover:bg-slate-50 disabled:text-slate-400",
  ghost: "hover:bg-slate-100 disabled:text-slate-400",
  danger: "border border-red-200 bg-surface text-red-700 hover:bg-red-50",
} as const;

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof buttonVariants; size?: "sm" | "md" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed",
        size === "sm" ? "h-8 px-2.5 text-xs" : "h-10 px-4 text-sm",
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-slate-200/70", className)} />;
}

export const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  paid: "bg-sky-50 text-sky-800 ring-sky-200",
  shipped: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  delivered: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  cancelled: "bg-slate-100 text-slate-600 ring-slate-200",
  refunded: "bg-rose-50 text-rose-800 ring-rose-200",
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset",
        STATUS_STYLE[status],
        className,
      )}
    >
      {status}
    </span>
  );
}

const ROLE_STYLE: Record<Role, string> = {
  owner: "bg-violet-50 text-violet-800 ring-violet-200",
  manager: "bg-sky-50 text-sky-800 ring-sky-200",
  viewer: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        ROLE_STYLE[role],
      )}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}

/** Coloured change indicator. `inverse` is for metrics where lower is better. */
export function Delta({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  const flat = value === null || Math.abs(value) < 0.05;
  const good = !flat && (inverse ? value! < 0 : value! > 0);
  const Icon = flat ? Minus : value! > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
        flat
          ? "bg-slate-100 text-slate-600"
          : good
            ? "bg-emerald-50 text-emerald-700"
            : "bg-rose-50 text-rose-700",
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {formatPercent(value)}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {children && <p className="mt-1 text-sm text-muted">{children}</p>}
    </div>
  );
}
