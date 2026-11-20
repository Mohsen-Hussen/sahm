export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 32 32" aria-hidden className="size-8">
        <rect width="32" height="32" rx="8" fill={inverted ? "#fff" : "#0f172a"} />
        <path
          d="M8 21l6-6 4 4 6-8"
          fill="none"
          stroke={inverted ? "#0f172a" : "#fff"}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M20 11h4v4"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={`text-lg font-semibold tracking-tight ${inverted ? "text-white" : ""}`}>
        Sahm
      </span>
    </span>
  );
}
