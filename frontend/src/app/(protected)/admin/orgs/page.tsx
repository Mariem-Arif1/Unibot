"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useAdminOrgs } from "@/hooks/useAdminOrgs";
import OrgTable from "@/components/admin/OrgTable";
import { updateOrg, deactivateOrg } from "@/services/adminOrgService";
import type { OrgAdmin } from "@/types/organization";

export default function AdminOrgsPage() {
  const router = useRouter();
  const { orgs, isLoading, error, mutate } = useAdminOrgs();
  const [busy, setBusy] = useState<string | null>(null); // org id being toggled/deleted

  async function handleToggleActive(org: OrgAdmin) {
    setBusy(org.id);
    try {
      await updateOrg(org.id, { is_active: !org.is_active });
      mutate();
    } finally {
      setBusy(null);
    }
  }

  async function handleDeactivate(org: OrgAdmin) {
    if (!confirm(`Deactivate "${org.name}"? Users will lose BC access.`)) return;
    setBusy(org.id);
    try {
      await deactivateOrg(org.id);
      mutate();
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Organizations</h1>
          <p className="text-sm text-[#6a6a6f] mt-1">
            Manage Business Central database connections per organization.
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/orgs/new")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1488fc] text-white text-sm font-medium hover:bg-[#1488fc]/90 transition-all"
        >
          <Plus className="size-4" />
          New Organization
        </button>
      </div>

      {/* Info banner */}
      <div className="mb-6 p-4 rounded-xl bg-[#1488fc]/5 border border-[#1488fc]/15 text-sm text-[#8a8a8f]">
        Each organization has a <span className="text-white font-mono text-xs">BC Company Name</span> (table prefix)
        and an optional <span className="text-white font-mono text-xs">BC Database URL</span> (ODBC connection string).
        Users assigned to an org use its connection; unassigned users fall back to the global{" "}
        <span className="text-white font-mono text-xs">BC_DATABASE_URL</span> env var.
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse border border-white/[0.04]" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400">Failed to load organizations. Please refresh.</p>
      )}

      {!isLoading && !error && (
        <div className="bg-[#111113] border border-white/[0.06] rounded-2xl overflow-hidden">
          <OrgTable
            orgs={orgs}
            onEdit={(org) => router.push(`/admin/orgs/${org.id}/edit`)}
            onToggleActive={handleToggleActive}
            onDeactivate={handleDeactivate}
          />
        </div>
      )}
    </>
  );
}
