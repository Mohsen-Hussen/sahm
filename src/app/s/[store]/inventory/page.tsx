import type { Metadata } from "next";
import { getDb } from "@/db/client";
import { getStoreAccess } from "@/server/auth";
import { listProducts } from "@/server/queries";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { InventoryTable } from "@/components/inventory/inventory-table";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage({
  params,
  searchParams,
}: PageProps<"/s/[store]/inventory">) {
  const { store: slug } = await params;
  const { filter } = await searchParams;
  const { store, role } = await getStoreAccess(slug);
  const products = await listProducts(await getDb(), store.id);
  const canUpdate = can(role, "inventory:update");

  return (
    <>
      <PageHeader
        title="Inventory"
        description={
          canUpdate
            ? "Stock levels, sales pace and days of cover for every product."
            : "Read-only view of stock levels."
        }
      />
      <InventoryTable
        slug={slug}
        currency={store.currency}
        products={products}
        canUpdate={canUpdate}
        lowOnly={filter === "low"}
      />
    </>
  );
}
