import type { Channel, OrderStatus, Role } from "./schema";
import { createRandom } from "@/lib/random";

/**
 * Deterministic demo dataset. Dates are generated relative to `now`, so the
 * dashboard always looks current no matter when the app boots.
 */

export const DEMO_PASSWORD = "demo1234";

type StoreSeed = {
  slug: string;
  name: string;
  category: string;
  city: string;
  accent: string;
  prefix: string;
  ordersPerDay: number;
  districts: readonly string[];
  channels: readonly (readonly [Channel, number])[];
  products: readonly (readonly [name: string, category: string, priceSar: number])[];
};

export const STORE_SEEDS: readonly StoreSeed[] = [
  {
    slug: "nakhla",
    name: "Nakhla Coffee Roasters",
    category: "Specialty coffee",
    city: "Riyadh",
    accent: "#0f766e",
    prefix: "NK",
    ordersPerDay: 14,
    districts: [
      "Al Olaya",
      "Al Malqa",
      "Al Nakheel",
      "Hittin",
      "Al Yasmin",
      "Al Rawdah",
      "Qurtubah",
    ],
    channels: [
      ["web", 5],
      ["mobile", 4],
      ["marketplace", 1],
    ],
    products: [
      ["Ethiopia Yirgacheffe · 250 g", "Beans", 69],
      ["Colombia Huila · 250 g", "Beans", 62],
      ["Saudi Khawlani · 250 g", "Beans", 85],
      ["House Espresso Blend · 1 kg", "Beans", 189],
      ["Cardamom Arabic Coffee · 500 g", "Beans", 55],
      ["Cold Brew Bottle · 330 ml", "Drinks", 18],
      ["V60 Dripper", "Brewing gear", 95],
      ["Paper Filters · 100 pcs", "Brewing gear", 29],
      ["Hand Grinder", "Brewing gear", 349],
      ["Gooseneck Kettle", "Brewing gear", 279],
      ["Coffee & Dates Gift Box", "Gifts", 139],
      ["Barista Starter Kit", "Gifts", 229],
    ],
  },
  {
    slug: "souq-tech",
    name: "Souq Tech",
    category: "Consumer electronics",
    city: "Jeddah",
    accent: "#4f46e5",
    prefix: "ST",
    ordersPerDay: 9,
    districts: ["Al Rawdah", "Al Shati", "Al Hamra", "Al Salamah", "Obhur", "Al Zahra"],
    channels: [
      ["web", 4],
      ["mobile", 3],
      ["marketplace", 3],
    ],
    products: [
      ["Wireless Earbuds Pro", "Audio", 399],
      ["Bluetooth Speaker", "Audio", 329],
      ["65 W USB-C Charger", "Power", 149],
      ["20,000 mAh Power Bank", "Power", 189],
      ["Smart Watch S2", "Wearables", 899],
      ["Mechanical Keyboard", "Peripherals", 459],
      ["Wireless Gaming Mouse", "Peripherals", 229],
      ['27" QHD Monitor', "Displays", 1299],
      ["1080p Webcam", "Peripherals", 249],
      ["Aluminium Laptop Stand", "Accessories", 169],
      ["MagSafe Phone Case", "Accessories", 79],
      ["Braided HDMI 2.1 Cable", "Accessories", 49],
    ],
  },
  {
    slug: "ward",
    name: "Ward Flowers",
    category: "Flowers & gifts",
    city: "Dammam",
    accent: "#e11d48",
    prefix: "WD",
    ordersPerDay: 11,
    districts: ["Al Faisaliyah", "Al Shati", "Al Mazruiyah", "Al Nuzha", "Al Hamra", "Uhud"],
    channels: [
      ["web", 3],
      ["mobile", 6],
      ["marketplace", 1],
    ],
    products: [
      ["Red Roses Bouquet", "Bouquets", 249],
      ["Seasonal Mixed Bouquet", "Bouquets", 199],
      ["Lily Arrangement", "Bouquets", 279],
      ["Tulip Box", "Boxes", 299],
      ["Luxury Rose Dome", "Boxes", 699],
      ["Sunflower Basket", "Boxes", 229],
      ["Phalaenopsis Orchid Pot", "Plants", 349],
      ["Baby's Breath Jar", "Plants", 129],
      ["Oud & Rose Gift Set", "Gifts", 459],
      ["Belgian Chocolate Add-on", "Add-ons", 89],
      ["Balloon Bundle", "Add-ons", 79],
      ["Greeting Card", "Add-ons", 19],
    ],
  },
];

