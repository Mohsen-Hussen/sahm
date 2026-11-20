import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import {
  activity,
  customers,
  memberships,
  orderItems,
  orders,
  products,
  users,
  type Channel,
  type OrderStatus,
} from "@/db/schema";

/**
 * Read models for the dashboard. Every query takes an explicit `storeId`, so
 * tenant isolation is enforced in one place and is easy to test.
 */

export const BUSINESS_TZ = "Asia/Riyadh";
export const REVENUE_STATUSES: OrderStatus[] = ["paid", "shipped", "delivered"];
const DAY_MS = 86_400_000;

export type Period = { from: Date; to: Date };

export function periods(days: number, now = new Date()) {
  const current: Period = { from: new Date(now.getTime() - days * DAY_MS), to: now };
  const previous: Period = { from: new Date(now.getTime() - 2 * days * DAY_MS), to: current.from };
  return { current, previous };
}

const inPeriod = (p: Period) => and(gte(orders.createdAt, p.from), lt(orders.createdAt, p.to));
const isRevenue = inArray(orders.status, REVENUE_STATUSES);

async function periodTotals(db: Database, storeId: number, p: Period) {
  const [row] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${orders.total}) filter (where ${isRevenue}), 0)::int`,
      paidOrders: sql<number>`count(*) filter (where ${isRevenue})::int`,
      orders: sql<number>`count(*)::int`,
      refunded: sql<number>`count(*) filter (where ${orders.status} = 'refunded')::int`,
      customers: sql<number>`count(distinct ${orders.customerId})::int`,
    })
    .from(orders)
    .where(and(eq(orders.storeId, storeId), inPeriod(p)));
  return row;
}

export type Kpis = Awaited<ReturnType<typeof getKpis>>;

export async function getKpis(db: Database, storeId: number, days: number, now = new Date()) {
  const { current, previous } = periods(days, now);
  const [cur, prev] = await Promise.all([
    periodTotals(db, storeId, current),
    periodTotals(db, storeId, previous),
  ]);
  const aov = (t: typeof cur) => (t.paidOrders ? Math.round(t.revenue / t.paidOrders) : 0);
  const refundRate = (t: typeof cur) => (t.orders ? (t.refunded / t.orders) * 100 : 0);
  return {
    revenue: { current: cur.revenue, previous: prev.revenue },
    orders: { current: cur.orders, previous: prev.orders },
    aov: { current: aov(cur), previous: aov(prev) },
    customers: { current: cur.customers, previous: prev.customers },
    refundRate: { current: refundRate(cur), previous: refundRate(prev) },
  };
}

/** YYYY-MM-DD in the business time zone. */
export function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ }).format(date);
}

export type SeriesPoint = { day: string; revenue: number; orders: number; previousRevenue: number };

export async function getRevenueSeries(
  db: Database,
  storeId: number,
  days: number,
  now = new Date(),
): Promise<SeriesPoint[]> {
  const { current, previous } = periods(days, now);
  const bucket = sql<string>`to_char(${orders.createdAt} at time zone ${sql.raw(`'${BUSINESS_TZ}'`)}, 'YYYY-MM-DD')`;
  const query = (p: Period) =>
    db
      .select({
        day: bucket,
        revenue: sql<number>`coalesce(sum(${orders.total}) filter (where ${isRevenue}), 0)::int`,
        orders: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(and(eq(orders.storeId, storeId), inPeriod(p)))
      .groupBy(bucket);
  const [cur, prev] = await Promise.all([query(current), query(previous)]);
  const curMap = new Map(cur.map((r) => [r.day, r]));
  const prevMap = new Map(prev.map((r) => [r.day, r]));

  const points: SeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = dayKey(new Date(now.getTime() - i * DAY_MS));
    const prevDay = dayKey(new Date(now.getTime() - (i + days) * DAY_MS));
    points.push({
      day,
      revenue: curMap.get(day)?.revenue ?? 0,
      orders: curMap.get(day)?.orders ?? 0,
      previousRevenue: prevMap.get(prevDay)?.revenue ?? 0,
    });
  }
  return points;
}

export async function getChannelBreakdown(
  db: Database,
  storeId: number,
  days: number,
  now = new Date(),
) {
  const { current } = periods(days, now);
  const rows = await db
    .select({
      channel: orders.channel,
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
      orders: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(and(eq(orders.storeId, storeId), inPeriod(current), isRevenue))
    .groupBy(orders.channel);
  const order: Channel[] = ["web", "mobile", "marketplace"];
  return order.map(
    (channel) => rows.find((r) => r.channel === channel) ?? { channel, revenue: 0, orders: 0 },
  );
}

export async function getTopProducts(
  db: Database,
  storeId: number,
  days: number,
  limit = 5,
  now = new Date(),
) {
  const { current } = periods(days, now);
  const revenue = sql<number>`sum(${orderItems.quantity} * ${orderItems.unitPrice})::int`;
  return db
    .select({
      id: products.id,
      name: products.name,
      category: products.category,
      units: sql<number>`sum(${orderItems.quantity})::int`,
      revenue,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(and(eq(orders.storeId, storeId), inPeriod(current), isRevenue))
    .groupBy(products.id, products.name, products.category)
    .orderBy(desc(revenue))
    .limit(limit);
}

export async function getLowStock(db: Database, storeId: number) {
  return db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      stock: products.stock,
      reorderLevel: products.reorderLevel,
    })
    .from(products)
    .where(and(eq(products.storeId, storeId), sql`${products.stock} <= ${products.reorderLevel}`))
    .orderBy(asc(products.stock));
}

const orderColumns = {
  id: orders.id,
  number: orders.number,
  status: orders.status,
  channel: orders.channel,
  total: orders.total,
  items: orders.items,
  createdAt: orders.createdAt,
  customer: customers.name,
  city: customers.city,
};

export type OrderRow = {
  id: number;
  number: string;
  status: OrderStatus;
  channel: Channel;
  total: number;
  items: number;
  createdAt: Date;
  customer: string;
  city: string;
};

export async function listOrders(db: Database, storeId: number, limit = 5000): Promise<OrderRow[]> {
  return db
    .select(orderColumns)
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(eq(orders.storeId, storeId))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

export async function getOrder(db: Database, storeId: number, orderId: number) {
  const [row] = await db
    .select(orderColumns)
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(and(eq(orders.storeId, storeId), eq(orders.id, orderId)));
  return row ?? null;
}

export async function getStatusCounts(db: Database, storeId: number) {
  const rows = await db
    .select({ status: orders.status, count: sql<number>`count(*)::int` })
    .from(orders)
    .where(eq(orders.storeId, storeId))
    .groupBy(orders.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.count])) as Partial<
    Record<OrderStatus, number>
  >;
}

export async function listProducts(db: Database, storeId: number, now = new Date()) {
  const { current } = periods(30, now);
  const sold = db
    .select({
      productId: orderItems.productId,
      units: sql<number>`sum(${orderItems.quantity})::int`.as("units"),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orders.storeId, storeId), inPeriod(current), isRevenue))
    .groupBy(orderItems.productId)
    .as("sold");
  return db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      category: products.category,
      price: products.price,
      stock: products.stock,
      reorderLevel: products.reorderLevel,
      sold30d: sql<number>`coalesce(${sold.units}, 0)::int`,
    })
    .from(products)
    .leftJoin(sold, eq(sold.productId, products.id))
    .where(eq(products.storeId, storeId))
    .orderBy(asc(products.sku));
}

export type ProductRow = Awaited<ReturnType<typeof listProducts>>[number];

export async function listMembers(db: Database, storeId: number) {
  return db
    .select({ userId: users.id, name: users.name, email: users.email, role: memberships.role })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.storeId, storeId))
    .orderBy(asc(users.id));
}

export type MemberRow = Awaited<ReturnType<typeof listMembers>>[number];

export async function getActivity(db: Database, storeId: number, limit = 8) {
  return db
    .select({
      id: activity.id,
      actor: activity.actor,
      message: activity.message,
      createdAt: activity.createdAt,
    })
    .from(activity)
    .where(eq(activity.storeId, storeId))
    .orderBy(desc(activity.createdAt), desc(activity.id))
    .limit(limit);
}
