import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Logo />
          <h1 className="mt-8 text-2xl font-semibold tracking-tight">Sign in to your stores</h1>
          <p className="mt-1 mb-8 text-sm text-muted">
            Pick a demo account to see how each role changes what you can do.
          </p>
          <LoginForm next={typeof next === "string" ? next : undefined} />
        </div>
      </div>
      <aside className="relative hidden overflow-hidden bg-ink text-white lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgb(37_99_235/0.45),transparent_55%),radial-gradient(circle_at_80%_80%,rgb(16_185_129/0.3),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-end p-12">
          <p className="max-w-md text-3xl leading-tight font-semibold tracking-tight">
            Every store, every order, live.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-slate-300">
            <li>• Streaming dashboards with React Server Components</li>
            <li>• Real-time order feed over Server-Sent Events</li>
            <li>• Role-based access, checked on the server for every action</li>
          </ul>
        </div>
      </aside>
    </main>
  );
}
