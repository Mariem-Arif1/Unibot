"use client";

import { Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import type { OrgAdmin } from "@/types/organization";

interface OrgTableProps {
  orgs: OrgAdmin[];
  onEdit: (org: OrgAdmin) => void;
  onToggleActive: (org: OrgAdmin) => void;
  onDeactivate: (org: OrgAdmin) => void;
}

export default function OrgTable({ orgs, onEdit, onToggleActive, onDeactivate }: OrgTableProps) {
  if (orgs.length === 0) {
    return (
      <div className="text-center py-16 text-[#6a6a6f] text-sm">
        No organizations yet. Create one to configure a BC connection.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="text-left py-3 px-4 text-[#6a6a6f] font-medium">Organization</th>
            <th className="text-left py-3 px-4 text-[#6a6a6f] font-medium">BC Company</th>
            <th className="text-left py-3 px-4 text-[#6a6a6f] font-medium">DB Connection</th>
            <th className="text-left py-3 px-4 text-[#6a6a6f] font-medium">Status</th>
            <th className="text-right py-3 px-4 text-[#6a6a6f] font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((org) => (
            <tr
              key={org.id}
              className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
            >
              <td className="py-3 px-4">
                <div className="font-medium text-white">{org.name}</div>
                <div className="text-xs text-[#4a4a4f] mt-0.5 font-mono">{org.id.slice(0, 8)}…</div>
              </td>
              <td className="py-3 px-4">
                <span className="font-mono text-xs text-[#8a8a8f] bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">
                  {org.bc_company_name}
                </span>
              </td>
              <td className="py-3 px-4">
                {org.bc_database_url ? (
                  <span className="text-xs text-emerald-400">Custom DSN configured</span>
                ) : (
                  <span className="text-xs text-[#4a4a4f]">Global env fallback</span>
                )}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                    org.is_active
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-white/[0.04] text-[#6a6a6f] border-white/[0.06]"
                  }`}
                >
                  <span className={`size-1.5 rounded-full ${org.is_active ? "bg-emerald-400" : "bg-[#6a6a6f]"}`} />
                  {org.is_active ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onEdit(org)}
                    className="p-1.5 rounded-lg text-[#6a6a6f] hover:text-white hover:bg-white/[0.06] transition-all"
                    title="Edit"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => onToggleActive(org)}
                    className="p-1.5 rounded-lg text-[#6a6a6f] hover:text-white hover:bg-white/[0.06] transition-all"
                    title={org.is_active ? "Deactivate" : "Activate"}
                  >
                    {org.is_active ? (
                      <ToggleRight className="size-3.5 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="size-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => onDeactivate(org)}
                    className="p-1.5 rounded-lg text-[#6a6a6f] hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Deactivate"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
