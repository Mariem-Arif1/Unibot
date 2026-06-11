"use client";

import { useRouter } from "next/navigation";
import { Pencil, Trash2, Tag, MessageSquare } from "lucide-react";
import type { BotAdmin } from "@/types";
import type { KeyedMutator } from "swr";

const AGENT_LABELS: Record<string, string> = {
  promo_discount: "Promo & Discounts",
};

interface AgentTableProps {
  bots: BotAdmin[];
  mutate: KeyedMutator<BotAdmin[]>;
  onDeleteRequest: (bot: BotAdmin) => void;
  onToggleActive: (bot: BotAdmin) => void;
}

export default function AgentTable({
  bots,
  onDeleteRequest,
  onToggleActive,
}: AgentTableProps) {
  const router = useRouter();

  if (bots.length === 0) {
    return (
      <div className="text-center py-16 text-[#4a4a4f] text-sm italic">
        No agents yet. Click &ldquo;Create Agent&rdquo; to add one.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] bg-white/[0.02]">
            <th className="text-left px-4 py-3 text-[#6a6a6f] font-medium">Name</th>
            <th className="text-left px-4 py-3 text-[#6a6a6f] font-medium">Provider</th>
            <th className="text-left px-4 py-3 text-[#6a6a6f] font-medium">Model</th>
            <th className="text-left px-4 py-3 text-[#6a6a6f] font-medium">Type</th>
            <th className="text-left px-4 py-3 text-[#6a6a6f] font-medium">Status</th>
            <th className="text-right px-4 py-3 text-[#6a6a6f] font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bots.map((bot, i) => (
            <tr
              key={bot.id}
              className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${
                i === bots.length - 1 ? "border-b-0" : ""
              }`}
            >
              <td className="px-4 py-3">
                <div className="font-medium text-white">{bot.name}</div>
                {bot.description && (
                  <div className="text-xs text-[#6a6a6f] truncate max-w-[200px]">
                    {bot.description}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-[#8a8a8f] capitalize">{bot.provider}</td>
              <td className="px-4 py-3 text-[#8a8a8f] font-mono text-xs">{bot.model}</td>
              <td className="px-4 py-3">
                {bot.agent_type ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                    <Tag className="size-3" />
                    {AGENT_LABELS[bot.agent_type] ?? bot.agent_type}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
                    <MessageSquare className="size-3" />
                    Generic
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {bot.is_active ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    <span className="size-1.5 rounded-full bg-emerald-400 inline-block" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full bg-white/[0.04] text-[#6a6a6f] border border-white/[0.08]">
                    <span className="size-1.5 rounded-full bg-[#6a6a6f] inline-block" />
                    Inactive
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => router.push(`/admin/agents/${bot.id}/edit`)}
                    className="p-1.5 rounded-lg text-[#6a6a6f] hover:text-white hover:bg-white/[0.06] transition-all"
                    title="Edit"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => onToggleActive(bot)}
                    className="px-2.5 py-1 text-[10px] font-medium rounded-lg border transition-all text-[#8a8a8f] border-white/[0.08] hover:bg-white/[0.06] hover:text-white"
                  >
                    {bot.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => onDeleteRequest(bot)}
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
