import "server-only";
import { getDb } from "@/db/client";
import type { OrderStatus } from "@/db/schema";
import { createRandom } from "@/lib/random";
import { createSimulatedOrder } from "./mutations";
import type { OrderRow } from "./queries";

export type LiveOrder = Omit<OrderRow, "createdAt"> & { createdAt: string };
export type LiveEvent =
  | { type: "order.created"; order: LiveOrder }
  | { type: "order.updated"; id: number; status: OrderStatus }
  | { type: "stock.updated"; productId: number; stock: number };

type Listener = (event: LiveEvent) => void;
type Channel = { listeners: Set<Listener>; timer?: ReturnType<typeof setTimeout> };

/**
 * In-process pub/sub. Good for a single instance and for the demo; swap for
 * Postgres LISTEN/NOTIFY or Redis when running several instances.
 */
const globalForLive = globalThis as unknown as { sahmLive?: Map<number, Channel> };
const channels: Map<number, Channel> = (globalForLive.sahmLive ??= new Map());
const rand = createRandom(Date.now() % 2 ** 31);

export function toLiveOrder(order: OrderRow): LiveOrder {
  return { ...order, createdAt: order.createdAt.toISOString() };
}

export function publish(storeId: number, event: LiveEvent) {
  channels.get(storeId)?.listeners.forEach((listener) => listener(event));
}

function scheduleSimulation(storeId: number, channel: Channel) {
  const delay = 7_000 + Math.floor(rand.next() * 9_000);
  channel.timer = setTimeout(async () => {
    try {
      const order = await createSimulatedOrder(await getDb(), storeId, rand);
      publish(storeId, { type: "order.created", order: toLiveOrder(order) });
    } catch (error) {
      console.error("[live] simulation failed", error);
    }
    if (channel.listeners.size) scheduleSimulation(storeId, channel);
  }, delay);
}

export function subscribe(storeId: number, listener: Listener) {
  let channel = channels.get(storeId);
  if (!channel) {
    channel = { listeners: new Set() };
    channels.set(storeId, channel);
  }
  channel.listeners.add(listener);
  if (channel.listeners.size === 1 && process.env.LIVE_SIMULATION !== "off") {
    scheduleSimulation(storeId, channel);
  }
  return () => {
    channel.listeners.delete(listener);
    if (!channel.listeners.size && channel.timer) {
      clearTimeout(channel.timer);
      channel.timer = undefined;
    }
  };
}
