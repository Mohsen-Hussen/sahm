import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { getDb } from "@/db/client";
import type { Role } from "@/db/schema";
import { getStoreAccess } from "@/server/auth";
import { listMembers } from "@/server/queries";
import { can, PERMISSIONS, ROLE_LABEL, type Permission } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, RoleBadge } from "@/components/ui";
import { RoleSelect } from "@/components/team/role-select";

export const metadata: Metadata = { title: "Team" };

const PERMISSION_LABEL: Record<Permission, string> = {
  "orders:read": "View orders",
  "orders:update": "Update order status",
  "inventory:read": "View inventory",
  "inventory:update": "Adjust stock",
  "team:read": "View team",
  "team:manage": "Change roles",
};

export default async function TeamPage({ params }: PageProps<"/s/[store]/team">) {
  const { store: slug } = await params;
  const { store, role, user } = await getStoreAccess(slug);
  const members = await listMembers(await getDb(), store.id);
  const canManage = can(role, "team:manage");
  const roles = Object.keys(ROLE_LABEL) as Role[];

  return (
    <>
      <PageHeader
        title="Team"
        description={
          canManage
            ? "Invite-only access. Change a member's role and it applies on their next request."
            : "Only owners can change roles."
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            title="Members"
            description={`${members.length} people can access ${store.name}`}
          />
          <ul className="divide-y divide-line">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center gap-3 px-5 py-3">
                <span
                  aria-hidden
                  className="grid size-9 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600"
                >
                  {m.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.name}{" "}
                    {m.userId === user.id && (
                      <span className="text-xs font-normal text-muted">(you)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">{m.email}</p>
                </div>
                {canManage && m.userId !== user.id ? (
                  <RoleSelect slug={slug} userId={m.userId} name={m.name} role={m.role} />
                ) : (
                  <RoleBadge role={m.role} />
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="What each role can do"
            description="Enforced on the server for every action"
          />
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="px-5 py-2.5 text-left font-medium">Permission</th>
                {roles.map((r) => (
                  <th key={r} className="px-3 py-2.5 text-center font-medium">
                    {ROLE_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(Object.keys(PERMISSIONS) as Permission[]).map((p) => (
                <tr key={p}>
                  <td className="px-5 py-2.5">{PERMISSION_LABEL[p]}</td>
                  {roles.map((r) => (
                    <td key={r} className="px-3 py-2.5 text-center">
                      {can(r, p) ? (
                        <Check aria-label="Allowed" className="mx-auto size-4 text-emerald-600" />
                      ) : (
                        <Minus aria-label="Not allowed" className="mx-auto size-4 text-slate-300" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
