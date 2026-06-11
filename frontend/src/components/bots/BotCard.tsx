"use client";

import { Tag, MessageSquare, type LucideIcon } from "lucide-react";
import type { Agent } from "@/types";

interface CategoryConfig {
  label: string;
  Icon: LucideIcon;
  color: string;
  glow: string;
}

const AGENT_CATEGORY: Record<string, CategoryConfig> = {
  promo_discount: {
    label: "Promo & Discounts",
    Icon: Tag,
    color: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    glow: "rgba(99, 102, 241, 0.15)",
  },
};

const DEFAULT_CATEGORY: CategoryConfig = {
  label: "Assistant",
  Icon: MessageSquare,
  color: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  glow: "rgba(20, 136, 252, 0.15)",
};

interface BotCardProps {
  agent: Agent;
  onClick: (agentId: string) => void;
}

export default function BotCard({ agent, onClick }: BotCardProps) {
  const category = AGENT_CATEGORY[agent.agent_type ?? ""] ?? DEFAULT_CATEGORY;
  const { Icon } = category;

  return (
    <button
      onClick={() => onClick(agent.id)}
      className="group text-left w-full rounded-2xl border border-white/[0.08] bg-[#1e1e22] p-5 hover:border-white/[0.16] hover:bg-[#242428] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#1488fc]/50 active:scale-[0.98]"
      style={{
        boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 2px 20px rgba(0,0,0,0.3)`,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div
          className="size-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
          style={{
            background: `radial-gradient(circle, ${category.glow} 0%, transparent 70%)`,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {agent.name.charAt(0)}
        </div>
        <span
          className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full border ${category.color}`}
        >
          <Icon className="size-3" />
          {category.label}
        </span>
      </div>

      <h2 className="font-semibold text-sm text-white mb-1 group-hover:text-[#4da5fc] transition-colors">
        {agent.name}
      </h2>

      {agent.description && (
        <p className="text-xs text-[#6a6a6f] line-clamp-2 leading-relaxed">
          {agent.description}
        </p>
      )}
    </button>
  );
}
