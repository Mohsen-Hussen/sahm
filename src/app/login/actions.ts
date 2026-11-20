"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { createSession, destroySession } from "@/server/session";

const LoginSchema = z.object({
  email: z.email("Enter a valid email address.").transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

export type LoginState = { error?: string; email?: string };

/** Only allow same-site relative redirects after sign-in. */
function safeNext(next: string | undefined) {
  return next && next.startsWith("/s/") && !next.startsWith("//") ? next : "/";
}

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };

  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email));
  // Same message for unknown email and wrong password, so accounts can't be enumerated.
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Email or password is incorrect.", email };
  }
  await createSession(user.id);
  redirect(safeNext(parsed.data.next));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
