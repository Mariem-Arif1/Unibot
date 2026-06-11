"use client";

import { useState, useEffect } from "react";
import type { BotAdmin, BotCreatePayload } from "@/types";

const AGENT_TYPE_OPTIONS = [
  { value: "", label: "Generic Assistant" },
  { value: "promo_discount", label: "Promo & Discounts" },
];

const PROVIDER_OPTIONS = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
];

interface AgentFormProps {
  initialValues?: BotAdmin;
  onSubmit: (data: BotCreatePayload) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
}

const DEFAULTS: BotCreatePayload = {
  name: "",
  description: "",
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  system_prompt: "You are a helpful assistant.",
  temperature: 0.7,
  max_tokens: 1024,
  context_window_tokens: 4000,
  agent_type: null,
  is_active: true,
};

export default function AgentForm({
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel,
}: AgentFormProps) {
  const [form, setForm] = useState<BotCreatePayload>(() =>
    initialValues
      ? {
          name: initialValues.name,
          description: initialValues.description ?? "",
          provider: initialValues.provider,
          model: initialValues.model,
          system_prompt: initialValues.system_prompt,
          temperature: initialValues.temperature,
          max_tokens: initialValues.max_tokens,
          context_window_tokens: initialValues.context_window_tokens,
          agent_type: initialValues.agent_type,
          is_active: initialValues.is_active,
        }
      : DEFAULTS
  );
  const [errors, setErrors] = useState<Partial<Record<keyof BotCreatePayload, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (initialValues) {
      setForm({
        name: initialValues.name,
        description: initialValues.description ?? "",
        provider: initialValues.provider,
        model: initialValues.model,
        system_prompt: initialValues.system_prompt,
        temperature: initialValues.temperature,
        max_tokens: initialValues.max_tokens,
        context_window_tokens: initialValues.context_window_tokens,
        agent_type: initialValues.agent_type,
        is_active: initialValues.is_active,
      });
    }
  }, [initialValues?.id]);

  function set<K extends keyof BotCreatePayload>(key: K, value: BotCreatePayload[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof BotCreatePayload, string>> = {};
    if (!form.name?.trim()) newErrors.name = "Name is required";
    if (!form.provider) newErrors.provider = "Provider is required";
    if (!form.model?.trim()) newErrors.model = "Model is required";
    if (!form.system_prompt?.trim()) newErrors.system_prompt = "System prompt is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    try {
      await onSubmit({
        ...form,
        description: form.description?.trim() || null,
        agent_type: form.agent_type || null,
      });
      setSubmitSuccess(true);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const inputCls =
    "w-full bg-[#1a1a1e] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#4a4a4f] focus:outline-none focus:border-[#1488fc]/50 focus:ring-1 focus:ring-[#1488fc]/30 transition-all";
  const labelCls = "block text-xs font-medium text-[#8a8a8f] mb-1.5";
  const errorCls = "text-xs text-red-400 mt-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {submitError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {submitError}
        </div>
      )}
      {submitSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
          Saved successfully!
        </div>
      )}

      {/* Name */}
      <div>
        <label className={labelCls}>Name *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Promo & Discounts"
          className={inputCls}
        />
        {errors.name && <p className={errorCls}>{errors.name}</p>}
      </div>

      {/* Description */}
      <div>
        <label className={labelCls}>Description</label>
        <textarea
          value={form.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Brief description shown to users"
          rows={2}
          className={inputCls}
        />
      </div>

      {/* Provider + Model */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Provider *</label>
          <select
            value={form.provider}
            onChange={(e) => set("provider", e.target.value)}
            className={inputCls}
          >
            {PROVIDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {errors.provider && <p className={errorCls}>{errors.provider}</p>}
        </div>
        <div>
          <label className={labelCls}>Model *</label>
          <input
            type="text"
            value={form.model}
            onChange={(e) => set("model", e.target.value)}
            placeholder="e.g. claude-sonnet-4-6"
            className={inputCls}
          />
          {errors.model && <p className={errorCls}>{errors.model}</p>}
        </div>
      </div>

      {/* System Prompt */}
      <div>
        <label className={labelCls}>System Prompt *</label>
        <textarea
          value={form.system_prompt}
          onChange={(e) => set("system_prompt", e.target.value)}
          rows={8}
          className={inputCls}
        />
        {errors.system_prompt && <p className={errorCls}>{errors.system_prompt}</p>}
      </div>

      {/* Temperature */}
      <div>
        <label className={labelCls}>
          Temperature — <span className="text-white font-medium">{form.temperature?.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={form.temperature}
          onChange={(e) => set("temperature", parseFloat(e.target.value))}
          className="w-full accent-[#1488fc]"
        />
        <div className="flex justify-between text-[10px] text-[#4a4a4f] mt-1">
          <span>Precise (0.0)</span>
          <span>Creative (1.0)</span>
        </div>
      </div>

      {/* Max Tokens + Context Window */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Max Tokens</label>
          <input
            type="number"
            value={form.max_tokens}
            onChange={(e) => set("max_tokens", parseInt(e.target.value, 10))}
            min={1}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Context Window Tokens</label>
          <input
            type="number"
            value={form.context_window_tokens}
            onChange={(e) => set("context_window_tokens", parseInt(e.target.value, 10))}
            min={1}
            className={inputCls}
          />
        </div>
      </div>

      {/* Agent Type */}
      <div>
        <label className={labelCls}>Agent Type</label>
        <select
          value={form.agent_type ?? ""}
          onChange={(e) => set("agent_type", e.target.value || null)}
          className={inputCls}
        >
          {AGENT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={form.is_active}
            onChange={(e) => set("is_active", e.target.checked)}
          />
          <div className="w-9 h-5 bg-white/[0.08] peer-checked:bg-[#1488fc] rounded-full transition-all peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:size-4 after:transition-all" />
        </label>
        <span className="text-sm text-[#8a8a8f]">
          Active <span className="text-[#4a4a4f]">(visible to users)</span>
        </span>
      </div>

      {/* Submit */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 rounded-xl bg-[#1488fc] hover:bg-[#1480e8] disabled:opacity-50 text-white text-sm font-medium transition-all flex items-center gap-2"
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
