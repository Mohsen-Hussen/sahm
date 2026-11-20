"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/logo";
import { NAV } from "./nav";

export function NavLinks({ slug, onNavigate }: { slug: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const base = `/s/${slug}`;
  return (
    <ul className="space-y-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const target = `${base}${href}`;
        const active = href === "" ? pathname === base : pathname.startsWith(target);
        return (
          <li key={label}>
            <Link
              href={target as `/s/${string}`}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon aria-hidden className="size-4" />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Sidebar({ slug }: { slug: string }) {
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col bg-ink px-3 py-5 lg:flex">
      <div className="px-3">
        <Logo inverted />
      </div>
      <nav aria-label="Main" className="mt-8 flex-1">
        <NavLinks slug={slug} />
      </nav>
      <p className="px-3 text-xs leading-relaxed text-slate-500">
        Demo data resets when the server restarts.
      </p>
    </aside>
  );
}
