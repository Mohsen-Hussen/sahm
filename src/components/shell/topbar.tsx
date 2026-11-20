"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ChevronsUpDown, LogOut, Menu, X } from "lucide-react";
import type { Role } from "@/db/schema";
import { logout } from "@/app/login/actions";
import { Logo } from "@/components/logo";
import { RoleBadge } from "@/components/ui";
import { NavLinks } from "./sidebar";

type StoreOption = { slug: string; name: string; accent: string; role: Role };

function StoreMark({ name, accent }: { name: string; accent: string }) {
  return (
    <span
      aria-hidden
      className="grid size-7 shrink-0 place-items-center rounded-md text-xs font-semibold text-white"
      style={{ backgroundColor: accent }}
    >
      {name.slice(0, 1)}
    </span>
  );
}

export function Topbar({
  current,
  stores,
  user,
}: {
  current: StoreOption;
  stores: StoreOption[];
  user: { name: string; email: string };
}) {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          className="-ml-1 rounded-lg p-2 hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation"
          onClick={() => setMenuOpen(true)}
        >
          <Menu className="size-5" />
        </button>

        <div className="relative">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={switcherOpen}
            onClick={() => setSwitcherOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg py-1.5 pr-2 pl-1.5 hover:bg-slate-100"
          >
            <StoreMark name={current.name} accent={current.accent} />
            <span className="max-w-[10rem] truncate text-sm font-semibold sm:max-w-none">
              {current.name}
            </span>
            <ChevronsUpDown aria-hidden className="size-4 text-muted" />
          </button>
          {switcherOpen && (
            <>
              <button
                type="button"
                aria-label="Close store switcher"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setSwitcherOpen(false)}
              />
              <ul
                role="listbox"
                aria-label="Switch store"
                className="absolute top-full left-0 z-20 mt-2 w-72 rounded-xl border border-line bg-surface p-1.5 shadow-lg"
              >
                {stores.map((s) => (
                  <li key={s.slug} role="option" aria-selected={s.slug === current.slug}>
                    <Link
                      href={`/s/${s.slug}`}
                      onClick={() => setSwitcherOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-slate-50"
                    >
                      <StoreMark name={s.name} accent={s.accent} />
                      <span className="flex-1">
                        <span className="block font-medium">{s.name}</span>
                        <span className="text-xs text-muted capitalize">{s.role}</span>
                      </span>
                      {s.slug === current.slug && (
                        <Check aria-hidden className="size-4 text-brand-600" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <RoleBadge role={current.role} />
          <div className="hidden text-right sm:block">
            <p className="text-sm leading-tight font-medium">{user.name}</p>
            <p className="text-xs text-muted">{user.email}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-ink"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="relative h-full w-64 bg-ink px-3 py-5">
            <div className="mb-8 flex items-center justify-between px-3">
              <Logo inverted />
              <button
                type="button"
                aria-label="Close navigation"
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10"
                onClick={() => setMenuOpen(false)}
              >
                <X className="size-5" />
              </button>
            </div>
            <NavLinks slug={current.slug} onNavigate={() => setMenuOpen(false)} />
          </nav>
        </div>
      )}
    </header>
  );
}
