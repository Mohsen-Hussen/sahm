import { beforeAll, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { createTestDb, type Database } from "@/db/client";
import { buildSeed } from "@/db/seed-data";
import { memberships, orders, products, stores } from "@/db/schema";
import {
  getKpis,
  getRevenueSeries,
  getTopProducts,
  listOrders,
  listProducts,
} from "@/server/queries";
import {
  adjustStock,
  changeMemberRole,
  createSimulatedOrder,
  DomainError,
  updateOrderStatus,
} from "@/server/mutations";
import { createRandom } from "@/lib/random";

const NOW = new Date("2026-11-20T12:00:00Z");
const actor = { id: 1, name: "Test" };
let db: Database;
let nakhla: number;
let souq: number;

beforeAll(async () => {
  db = await createTestDb(NOW);
  const rows = await db.select().from(stores);
  nakhla = rows.find((s) => s.slug === "nakhla")!.id;
  souq = rows.find((s) => s.slug === "souq-tech")!.id;
});

describe("seed", () => {
  it("is deterministic for a given clock", () => {
    const a = buildSeed(NOW);
    const b = buildSeed(NOW);
    expect(a.orders.length).toBe(b.orders.length);
    expect(a.orders.slice(0, 50)).toEqual(b.orders.slice(0, 50));
  });

  it("never creates orders in the future", async () => {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(orders)
      .where(sql`${orders.createdAt} > ${NOW}`);
    expect(n).toBe(0);
  });
});

describe("tenant isolation", () => {
  it("only returns rows for the requested store", async () => {
    const list = await listOrders(db, nakhla, 10_000);
    expect(list.length).toBeGreaterThan(1000);
    expect(list.every((o) => o.number.startsWith("NK-"))).toBe(true);
    const items = await listProducts(db, souq, NOW);
    expect(items.every((p) => p.sku.startsWith("ST-"))).toBe(true);
  });

  it("cannot update another store's order", async () => {
    const [foreign] = await db.select().from(orders).where(eq(orders.storeId, souq)).limit(1);
    await expect(updateOrderStatus(db, nakhla, foreign.id, "cancelled", actor)).rejects.toThrow(
      "Order not found.",
    );
  });
});

describe("analytics", () => {
  it("KPIs agree with the daily series", async () => {
    const [kpis, series] = await Promise.all([
      getKpis(db, nakhla, 30, NOW),
      getRevenueSeries(db, nakhla, 30, NOW),
    ]);
    expect(series).toHaveLength(30);
    const seriesRevenue = series.reduce((s, p) => s + p.revenue, 0);
    // The series is bucketed by calendar day, so it can include a few hours more than the rolling window.
    expect(Math.abs(seriesRevenue - kpis.revenue.current) / kpis.revenue.current).toBeLessThan(
      0.06,
    );
    expect(kpis.aov.current).toBe(
      Math.round(kpis.revenue.current / (await paidOrders(nakhla, 30))),
    );
  });

  it("ranks top products by revenue", async () => {
    const top = await getTopProducts(db, nakhla, 30, 5, NOW);
    expect(top).toHaveLength(5);
    for (let i = 1; i < top.length; i++)
      expect(top[i - 1].revenue).toBeGreaterThanOrEqual(top[i].revenue);
  });
});

async function paidOrders(storeId: number, days: number) {
  const from = new Date(NOW.getTime() - days * 86_400_000);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(
      and(
        eq(orders.storeId, storeId),
        sql`${orders.createdAt} >= ${from} and ${orders.createdAt} < ${NOW}`,
        sql`${orders.status} in ('paid','shipped','delivered')`,
      ),
    );
  return n;
}

describe("mutations", () => {
  it("moves an order forward and rejects invalid transitions", async () => {
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.storeId, nakhla), eq(orders.status, "delivered")))
      .limit(1);
    await expect(updateOrderStatus(db, nakhla, order.id, "pending", actor)).rejects.toBeInstanceOf(
      DomainError,
    );
    const updated = await updateOrderStatus(db, nakhla, order.id, "refunded", actor);
    expect(updated.status).toBe("refunded");
  });

  it("never lets stock go below zero", async () => {
    const [p] = await db.select().from(products).where(eq(products.storeId, nakhla)).limit(1);
    const row = await adjustStock(db, nakhla, p.id, -1000, actor);
    expect(row.stock).toBe(0);
    await expect(adjustStock(db, nakhla, p.id, 0.5, actor)).rejects.toBeInstanceOf(DomainError);
  });

  it("keeps at least one owner", async () => {
    const [owner] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.storeId, nakhla), eq(memberships.role, "owner")));
    await expect(changeMemberRole(db, nakhla, owner.userId, "viewer", actor)).rejects.toThrow(
      "at least one owner",
    );
  });

  it("creates simulated orders with the next number", async () => {
    const before = await listOrders(db, nakhla, 1);
    const created = await createSimulatedOrder(db, nakhla, createRandom(7), NOW);
    const next = Number(before[0].number.split("-")[1]) + 1;
    expect(created.number).toBe(`NK-${next}`);
    expect(created.total).toBeGreaterThan(0);
  });
});
