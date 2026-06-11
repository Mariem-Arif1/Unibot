"use client";

import { Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import type { LLMConfigAdmin } from "@/types";

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  openai: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  gemini: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

interface LLMConfigTableProps {
  configs: LLMConfigAdmin[];
  onEdit: (cfg: LLMConfigAdmin) => void;
  onToggleActive: (cfg: LLMConfigAdmin) => void;
  onDelete: (cfg: LLMConfigAdmin) => void;
}

export default function LLMConfigTable({
  configs,
  onEdit,
  onToggleActive,
  onDelete,
}: LLMConfigTableProps) {
  if (configs.length === 0) {
    return (
      <div className="text-center py-16 text-[#6a6a6f] text-sm">
        No LLM configs yet. Create your first agent to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="text-left py-3 px-4 text-[#6a6a6f] font-medium">Name</th>
            <th className="text-left py-3 px-4 text-[#6a6a6f] font-medium">Provider</th>
            <th className="text-left py-3 px-4 text-[#6a6a6f] font-medium">Model</th>
            <th className="text-left py-3 px-4 text-[#6a6a6f] font-medium">Assigned Bot</th>
            <th className="text-left py-3 px-4 text-[#6a6a6f] font-medium">Status</th>
            <th className="text-right py-3 px-4 text-[#6a6a6f] font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {configs.map((cfg) => (
            <tr
              key={cfg.id}
              className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
            >
              <td className="py-3 px-4">
                <div className="font-medium text-white">{cfg.name}</div>
                {cfg.api_key_masked && (
                  <div className="text-xs text-[#4a4a4f] mt-0.5 font-mono">
                    {cfg.api_key_masked}
                  </div>
                )}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${
                    PROVIDER_COLORS[cfg.provider] ?? "bg-white/[0.04] text-[#8a8a8f] border-white/[0.08]"
                  }`}
                >
                  {cfg.provider}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-[#8a8a8f] font-mono text-xs">{cfg.model}</span>
              </td>
              <td className="py-3 px-4">
                {cfg.bot_name ? (
                  <span className="text-white text-xs">{cfg.bot_name}</span>
                ) : (
                  <span className="text-[#4a4a4f] text-xs">Unassigned</span>
                )}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                    cfg.is_active
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-white/[0.04] text-[#6a6a6f] border-white/[0.06]"
                  }`}
                >
                  <span className={`size-1.5 rounded-full ${cfg.is_active ? "bg-emerald-400" : "bg-[#6a6a6f]"}`} />
                  {cfg.is_active ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onEdit(cfg)}
                    className="p-1.5 rounded-lg text-[#6a6a6f] hover:text-white hover:bg-white/[0.06] transition-all"
                    title="Edit"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => onToggleActive(cfg)}
                    className="p-1.5 rounded-lg text-[#6a6a6f] hover:text-white hover:bg-white/[0.06] transition-all"
                    title={cfg.is_active ? "Deactivate" : "Activate"}
                  >
                    {cfg.is_active ? (
                      <ToggleRight className="size-3.5 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="size-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => onDelete(cfg)}
                    className="p-1.5 rounded-lg text-[#6a6a6f] hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Delete"
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
