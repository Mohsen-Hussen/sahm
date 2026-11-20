import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { memberships, stores } from "@/db/schema";
import { readSessionUserId } from "@/server/session";
import { subscribe, type LiveEvent } from "@/server/live";

export const dynamic = "force-dynamic";

/** Server-Sent Events stream of new orders and status changes for one store. */
export async function GET(request: Request, ctx: RouteContext<"/api/stores/[store]/live">) {
  const { store: slug } = await ctx.params;
  const userId = await readSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const db = await getDb();
  const [row] = await db
    .select({ id: stores.id })
    .from(stores)
    .innerJoin(memberships, and(eq(memberships.storeId, stores.id), eq(memberships.userId, userId)))
    .where(eq(stores.slug, slug));
  if (!row) return new Response("Not found", { status: 404 });

  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      send("retry: 5000\n\n");
      const unsubscribe = subscribe(row.id, (event: LiveEvent) =>
        send(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`),
      );
      // Comments keep proxies from closing an idle connection.
      const heartbeat = setInterval(() => send(": ping\n\n"), 20_000);
      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
      request.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
