import type { Metadata } from "next";
import { getDb } from "@/db/client";
import { getStoreAccess } from "@/server/auth";
import { listOrders } from "@/server/queries";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { OrdersTable } from "@/components/orders/orders-table";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage({ params, searchParams }: PageProps<"/s/[store]/orders">) {
  const { store: slug } = await params;
  const { q } = await searchParams;
  const { store, role } = await getStoreAccess(slug);
  const orders = await listOrders(await getDb(), store.id);
  const canUpdate = can(role, "orders:update");

  return (
    <>
      <PageHeader
        title="Orders"
        description={
          canUpdate
            ? "Search, filter and move orders through fulfilment. Changes apply instantly."
            : "You have read-only access to orders in this store."
        }
      />
      <OrdersTable
        slug={slug}
        currency={store.currency}
        orders={orders}
        canUpdate={canUpdate}
        initialQuery={typeof q === "string" ? q : ""}
      />
    </>
  );
}
