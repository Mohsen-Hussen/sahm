import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="text-center">
        <Logo />
        <p className="mt-8 text-sm font-medium text-brand-600">404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-2 text-sm text-muted">
          It may not exist, or your account may not have access to it.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white"
        >
          Back to your stores
        </Link>
      </div>
    </main>
  );
}
