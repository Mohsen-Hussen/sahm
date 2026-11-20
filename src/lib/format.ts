const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Riyadh",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const SHORT_DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function formatDateTime(value: Date | string) {
  return DATE_TIME.format(new Date(value));
}

/** Formats a `YYYY-MM-DD` key without shifting it through the local time zone. */
export function formatDayKey(day: string) {
  return SHORT_DAY.format(new Date(`${day}T00:00:00Z`));
}

export function timeAgo(value: Date | string, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - new Date(value).getTime()) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}