export const USER_SEEDS: readonly {
  email: string;
  name: string;
  memberships: readonly (readonly [slug: string, role: Role])[];
}[] = [
  {
    email: "sara@sahm.app",
    name: "Sara Al-Qahtani",
    memberships: [
      ["nakhla", "owner"],
      ["souq-tech", "owner"],
      ["ward", "owner"],
    ],
  },
  {
    email: "omar@sahm.app",
    name: "Omar Haddad",
    memberships: [
      ["nakhla", "manager"],
      ["souq-tech", "viewer"],
    ],
  },
  {
    email: "lina@sahm.app",
    name: "Lina Mansour",
    memberships: [["nakhla", "viewer"]],
  },
  {
    email: "khalid@sahm.app",
    name: "Khalid Otaibi",
    memberships: [
      ["souq-tech", "manager"],
      ["ward", "manager"],
    ],
  },
];

const FIRST_NAMES = [
  "Abdullah",
  "Mohammed",
  "Fahad",
  "Faisal",
  "Nasser",
  "Saud",
  "Turki",
  "Yousef",
  "Majed",
  "Rakan",
  "Noura",
  "Reem",
  "Hessa",
  "Lama",
  "Jood",
  "Dana",
  "Shahad",
  "Haya",
  "Maha",
  "Razan",
] as const;
const LAST_NAMES = [
  "Al-Harbi",
  "Al-Ghamdi",
  "Al-Zahrani",
  "Al-Shehri",
  "Al-Dosari",
  "Al-Mutairi",
  "Al-Subaie",
  "Al-Anazi",
  "Al-Shammari",
  "Al-Malki",
  "Al-Juhani",
  "Al-Qurashi",
] as const;

const DAY_MS = 86_400_000;
export const HISTORY_DAYS = 180;
const CUSTOMERS_PER_STORE = 320;

/** Thursday/Friday evenings are busy; mornings are quiet. */
const WEEKDAY_FACTOR = [1.05, 0.85, 0.9, 0.95, 1.2, 1.35, 1.1] as const;
const HOUR_WEIGHTS = Array.from({ length: 24 }, (_, h) => [
  h,
  h < 7 ? 0.2 : h < 12 ? 0.8 : h < 17 ? 1 : h < 23 ? 1.9 : 0.7,
]) as unknown as readonly (readonly [number, number])[];

export type SeedCustomer = {
  id: number;
  storeIndex: number;
  name: string;
  city: string;
  createdAt: Date;
};
export type SeedProduct = {
  id: number;
  storeIndex: number;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  reorderLevel: number;
};
export type SeedOrder = {
  id: number;
  storeIndex: number;
  number: string;
  customerId: number;
  status: OrderStatus;
  channel: Channel;
  total: number;
  items: number;
  createdAt: Date;
};
export type SeedOrderItem = {
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
};

function statusForAge(ageDays: number, roll: number): OrderStatus {
  if (ageDays < 0.1) return roll < 0.55 ? "pending" : "paid";
  if (ageDays < 1)
    return roll < 0.15 ? "pending" : roll < 0.6 ? "paid" : roll < 0.97 ? "shipped" : "cancelled";
  if (ageDays < 4)
    return roll < 0.25
      ? "shipped"
      : roll < 0.9
        ? "delivered"
        : roll < 0.96
          ? "cancelled"
          : "refunded";
  return roll < 0.9 ? "delivered" : roll < 0.95 ? "cancelled" : "refunded";
}

