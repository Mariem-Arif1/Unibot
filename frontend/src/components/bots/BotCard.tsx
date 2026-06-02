import { Zap, Sparkles } from "lucide-react";
import type { Bot } from "@/types";

const PROVIDER_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; glow: string }
> = {
  anthropic: {
    label: "Anthropic",
    icon: <Sparkles className="size-3" />,
    color: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    glow: "rgba(249, 115, 22, 0.15)",
  },
  openai: {
    label: "OpenAI",
    icon: <Zap className="size-3" />,
    color: "bg-green-500/15 text-green-400 border-green-500/20",
    glow: "rgba(34, 197, 94, 0.15)",
  },
  gemini: {
    label: "Gemini",
    icon: <Sparkles className="size-3" />,
    color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    glow: "rgba(6, 182, 212, 0.15)",
  },
};

interface BotCardProps {
  bot: Bot;
  onClick: (botId: string) => void;
}

export default function BotCard({ bot, onClick }: BotCardProps) {
  const provider = PROVIDER_CONFIG[bot.provider] ?? {
    label: bot.provider,
    icon: <Sparkles className="size-3" />,
    color: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    glow: "rgba(20, 136, 252, 0.15)",
  };

  return (
    <button
      onClick={() => onClick(bot.id)}
      className="group text-left w-full rounded-2xl border border-white/[0.08] bg-[#1e1e22] p-5 hover:border-white/[0.16] hover:bg-[#242428] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#1488fc]/50 active:scale-[0.98]"
      style={{
        boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 2px 20px rgba(0,0,0,0.3)`,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div
          className="size-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
          style={{
            background: `radial-gradient(circle, ${provider.glow} 0%, transparent 70%)`,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {bot.name.charAt(0)}
        </div>
        <span
          className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full border ${provider.color}`}
        >
          {provider.icon}
          {provider.label}
        </span>
      </div>

      <h2 className="font-semibold text-sm text-white mb-1 group-hover:text-[#4da5fc] transition-colors">
        {bot.name}
      </h2>

      {bot.description && (
        <p className="text-xs text-[#6a6a6f] line-clamp-2 leading-relaxed">
          {bot.description}
        </p>
      )}

      <div className="mt-3">
        <span className="text-[10px] text-[#4a4a4f] font-mono">{bot.model}</span>
      </div>
    </button>
  );
}
