import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { memberships, stores, users, type Role } from "@/db/schema";
import { can, type Permission } from "@/lib/permissions";
import { readSessionUserId } from "./session";

export type CurrentUser = { id: number; name: string; email: string };
export type StoreSummary = { slug: string; name: string; accent: string; role: Role };
export type StoreAccess = {
  user: CurrentUser;
  role: Role;
  store: typeof stores.$inferSelect;
};

/** Data Access Layer: every protected read and write goes through these helpers. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const userId = await readSessionUserId();
  if (!userId) return null;
  const db = await getDb();
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId));
  return user ?? null;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export const getUserStores = cache(async (userId: number): Promise<StoreSummary[]> => {
  const db = await getDb();
  return db
    .select({ slug: stores.slug, name: stores.name, accent: stores.accent, role: memberships.role })
    .from(memberships)
    .innerJoin(stores, eq(stores.id, memberships.storeId))
    .where(eq(memberships.userId, userId))
    .orderBy(asc(stores.id));
});

/**
 * Resolves the store for the signed-in user. Non-members get a 404 rather than
 * a 403, so the response never reveals which store slugs exist.
 */
export const getStoreAccess = cache(async (slug: string): Promise<StoreAccess> => {
  const user = await requireUser();
  const db = await getDb();
  const [row] = await db
    .select({ store: stores, role: memberships.role })
    .from(stores)
    .innerJoin(
      memberships,
      and(eq(memberships.storeId, stores.id), eq(memberships.userId, user.id)),
    )
    .where(eq(stores.slug, slug));
  if (!row) notFound();
  return { user, role: row.role, store: row.store };
});

export class ForbiddenError extends Error {
  constructor(permission: Permission) {
    super(`Your role does not allow "${permission}".`);
    this.name = "ForbiddenError";
  }
}

export async function authorize(slug: string, permission: Permission) {
  const access = await getStoreAccess(slug);
  if (!can(access.role, permission)) throw new ForbiddenError(permission);
  return access;
}
