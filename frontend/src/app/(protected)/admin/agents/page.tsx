"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useAdminLLMConfigs } from "@/hooks/useAdminLLMConfigs";
import LLMConfigTable from "@/components/admin/LLMConfigTable";
import DeleteLLMConfigDialog from "@/components/admin/DeleteLLMConfigDialog";
import { updateLLMConfig, deleteLLMConfig } from "@/services/adminLLMConfigService";
import type { LLMConfigAdmin } from "@/types";

export default function AdminAgentsPage() {
  const router = useRouter();
  const { configs, isLoading, error, mutate } = useAdminLLMConfigs();
  const [deleteTarget, setDeleteTarget] = useState<LLMConfigAdmin | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleToggleActive(cfg: LLMConfigAdmin) {
    await updateLLMConfig(cfg.id, { is_active: !cfg.is_active });
    mutate();
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteLLMConfig(deleteTarget.id);
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
          <h1 className="text-2xl font-bold text-white tracking-tight">Agents</h1>
          <p className="text-sm text-[#6a6a6f] mt-1">
            LLM configurations — provider, model, API key, and token limits.
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/agents/new")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1488fc] text-white text-sm font-medium hover:bg-[#1488fc]/90 transition-all"
        >
          <Plus className="size-4" />
          New Agent
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
        <p className="text-sm text-red-400">Failed to load agents. Please refresh.</p>
      )}

      {!isLoading && !error && (
        <div className="bg-[#111113] border border-white/[0.06] rounded-2xl overflow-hidden">
          <LLMConfigTable
            configs={configs}
            onEdit={(cfg) => router.push(`/admin/agents/${cfg.id}/edit`)}
            onToggleActive={handleToggleActive}
            onDelete={setDeleteTarget}
          />
        </div>
      )}

      <DeleteLLMConfigDialog
        open={!!deleteTarget}
        configName={deleteTarget?.name ?? ""}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
