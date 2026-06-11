"use client";

import { useState } from "react";
import type { BotAdmin, BotCreatePayload } from "@/types";

const AGENT_TYPE_OPTIONS = [
  { value: "", label: "Generic Assistant" },
  { value: "promo_discount", label: "Promo & Discounts" },
];

interface BotFormProps {
  initialValues?: BotAdmin;
  onSubmit: (data: BotCreatePayload) => Promise<void>;
  isSubmitting: boolean;
  submitLabel?: string;
}

export default function BotForm({
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel = "Create Bot",
}: BotFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [systemPrompt, setSystemPrompt] = useState(
    initialValues?.system_prompt ?? "You are a helpful assistant."
  );
  const [agentType, setAgentType] = useState(initialValues?.agent_type ?? "");
  const [temperature, setTemperature] = useState(initialValues?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(initialValues?.max_tokens ?? 1024);
  const [contextWindow, setContextWindow] = useState(
    initialValues?.context_window_tokens ?? 4000
  );
  const [isActive, setIsActive] = useState(initialValues?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        system_prompt: systemPrompt,
        agent_type: agentType || null,
        temperature,
        max_tokens: maxTokens,
        context_window_tokens: contextWindow,
        is_active: isActive,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const inputClass =
    "w-full bg-[#111113] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#4a4a4f] focus:outline-none focus:border-[#1488fc]/50 focus:ring-1 focus:ring-[#1488fc]/20 transition-all";
  const labelClass = "block text-xs font-medium text-[#8a8a8f] mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {/* Name */}
      <div>
        <label className={labelClass}>Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sales Assistant"
          className={inputClass}
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description of this bot's purpose"
          className={inputClass}
        />
      </div>

      {/* System Prompt */}
      <div>
        <label className={labelClass}>System Prompt</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={8}
          placeholder="You are a helpful assistant..."
          className={`${inputClass} resize-y font-mono text-xs leading-relaxed`}
        />
      </div>

      {/* Agent Type */}
      <div>
        <label className={labelClass}>Agent Type</label>
        <select
          value={agentType}
          onChange={(e) => setAgentType(e.target.value)}
          className={`${inputClass} bg-[#111113]`}
        >
          {AGENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-[#4a4a4f]">
          Promo & Discounts enables Business Central tools for this bot.
        </p>
      </div>

      {/* LLM defaults row */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>
            Temperature — {temperature.toFixed(2)}
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full accent-[#1488fc]"
          />
        </div>
        <div>
          <label className={labelClass}>Max Tokens</label>
          <input
            type="number"
            min={1}
            max={32000}
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Context Window</label>
          <input
            type="number"
            min={1}
            max={200000}
            value={contextWindow}
            onChange={(e) => setContextWindow(parseInt(e.target.value, 10))}
            className={inputClass}
          />
        </div>
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsActive((v) => !v)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            isActive ? "bg-[#1488fc]" : "bg-white/[0.1]"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
              isActive ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className="text-sm text-[#8a8a8f]">Active</span>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-xl bg-[#1488fc] text-white text-sm font-medium hover:bg-[#1488fc]/90 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          {isSubmitting && (
            <span className="size-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          )}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
