"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import useSWR from "swr";
import LLMConfigForm from "@/components/admin/LLMConfigForm";
import { createLLMConfig } from "@/services/adminLLMConfigService";
import { listAllBots } from "@/services/adminBotService";
import type { LLMConfigCreatePayload } from "@/types";

export default function NewAgentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: bots = [] } = useSWR("/api/v1/admin/bots", listAllBots);

  async function handleSubmit(data: LLMConfigCreatePayload) {
    setIsSubmitting(true);
    try {
      await createLLMConfig(data);
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
        <h1 className="text-2xl font-bold text-white tracking-tight">New Agent</h1>
        <p className="text-sm text-[#6a6a6f] mt-1">
          Configure an LLM provider, model, and API key. Assign to a bot.
        </p>
      </div>
      <LLMConfigForm
        bots={bots}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Create Agent"
      />
    </>
  );
}
