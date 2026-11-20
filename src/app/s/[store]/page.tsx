import { Suspense } from "react";
import { getDb } from "@/db/client";
import { getStoreAccess } from "@/server/auth";
import { toLiveOrder } from "@/server/live";
import { listOrders } from "@/server/queries";
import { PageHeader } from "@/components/page-header";
import { KpiCards, KpiCardsSkeleton } from "@/components/overview/kpi-cards";
import { parseRange, RangeTabs } from "@/components/overview/range-tabs";
import {
  ActivityList,
  ChannelMix,
  LowStock,
  RevenueCard,
  SectionSkeleton,
  TopProducts,
} from "@/components/overview/sections";
import { LiveFeed } from "@/components/live/live-feed";

export default async function OverviewPage({ params, searchParams }: PageProps<"/s/[store]">) {
  const { store: slug } = await params;
  const days = parseRange((await searchParams).range);
  const { store, user } = await getStoreAccess(slug);
  const props = { storeId: store.id, currency: store.currency, days };

  return (
    <>
      <PageHeader
        title={`Good to see you, ${user.name.split(" ")[0]}`}
        description={`${store.name} · ${store.category} · ${store.city}`}
      >
        <RangeTabs slug={slug} active={days} />
      </PageHeader>

      {/* Each section streams in independently as its query resolves. */}
      <div className="space-y-6">
        <Suspense key={`kpi-${days}`} fallback={<KpiCardsSkeleton />}>
          <KpiCards {...props} />
        </Suspense>

        <div className="grid gap-6 lg:grid-cols-3">
          <Suspense
            key={`rev-${days}`}
            fallback={<SectionSkeleton className="lg:col-span-2" rows={8} />}
          >
            <RevenueCard {...props} />
          </Suspense>
          <Suspense fallback={<SectionSkeleton rows={7} />}>
            <LiveFeedSection slug={slug} storeId={store.id} currency={store.currency} />
          </Suspense>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Suspense key={`top-${days}`} fallback={<SectionSkeleton />}>
            <TopProducts {...props} />
          </Suspense>
          <Suspense key={`ch-${days}`} fallback={<SectionSkeleton rows={4} />}>
            <ChannelMix {...props} />
          </Suspense>
          <div className="space-y-6">
            <Suspense fallback={<SectionSkeleton rows={3} />}>
              <LowStock storeId={store.id} slug={slug} />
            </Suspense>
            <Suspense fallback={<SectionSkeleton rows={3} />}>
              <ActivityList storeId={store.id} />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}

async function LiveFeedSection({
  slug,
  storeId,
  currency,
}: {
  slug: string;
  storeId: number;
  currency: string;
}) {
  const recent = await listOrders(await getDb(), storeId, 7);
  return <LiveFeed slug={slug} currency={currency} initial={recent.map(toLiveOrder)} />;
}
