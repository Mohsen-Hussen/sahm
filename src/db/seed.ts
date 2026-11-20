import { sql } from "drizzle-orm";
import type { Database } from "./client";
import * as t from "./schema";
import { buildSeed, DEMO_PASSWORD, STORE_SEEDS, USER_SEEDS } from "./seed-data";
import { hashPassword } from "@/lib/password";

async function insertChunked<T extends Record<string, unknown>>(
  db: Database,
  table: Parameters<Database["insert"]>[0],
  rows: T[],
  size = 1000,
) {
  for (let i = 0; i < rows.length; i += size) {
    await db.insert(table).values(rows.slice(i, i + size) as never);
  }
}

export async function seedDatabase(db: Database, now = new Date()) {
  const data = buildSeed(now);

  await db.transaction(async (tx) => {
    const tdb = tx as unknown as Database;
    const storeRows = STORE_SEEDS.map((s, i) => ({
      id: i + 1,
      slug: s.slug,
      name: s.name,
      category: s.category,
      city: s.city,
      accent: s.accent,
    }));
    await tdb.insert(t.stores).values(storeRows);
    const storeId = (index: number) => index + 1;

    // One hash is shared by every demo account; real sign-ups would hash individually.
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    await tdb
      .insert(t.users)
      .values(
        USER_SEEDS.map((u, i) => ({ id: i + 1, email: u.email, name: u.name, passwordHash })),
      );
    await tdb.insert(t.memberships).values(
      USER_SEEDS.flatMap((u, i) =>
        u.memberships.map(([slug, role]) => ({
          userId: i + 1,
          storeId: STORE_SEEDS.findIndex((s) => s.slug === slug) + 1,
          role,
        })),
      ),
    );

    await insertChunked(
      tdb,
      t.customers,
      data.customers.map(({ storeIndex, ...c }) => ({ ...c, storeId: storeId(storeIndex) })),
    );
    await insertChunked(
      tdb,
      t.products,
      data.products.map(({ storeIndex, ...p }) => ({ ...p, storeId: storeId(storeIndex) })),
    );
    await insertChunked(
      tdb,
      t.orders,
      data.orders.map(({ storeIndex, ...o }) => ({ ...o, storeId: storeId(storeIndex) })),
    );
    await insertChunked(tdb, t.orderItems, data.items);

    await tdb.insert(t.activity).values(
      STORE_SEEDS.flatMap((s, i) => [
        {
          storeId: i + 1,
          actor: "System",
          message: `Imported ${s.products.length} products from the catalogue`,
          createdAt: new Date(now.getTime() - 3 * 86_400_000),
        },
        {
          storeId: i + 1,
          actor: "Sara Al-Qahtani",
          message: "Connected the payment gateway",
          createdAt: new Date(now.getTime() - 2 * 86_400_000),
        },
      ]),
    );

    // Explicit ids were used above, so move each sequence past them.
    for (const table of ["stores", "users", "customers", "products", "orders", "order_items"]) {
      await tdb.execute(
        sql.raw(
          `select setval(pg_get_serial_sequence('${table}', 'id'), (select max(id) from ${table}))`,
        ),
      );
    }
  });
}
