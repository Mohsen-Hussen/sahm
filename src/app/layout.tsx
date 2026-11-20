import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Sahm — Commerce analytics", template: "%s · Sahm" },
  description:
    "Multi-tenant, real-time analytics dashboard for online stores. Built with Next.js 16, React 19 and Postgres.",
};

export const viewport: Viewport = { themeColor: "#0f172a" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
