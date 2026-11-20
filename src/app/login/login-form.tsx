"use client";

import { useActionState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { login, type LoginState } from "./actions";

const DEMO_ACCOUNTS = [
  { email: "sara@sahm.app", name: "Sara", role: "Owner of all 3 stores" },
  { email: "omar@sahm.app", name: "Omar", role: "Manager · Nakhla, viewer · Souq Tech" },
  { email: "lina@sahm.app", name: "Lina", role: "Viewer · Nakhla (read-only)" },
] as const;

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const email = useRef<HTMLInputElement>(null);
  const password = useRef<HTMLInputElement>(null);

  const fill = (value: string) => {
    if (email.current) email.current.value = value;
    if (password.current) password.current.value = "demo1234";
  };

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4" noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            ref={email}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={state.email}
            required
            aria-invalid={Boolean(state.error)}
            aria-describedby={state.error ? "login-error" : undefined}
            className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            ref={password}
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        {state.error && (
          <p
            id="login-error"
            role="alert"
            className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending && <Loader2 aria-hidden className="size-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">
          Demo accounts · password demo1234
        </p>
        <ul className="grid gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.email}>
              <button
                type="button"
                onClick={() => fill(a.email)}
                className="flex w-full items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-left text-sm hover:border-slate-300 hover:bg-slate-50"
              >
                <span>
                  <span className="font-medium">{a.name}</span>
                  <span className="block text-xs text-muted">{a.role}</span>
                </span>
                <span className="text-xs text-brand-600">Use</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
