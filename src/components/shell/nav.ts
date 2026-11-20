import { BarChart3, Boxes, ShoppingBag, Users } from "lucide-react";

export const NAV = [
  { href: "", label: "Overview", icon: BarChart3 },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/team", label: "Team", icon: Users },
] as const;
