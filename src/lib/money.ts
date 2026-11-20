/** All money is stored as integer minor units (halalas) to avoid floating-point drift. */

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: string, compact: boolean) {
  const key = `${currency}:${compact}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-SA", {
      style: "currency",
      currency,
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : 2,
      minimumFractionDigits: compact ? 0 : 2,
    });
    formatters.set(key, f);
  }
  return f;
}

export function formatMoney(minor: number, currency = "SAR", { compact = false } = {}) {
  return formatter(currency, compact).format(minor / 100);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

/** Relative change between two periods, or null when there is no baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function formatPercent(value: number | null, { signed = true } = {}) {
  if (value === null) return "—";
  const rounded = Math.round(value * 10) / 10;
  const sign = signed && rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)}%`;
}
