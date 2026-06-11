"use client";

import { Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import type { BotAdmin } from "@/types";

const AGENT_TYPE_LABELS: Record<string, string> = {
  promo_discount: "Promo & Discounts",
};

interface BotTableProps {
  bots: BotAdmin[];
  onEdit: (bot: BotAdmin) => void;
  onToggleActive: (bot: BotAdmin) => void;
  onDelete: (bot: BotAdmin) => void;
}

export default function BotTable({ bots, onEdit, onToggleActive, onDelete }: BotTableProps) {
  if (bots.length === 0) {
    return (
      <div className="text-center py-16 text-[#6a6a6f] text-sm">
        No bots yet. Create your first bot to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="text-left py-3 px-4 text-[#6a6a6f] font-medium">Name</th>
            <th className="text-left py-3 px-4 text-[#6a6a6f] font-medium">Type</th>
            <th className="text-left py-3 px-4 text-[#6a6a6f] font-medium">Status</th>
            <th className="text-right py-3 px-4 text-[#6a6a6f] font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bots.map((bot) => (
            <tr
              key={bot.id}
              className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
            >
              <td className="py-3 px-4">
                <div className="font-medium text-white">{bot.name}</div>
                {bot.description && (
                  <div className="text-xs text-[#6a6a6f] mt-0.5 truncate max-w-xs">
                    {bot.description}
                  </div>
                )}
              </td>
              <td className="py-3 px-4">
                {bot.agent_type ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#1488fc]/10 text-[#1488fc] border border-[#1488fc]/20">
                    {AGENT_TYPE_LABELS[bot.agent_type] ?? bot.agent_type}
                  </span>
                ) : (
                  <span className="text-[#4a4a4f] text-xs">Generic</span>
                )}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                    bot.is_active
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-white/[0.04] text-[#6a6a6f] border-white/[0.06]"
                  }`}
                >
                  <span className={`size-1.5 rounded-full ${bot.is_active ? "bg-emerald-400" : "bg-[#6a6a6f]"}`} />
                  {bot.is_active ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onEdit(bot)}
                    className="p-1.5 rounded-lg text-[#6a6a6f] hover:text-white hover:bg-white/[0.06] transition-all"
                    title="Edit"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => onToggleActive(bot)}
                    className="p-1.5 rounded-lg text-[#6a6a6f] hover:text-white hover:bg-white/[0.06] transition-all"
                    title={bot.is_active ? "Deactivate" : "Activate"}
                  >
                    {bot.is_active ? (
                      <ToggleRight className="size-3.5 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="size-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => onDelete(bot)}
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
