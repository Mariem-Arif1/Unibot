"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Check, Zap, Sparkles } from "lucide-react";

export interface ModelOption {
  provider: "openai" | "anthropic" | "gemini";
  model: string;
  label: string;
  description: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  { provider: "openai",    model: "gpt-4o",              label: "GPT-4o",          description: "Most capable" },
  { provider: "openai",    model: "gpt-4o-mini",         label: "GPT-4o Mini",     description: "Fast & efficient" },
  { provider: "anthropic", model: "claude-sonnet-4-6",   label: "Claude Sonnet",   description: "Great at reasoning" },
  { provider: "anthropic", model: "claude-haiku-4-5-20251001", label: "Claude Haiku", description: "Fastest Claude" },
  { provider: "gemini",    model: "gemini-1.5-pro",      label: "Gemini Pro",      description: "Google's flagship" },
];

const PROVIDER_ICON: Record<string, React.ReactNode> = {
  anthropic: <Sparkles className="size-3.5 text-orange-400" />,
  openai:    <Zap className="size-3.5 text-green-400" />,
  gemini:    <Sparkles className="size-3.5 text-cyan-400" />,
};

interface ModelSelectorProps {
  selected: ModelOption;
  onChange: (model: ModelOption) => void;
}

export default function ModelSelector({ selected, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all text-[#8a8a8f] hover:text-white hover:bg-white/[0.06] active:scale-95"
      >
        {PROVIDER_ICON[selected.provider]}
        <span className="max-w-[100px] truncate">{selected.label}</span>
        <ChevronDown className={`size-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 z-50 min-w-[220px] bg-[#1a1a1e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in">
          <div className="p-1.5">
            <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a5f]">
              Model
            </div>
            {AVAILABLE_MODELS.map((m) => {
              const isActive = m.provider === selected.provider && m.model === selected.model;
              return (
                <button
                  key={`${m.provider}-${m.model}`}
                  type="button"
                  onClick={() => { onChange(m); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-all duration-150 ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-[#a0a0a5] hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <div className="shrink-0">{PROVIDER_ICON[m.provider]}</div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block">{m.label}</span>
                    <span className="text-[11px] text-[#6a6a6f]">{m.description}</span>
                  </div>
                  {isActive && <Check className="size-4 text-[#1488fc] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
