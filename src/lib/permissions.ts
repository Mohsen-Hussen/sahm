import type { OrderStatus, Role } from "@/db/schema";

/**
 * Single source of truth for authorization. The UI reads it to hide controls,
 * and every Server Action checks it again on the server before writing.
 */
export const PERMISSIONS = {
  "orders:read": ["owner", "manager", "viewer"],
  "orders:update": ["owner", "manager"],
  "inventory:read": ["owner", "manager", "viewer"],
  "inventory:update": ["owner", "manager"],
  "team:read": ["owner", "manager", "viewer"],
  "team:manage": ["owner"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  manager: "Manager",
  viewer: "Viewer",
};

/** Allowed order status transitions — anything else is rejected by the server. */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["paid", "cancelled"],
  paid: ["shipped", "refunded", "cancelled"],
  shipped: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus) {
  return ORDER_TRANSITIONS[from].includes(to);
}
