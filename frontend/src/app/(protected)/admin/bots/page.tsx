"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useAdminBots } from "@/hooks/useAdminBots";
import BotTable from "@/components/admin/BotTable";
import DeleteBotDialog from "@/components/admin/DeleteBotDialog";
import { updateBot, deleteBot } from "@/services/adminBotService";
import type { BotAdmin } from "@/types";

export default function AdminBotsPage() {
  const router = useRouter();
  const { bots, isLoading, error, mutate } = useAdminBots();
  const [deleteTarget, setDeleteTarget] = useState<BotAdmin | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleToggleActive(bot: BotAdmin) {
    await updateBot(bot.id, { is_active: !bot.is_active });
    mutate();
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteBot(deleteTarget.id);
      mutate();
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Bots</h1>
          <p className="text-sm text-[#6a6a6f] mt-1">
            Business personas — each bot has a system prompt and context.
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/bots/new")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1488fc] text-white text-sm font-medium hover:bg-[#1488fc]/90 transition-all"
        >
          <Plus className="size-4" />
          New Bot
        </button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse border border-white/[0.04]" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400">Failed to load bots. Please refresh.</p>
      )}

      {!isLoading && !error && (
        <div className="bg-[#111113] border border-white/[0.06] rounded-2xl overflow-hidden">
          <BotTable
            bots={bots}
            onEdit={(bot) => router.push(`/admin/bots/${bot.id}/edit`)}
            onToggleActive={handleToggleActive}
            onDelete={setDeleteTarget}
          />
        </div>
      )}

      <DeleteBotDialog
        open={!!deleteTarget}
        botName={deleteTarget?.name ?? ""}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