export function buildSeed(now: Date = new Date()) {
  const rand = createRandom(20261120);
  const customers: SeedCustomer[] = [];
  const products: SeedProduct[] = [];
  const orders: SeedOrder[] = [];
  const items: SeedOrderItem[] = [];
  const start = now.getTime() - HISTORY_DAYS * DAY_MS;

  STORE_SEEDS.forEach((store, storeIndex) => {
    const storeCustomers: SeedCustomer[] = [];
    for (let i = 0; i < CUSTOMERS_PER_STORE; i++) {
      const c: SeedCustomer = {
        id: customers.length + 1,
        storeIndex,
        name: `${rand.pick(FIRST_NAMES)} ${rand.pick(LAST_NAMES)}`,
        city: `${rand.pick(store.districts)}, ${store.city}`,
        createdAt: new Date(start + rand.next() * HISTORY_DAYS * DAY_MS),
      };
      customers.push(c);
      storeCustomers.push(c);
    }

    const storeProducts = store.products.map(([name, category, priceSar], i) => {
      const reorderLevel = rand.int(8, 20);
      // A few items are deliberately low so the "low stock" panel has something to show.
      const stock = i % 5 === 2 ? rand.int(0, reorderLevel - 1) : rand.int(reorderLevel + 5, 160);
      const p: SeedProduct = {
        id: products.length + 1,
        storeIndex,
        sku: `${store.prefix}-${String(101 + i)}`,
        name,
        category,
        price: priceSar * 100,
        stock,
        reorderLevel,
      };
      products.push(p);
      return p;
    });
    // Popularity skew: earlier catalogue entries sell more.
    const productWeights = storeProducts.map((p, i) => [p, 1 / (1 + i * 0.35)] as const);

    let sequence = 10001;
    for (let day = HISTORY_DAYS; day >= 0; day--) {
      const dayStart = new Date(now.getTime() - day * DAY_MS);
      dayStart.setHours(0, 0, 0, 0);
      const growth = 0.75 + 0.45 * (1 - day / HISTORY_DAYS);
      const expected = store.ordersPerDay * growth * WEEKDAY_FACTOR[dayStart.getDay()];
      const count = Math.max(0, Math.round(expected + (rand.next() - 0.5) * expected * 0.5));

      const dayOrders: Date[] = [];
      for (let i = 0; i < count; i++) {
        const hour = rand.weighted(HOUR_WEIGHTS);
        const at = new Date(dayStart.getTime() + hour * 3_600_000 + rand.int(0, 3_599) * 1000);
        if (at <= now) dayOrders.push(at);
      }
      dayOrders.sort((a, b) => a.getTime() - b.getTime());

      for (const createdAt of dayOrders) {
        const orderId = orders.length + 1;
        const lines = rand.weighted([
          [1, 6],
          [2, 3],
          [3, 1.5],
          [4, 0.5],
        ] as const);
        const chosen = new Set<SeedProduct>();
        while (chosen.size < lines) chosen.add(rand.weighted(productWeights));
        let total = 0;
        let qtyTotal = 0;
        for (const product of chosen) {
          const quantity = rand.weighted([
            [1, 7],
            [2, 2.5],
            [3, 0.5],
          ] as const);
          items.push({ orderId, productId: product.id, quantity, unitPrice: product.price });
          total += quantity * product.price;
          qtyTotal += quantity;
        }
        const ageDays = (now.getTime() - createdAt.getTime()) / DAY_MS;
        orders.push({
          id: orderId,
          storeIndex,
          number: `${store.prefix}-${sequence++}`,
          customerId: rand.pick(storeCustomers).id,
          status: statusForAge(ageDays, rand.next()),
          channel: rand.weighted(store.channels),
          total,
          items: qtyTotal,
          createdAt,
        });
      }
    }
  });

  return { customers, products, orders, items };
}
