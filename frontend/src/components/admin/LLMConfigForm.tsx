"use client";

import { useState } from "react";
import type { BotAdmin, LLMConfigAdmin, LLMConfigCreatePayload } from "@/types";

const PROVIDER_OPTIONS = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Google Gemini" },
];

interface LLMConfigFormProps {
  initialValues?: LLMConfigAdmin;
  bots: BotAdmin[];
  onSubmit: (data: LLMConfigCreatePayload) => Promise<void>;
  isSubmitting: boolean;
  submitLabel?: string;
}

export default function LLMConfigForm({
  initialValues,
  bots,
  onSubmit,
  isSubmitting,
  submitLabel = "Create Agent",
}: LLMConfigFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [provider, setProvider] = useState(initialValues?.provider ?? "anthropic");
  const [model, setModel] = useState(initialValues?.model ?? "");
  const [apiKey, setApiKey] = useState(""); // never pre-fill from masked value
  const [maxTokens, setMaxTokens] = useState(initialValues?.max_tokens ?? 1024);
  const [contextWindow, setContextWindow] = useState(
    initialValues?.context_window_tokens ?? 4000
  );
  const [temperature, setTemperature] = useState(initialValues?.temperature ?? 0.7);
  const [isActive, setIsActive] = useState(initialValues?.is_active ?? true);
  const [botId, setBotId] = useState(initialValues?.bot_id ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Name is required."); return; }
    if (!model.trim()) { setError("Model is required."); return; }
    try {
      const payload: LLMConfigCreatePayload = {
        name: name.trim(),
        description: description.trim() || null,
        provider,
        model: model.trim(),
        max_tokens: maxTokens,
        context_window_tokens: contextWindow,
        temperature,
        is_active: isActive,
        bot_id: botId || null,
      };
      if (apiKey.trim()) payload.api_key = apiKey.trim();
      await onSubmit(payload);
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
          placeholder="e.g. Claude Sonnet Production"
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
          placeholder="Optional notes about this config"
          className={inputClass}
        />
      </div>

      {/* Provider + Model */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Provider *</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className={`${inputClass} bg-[#111113]`}
          >
            {PROVIDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Model *</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. claude-sonnet-4-6"
            className={inputClass}
            required
          />
        </div>
      </div>

      {/* API Key */}
      <div>
        <label className={labelClass}>
          API Key{initialValues?.api_key_masked ? " (leave blank to keep current)" : ""}
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={
            initialValues?.api_key_masked
              ? `Current: ${initialValues.api_key_masked}`
              : "sk-..."
          }
          className={`${inputClass} font-mono`}
          autoComplete="new-password"
        />
      </div>

      {/* LLM params row */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Temperature — {temperature.toFixed(2)}</label>
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

      {/* Bot assignment */}
      <div>
        <label className={labelClass}>Assign to Bot</label>
        <select
          value={botId}
          onChange={(e) => setBotId(e.target.value)}
          className={`${inputClass} bg-[#111113]`}
        >
          <option value="">— Unassigned —</option>
          {bots.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
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
