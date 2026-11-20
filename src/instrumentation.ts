/** Warm the database (and seed the demo data) when the server boots, not on the first request. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getDb } = await import("./db/client");
    await getDb();
  }
}
