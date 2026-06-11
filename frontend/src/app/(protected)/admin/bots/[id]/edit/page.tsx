"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import useSWR from "swr";
import BotForm from "@/components/admin/BotForm";
import { getBot, updateBot } from "@/services/adminBotService";
import type { BotCreatePayload } from "@/types";

export default function EditBotPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { data: bot, isLoading, error } = useSWR(
    id ? `/api/v1/admin/bots/${id}` : null,
    () => getBot(id)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: BotCreatePayload) {
    setIsSubmitting(true);
    try {
      await updateBot(id, data);
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
        <h1 className="text-2xl font-bold text-white tracking-tight">Edit Bot</h1>
        {bot && <p className="text-sm text-[#6a6a6f] mt-1">{bot.name}</p>}
      </div>

      {isLoading && (
        <div className="space-y-4 max-w-2xl">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-white/[0.03] animate-pulse border border-white/[0.04]" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400">Failed to load bot. Please go back and try again.</p>
      )}

      {bot && !isLoading && (
        <BotForm
          initialValues={bot}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Save Changes"
        />
      )}
    </>
  );
}
