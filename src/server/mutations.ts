import { and, count, eq, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import {
  activity,
  customers,
  memberships,
  orderItems,
  orders,
  products,
  type Channel,
  type OrderStatus,
  type Role,
} from "@/db/schema";
import { canTransition } from "@/lib/permissions";
import type { Random } from "@/lib/random";
import { getOrder, type OrderRow } from "./queries";

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

type Actor = { id: number; name: string };

export async function updateOrderStatus(
  db: Database,
  storeId: number,
  orderId: number,
  to: OrderStatus,
  actor: Actor,
) {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({ status: orders.status, number: orders.number })
      .from(orders)
      .where(and(eq(orders.storeId, storeId), eq(orders.id, orderId)))
      .for("update");
    if (!order) throw new DomainError("Order not found.");
    if (order.status === to) return order;
    if (!canTransition(order.status, to)) {
      throw new DomainError(`An order that is ${order.status} cannot be marked ${to}.`);
    }
    await tx.update(orders).set({ status: to }).where(eq(orders.id, orderId));
    await tx.insert(activity).values({
      storeId,
      actor: actor.name,
      message: `Marked order ${order.number} as ${to}`,
    });
    return { ...order, status: to };
  });
}

export async function adjustStock(
  db: Database,
  storeId: number,
  productId: number,
  delta: number,
  actor: Actor,
) {
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 1000) {
    throw new DomainError("Adjustment must be a whole number between -1000 and 1000.");
  }
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(products)
      .set({ stock: sql`greatest(${products.stock} + ${delta}, 0)` })
      .where(and(eq(products.storeId, storeId), eq(products.id, productId)))
      .returning({ name: products.name, stock: products.stock });
    if (!row) throw new DomainError("Product not found.");
    await tx.insert(activity).values({
      storeId,
      actor: actor.name,
      message: `${delta > 0 ? "Restocked" : "Removed"} ${Math.abs(delta)} × ${row.name}`,
    });
    return row;
  });
}

async function ownerCount(db: Database, storeId: number) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(memberships)
    .where(and(eq(memberships.storeId, storeId), eq(memberships.role, "owner")));
  return n;
}

export async function changeMemberRole(
  db: Database,
  storeId: number,
  targetUserId: number,
  role: Role,
  actor: Actor,
) {
  return db.transaction(async (tx) => {
    const tdb = tx as unknown as Database;
    const [member] = await tx
      .select({ role: memberships.role })
      .from(memberships)
      .where(and(eq(memberships.storeId, storeId), eq(memberships.userId, targetUserId)));
    if (!member) throw new DomainError("Member not found.");
    if (member.role === "owner" && role !== "owner" && (await ownerCount(tdb, storeId)) <= 1) {
      throw new DomainError("A store needs at least one owner.");
    }
    await tx
      .update(memberships)
      .set({ role })
      .where(and(eq(memberships.storeId, storeId), eq(memberships.userId, targetUserId)));
    await tx.insert(activity).values({
      storeId,
      actor: actor.name,
      message: `Changed a team member's role to ${role}`,
    });
  });
}

/** Creates a plausible new order — used by the live demo feed. */
export async function createSimulatedOrder(
  db: Database,
  storeId: number,
  rand: Random,
  now = new Date(),
): Promise<OrderRow> {
  const catalogue = await db
    .select({ id: products.id, price: products.price })
    .from(products)
    .where(eq(products.storeId, storeId));
  const shoppers = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.storeId, storeId))
    .limit(400);
  if (!catalogue.length || !shoppers.length) throw new DomainError("Store has no catalogue.");

  return db
    .transaction(async (tx) => {
      const [{ prefix, next }] = await tx
        .select({
          prefix: sql<string>`split_part(max(${orders.number}), '-', 1)`,
          next: sql<number>`(max(split_part(${orders.number}, '-', 2)::int) + 1)::int`,
        })
        .from(orders)
        .where(eq(orders.storeId, storeId));

      const lines = new Map<number, { price: number; quantity: number }>();
      const lineCount = rand.weighted([
        [1, 6],
        [2, 3],
        [3, 1],
      ] as const);
      while (lines.size < Math.min(lineCount, catalogue.length)) {
        const p = rand.pick(catalogue);
        lines.set(p.id, {
          price: p.price,
          quantity: rand.weighted([
            [1, 8],
            [2, 2],
          ] as const),
        });
      }
      const total = [...lines.values()].reduce((s, l) => s + l.price * l.quantity, 0);
      const items = [...lines.values()].reduce((s, l) => s + l.quantity, 0);
      const channel = rand.weighted<Channel>([
        ["web", 4],
        ["mobile", 5],
        ["marketplace", 1],
      ]);

      const [created] = await tx
        .insert(orders)
        .values({
          storeId,
          number: `${prefix || "SO"}-${next ?? 10001}`,
          customerId: rand.pick(shoppers).id,
          status: rand.next() < 0.6 ? "paid" : "pending",
          channel,
          total,
          items,
          createdAt: now,
        })
        .returning({ id: orders.id });
      await tx.insert(orderItems).values(
        [...lines.entries()].map(([productId, l]) => ({
          orderId: created.id,
          productId,
          quantity: l.quantity,
          unitPrice: l.price,
        })),
      );
      for (const [productId, l] of lines) {
        await tx
          .update(products)
          .set({ stock: sql`greatest(${products.stock} - ${l.quantity}, 0)` })
          .where(and(eq(products.storeId, storeId), eq(products.id, productId)));
      }
      return created.id;
    })
    .then(async (id) => (await getOrder(db, storeId, id))!);
}
