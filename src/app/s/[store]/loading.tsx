import { Skeleton } from "@/components/ui";
import { KpiCardsSkeleton } from "@/components/overview/kpi-cards";
import { SectionSkeleton } from "@/components/overview/sections";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <KpiCardsSkeleton />
      <SectionSkeleton rows={8} />
    </div>
  );
}
