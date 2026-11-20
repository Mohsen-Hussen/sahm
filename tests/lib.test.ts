import { describe, expect, it } from "vitest";
import { can, canTransition, ORDER_TRANSITIONS } from "@/lib/permissions";
import { formatMoney, formatPercent, percentChange } from "@/lib/money";
import { toCsv } from "@/lib/csv";
import { tenantFromHost } from "@/lib/tenant";
import { hashPassword, verifyPassword } from "@/lib/password";
import { daysOfCover } from "@/lib/inventory";
import { createRandom } from "@/lib/random";

describe("permissions", () => {
  it("lets every role read but only owners manage the team", () => {
    expect(can("viewer", "orders:read")).toBe(true);
    expect(can("viewer", "orders:update")).toBe(false);
    expect(can("manager", "inventory:update")).toBe(true);
    expect(can("manager", "team:manage")).toBe(false);
    expect(can("owner", "team:manage")).toBe(true);
  });

  it("only allows forward order transitions", () => {
    expect(canTransition("pending", "paid")).toBe(true);
    expect(canTransition("delivered", "pending")).toBe(false);
    expect(canTransition("refunded", "paid")).toBe(false);
    expect(ORDER_TRANSITIONS.cancelled).toHaveLength(0);
  });
});

describe("money", () => {
  it("formats halalas as riyals", () => {
    expect(formatMoney(123456)).toMatch(/1,234\.56/);
    expect(formatMoney(150_000_00, "SAR", { compact: true })).toMatch(/150K/);
  });

  it("computes period-over-period change", () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(5, 0)).toBeNull();
    expect(formatPercent(12.345)).toBe("+12.3%");
    expect(formatPercent(-4)).toBe("-4.0%");
    expect(formatPercent(null)).toBe("—");
  });
});

describe("csv", () => {
  it("quotes separators and neutralises formulas", () => {
    const csv = toCsv(
      ["a", "b"],
      [
        ["x,y", 'say "hi"'],
        ["=SUM(A1)", -12.5],
      ],
    );
    expect(csv).toBe('a,b\r\n"x,y","say ""hi"""\r\n\'=SUM(A1),-12.5');
  });
});

describe("tenant", () => {
  it("reads the store slug from a subdomain", () => {
    expect(tenantFromHost("nakhla.sahm.app", "sahm.app")).toBe("nakhla");
    expect(tenantFromHost("souq-tech.localhost:3000", "localhost:3000")).toBe("souq-tech");
    expect(tenantFromHost("sahm.app", "sahm.app")).toBeNull();
    expect(tenantFromHost("www.sahm.app", "sahm.app")).toBeNull();
    expect(tenantFromHost("a.b.sahm.app", "sahm.app")).toBeNull();
    expect(tenantFromHost("evil.com", "sahm.app")).toBeNull();
    expect(tenantFromHost("nakhla.sahm.app", undefined)).toBeNull();
  });
});

describe("password", () => {
  it("verifies the right password only", async () => {
    const hash = await hashPassword("s3cret", 1000);
    expect(hash).toMatch(/^pbkdf2\$1000\$/);
    expect(await verifyPassword("s3cret", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
    expect(await verifyPassword("s3cret", "garbage")).toBe(false);
  });
});

describe("inventory", () => {
  it("projects days of cover from the 30-day pace", () => {
    expect(daysOfCover(30, 30)).toBe(30);
    expect(daysOfCover(10, 60)).toBe(5);
    expect(daysOfCover(10, 0)).toBeNull();
  });
});

describe("random", () => {
  it("is deterministic for a seed", () => {
    const a = createRandom(42);
    const b = createRandom(42);
    expect([a.next(), a.int(1, 6), a.pick(["x", "y", "z"])]).toEqual([
      b.next(),
      b.int(1, 6),
      b.pick(["x", "y", "z"]),
    ]);
  });
});
