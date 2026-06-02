"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Check, Zap, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { listBots } from "@/services/botService";
import type { Bot } from "@/types";

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  anthropic: <Sparkles className="size-3.5 text-orange-400" />,
  openai: <Zap className="size-3.5 text-green-400" />,
  gemini: <Sparkles className="size-3.5 text-cyan-400" />,
};

interface BotSelectorProps {
  currentBot: Bot;
}

export default function BotSelector({ currentBot }: BotSelectorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bots, setBots] = useState<Bot[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listBots().then(setBots).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleSelect(bot: Bot) {
    setOpen(false);
    if (bot.id !== currentBot.id) router.push(`/bots/${bot.id}`);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all text-[#8a8a8f] hover:text-white hover:bg-white/[0.06] active:scale-95"
      >
        {PROVIDER_ICONS[currentBot.provider] ?? <Sparkles className="size-3.5 text-[#8a8a8f]" />}
        <span className="max-w-[120px] truncate">{currentBot.name}</span>
        <ChevronDown className={`size-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 z-50 min-w-[220px] bg-[#1a1a1e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in">
          <div className="p-1.5">
            <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a5f]">
              Select Model
            </div>
            {bots.map((bot) => (
              <button
                key={bot.id}
                type="button"
                onClick={() => handleSelect(bot)}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-all duration-150 ${
                  bot.id === currentBot.id
                    ? "bg-white/10 text-white"
                    : "text-[#a0a0a5] hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <div className="shrink-0">
                  {PROVIDER_ICONS[bot.provider] ?? <Sparkles className="size-4 text-[#8a8a8f]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{bot.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                      bot.provider === "anthropic"
                        ? "bg-orange-500/20 text-orange-300"
                        : bot.provider === "gemini"
                        ? "bg-cyan-500/20 text-cyan-300"
                        : "bg-green-500/20 text-green-300"
                    }`}>
                      {bot.provider === "anthropic" ? "Anthropic" : "OpenAI"}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#6a6a6f]">{bot.model}</span>
                </div>
                {bot.id === currentBot.id && <Check className="size-4 text-[#1488fc] shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
