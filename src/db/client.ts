import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { seedDatabase } from "./seed";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATION = path.join(process.cwd(), "drizzle", "0000_init.sql");

async function migrate(db: Database) {
  const exists = await db.execute<{ present: boolean }>(
    sql`select to_regclass('public.stores') is not null as present`,
  );
  // postgres-js returns an array; PGlite returns `{ rows }`.
  const rows = (
    Array.isArray(exists) ? exists : (exists as { rows: { present: boolean }[] }).rows
  ) as {
    present: boolean;
  }[];
  if (rows[0]?.present) return false;
  const statements = readFileSync(MIGRATION, "utf8")
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const statement of statements) await db.execute(sql.raw(statement));
  return true;
}

async function connect(): Promise<Database> {
  const url = process.env.DATABASE_URL;
  let db: Database;
  if (url) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    db = drizzle(postgres(url, { max: 5, prepare: false }), { schema }) as unknown as Database;
  } else {
    // Zero-config demo mode: Postgres compiled to WebAssembly, in memory, seeded on boot.
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    db = drizzle(new PGlite(), { schema }) as unknown as Database;
  }
  const created = await migrate(db);
  if (created) await seedDatabase(db);
  return db;
}

const globalForDb = globalThis as unknown as { sahmDb?: Promise<Database> };

/** One connection per server process, shared across requests and hot reloads. */
export function getDb(): Promise<Database> {
  if (!globalForDb.sahmDb) {
    globalForDb.sahmDb = connect().catch((error) => {
      globalForDb.sahmDb = undefined;
      throw error;
    });
  }
  return globalForDb.sahmDb;
}

/** Test helper: a fresh, isolated in-memory database. */
export async function createTestDb(now?: Date): Promise<Database> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const db = drizzle(new PGlite(), { schema }) as unknown as Database;
  await migrate(db);
  await seedDatabase(db, now);
  return db;
}
