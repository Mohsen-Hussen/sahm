"use client";

import { useOptimistic, useTransition } from "react";
import type { Role } from "@/db/schema";
import { setMemberRole } from "@/app/s/[store]/actions";
import { useToast } from "@/components/toast";
import { ROLE_LABEL } from "@/lib/permissions";

export function RoleSelect({
  slug,
  userId,
  name,
  role,
}: {
  slug: string;
  userId: number;
  name: string;
  role: Role;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [value, setOptimistic] = useOptimistic(role);

  return (
    <select
      aria-label={`Role for ${name}`}
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as Role;
        startTransition(async () => {
          setOptimistic(next);
          const result = await setMemberRole(slug, userId, next);
          toast.show(
            result.ok ? `${name} is now ${ROLE_LABEL[next].toLowerCase()}` : result.error,
            result.ok ? "success" : "error",
          );
        });
      }}
      className="h-8 rounded-md border border-line bg-surface px-2 text-sm"
    >
      {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
        <option key={r} value={r}>
          {ROLE_LABEL[r]}
        </option>
      ))}
    </select>
  );
}
