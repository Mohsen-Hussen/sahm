"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { orderStatusEnum, roleEnum } from "@/db/schema";
import { authorize, ForbiddenError } from "@/server/auth";
import { publish } from "@/server/live";
import { adjustStock, changeMemberRole, DomainError, updateOrderStatus } from "@/server/mutations";

export type ActionResult = { ok: true } | { ok: false; error: string };

const id = z.coerce.number().int().positive();

/** Turns expected failures into a message for the UI; anything else is a real bug. */
async function run(slug: string, work: () => Promise<void>): Promise<ActionResult> {
  try {
    await work();
    revalidatePath(`/s/${slug}`, "layout");
    return { ok: true };
  } catch (error) {
    if (
      error instanceof ForbiddenError ||
      error instanceof DomainError ||
      error instanceof z.ZodError
    ) {
      return { ok: false, error: error instanceof z.ZodError ? "Invalid input." : error.message };
    }
    throw error;
  }
}

export async function setOrderStatus(slug: string, orderId: number, status: string) {
  return run(slug, async () => {
    const input = z
      .object({ orderId: id, status: z.enum(orderStatusEnum.enumValues) })
      .parse({ orderId, status });
    const { store, user } = await authorize(slug, "orders:update");
    await updateOrderStatus(await getDb(), store.id, input.orderId, input.status, user);
    publish(store.id, { type: "order.updated", id: input.orderId, status: input.status });
  });
}

export async function changeStock(slug: string, productId: number, delta: number) {
  return run(slug, async () => {
    const input = z.object({ productId: id, delta: z.number().int() }).parse({ productId, delta });
    const { store, user } = await authorize(slug, "inventory:update");
    const row = await adjustStock(await getDb(), store.id, input.productId, input.delta, user);
    publish(store.id, { type: "stock.updated", productId: input.productId, stock: row.stock });
  });
}

export async function setMemberRole(slug: string, userId: number, role: string) {
  return run(slug, async () => {
    const input = z
      .object({ userId: id, role: z.enum(roleEnum.enumValues) })
      .parse({ userId, role });
    const { store, user } = await authorize(slug, "team:manage");
    await changeMemberRole(await getDb(), store.id, input.userId, input.role, user);
  });
}
