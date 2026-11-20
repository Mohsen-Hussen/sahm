import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships a WebAssembly build of Postgres; keep it out of the server bundle.
  serverExternalPackages: ["@electric-sql/pglite"],
  // The SQL migration is read at runtime, so ship it with every server function.
  outputFileTracingIncludes: { "/**": ["./drizzle/**/*.sql"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
