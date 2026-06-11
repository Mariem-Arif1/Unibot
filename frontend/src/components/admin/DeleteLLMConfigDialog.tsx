"use client";

import { Trash2 } from "lucide-react";

interface DeleteLLMConfigDialogProps {
  open: boolean;
  configName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteLLMConfigDialog({
  open,
  configName,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteLLMConfigDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-[#1a1a1e] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="size-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <Trash2 className="size-4 text-red-400" />
          </div>
          <h2 className="font-semibold text-white">Delete LLM config?</h2>
        </div>
        <p className="text-sm text-[#8a8a8f] mb-6">
          <span className="text-white font-medium">&ldquo;{configName}&rdquo;</span> will be
          permanently deleted. This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-sm rounded-xl border border-white/[0.08] text-[#8a8a8f] hover:bg-white/[0.04] hover:text-white transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm rounded-xl bg-red-500/20 border border-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting && (
              <span className="size-3 rounded-full border-2 border-red-400/30 border-t-red-400 animate-spin" />
            )}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
