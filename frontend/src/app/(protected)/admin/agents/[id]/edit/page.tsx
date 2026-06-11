"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import useSWR from "swr";
import LLMConfigForm from "@/components/admin/LLMConfigForm";
import { getLLMConfig, updateLLMConfig } from "@/services/adminLLMConfigService";
import { listAllBots } from "@/services/adminBotService";
import type { LLMConfigCreatePayload } from "@/types";

export default function EditAgentPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { data: cfg, isLoading, error } = useSWR(
    id ? `/api/v1/admin/llm-configs/${id}` : null,
    () => getLLMConfig(id)
  );
  const { data: bots = [] } = useSWR("/api/v1/admin/bots", listAllBots);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: LLMConfigCreatePayload) {
    setIsSubmitting(true);
    try {
      await updateLLMConfig(id, data);
      router.push("/admin/agents");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="mb-8">
        <button
          onClick={() => router.push("/admin/agents")}
          className="flex items-center gap-1.5 text-sm text-[#6a6a6f] hover:text-white transition-colors mb-4"
        >
          <ChevronLeft className="size-4" />
          Back to Agents
        </button>
        <h1 className="text-2xl font-bold text-white tracking-tight">Edit Agent</h1>
        {cfg && <p className="text-sm text-[#6a6a6f] mt-1">{cfg.name}</p>}
      </div>

      {isLoading && (
        <div className="space-y-4 max-w-2xl">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-white/[0.03] animate-pulse border border-white/[0.04]" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400">Failed to load agent. Please go back and try again.</p>
      )}

      {cfg && !isLoading && (
        <LLMConfigForm
          initialValues={cfg}
          bots={bots}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Save Changes"
        />
      )}
    </>
  );
}
