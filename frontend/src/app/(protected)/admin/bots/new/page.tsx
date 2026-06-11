"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import BotForm from "@/components/admin/BotForm";
import { createBot } from "@/services/adminBotService";
import type { BotCreatePayload } from "@/types";

export default function NewBotPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: BotCreatePayload) {
    setIsSubmitting(true);
    try {
      await createBot(data);
      router.push("/admin/bots");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="mb-8">
        <button
          onClick={() => router.push("/admin/bots")}
          className="flex items-center gap-1.5 text-sm text-[#6a6a6f] hover:text-white transition-colors mb-4"
        >
          <ChevronLeft className="size-4" />
          Back to Bots
        </button>
        <h1 className="text-2xl font-bold text-white tracking-tight">New Bot</h1>
        <p className="text-sm text-[#6a6a6f] mt-1">
          Define a business persona with a system prompt.
        </p>
      </div>
      <BotForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Create Bot"
      />
    </>
  );
}
