"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { ChatSession } from "@/types";
import { renameSession, deleteSession } from "@/services/sessionService";
import DeleteConfirmDialog from "./DeleteConfirmDialog";

interface SessionListItemProps {
  session: ChatSession;
  isActive: boolean;
  onClick: () => void;
  onMutate: () => void;
  onDeleted: (sessionId: string) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SessionListItem({
  session,
  isActive,
  onClick,
  onMutate,
  onDeleted,
}: SessionListItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(session.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (renaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [renaming]);

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  async function commitRename() {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === session.name) {
      setRenaming(false);
      setRenameValue(session.name);
      return;
    }
    await renameSession(session.id, trimmed);
    onMutate();
    setRenaming(false);
  }

  function handleRenameKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commitRename();
    if (e.key === "Escape") {
      setRenaming(false);
      setRenameValue(session.name);
    }
  }

  async function handleDeleteConfirm() {
    await deleteSession(session.id);
    onDeleted(session.id);
    onMutate();
    setConfirmDelete(false);
  }

  return (
    <>
      <div
        className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
          isActive
            ? "bg-white/[0.08] text-white"
            : "text-[#8a8a8f] hover:bg-white/[0.04] hover:text-white"
        }`}
        onClick={() => {
          if (!renaming) onClick();
        }}
      >
        {/* Active indicator */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#1488fc] rounded-full" />
        )}

        <div className="flex-1 min-w-0 pl-1">
          {renaming ? (
            <input
              ref={inputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleRenameKey}
              onClick={(e) => e.stopPropagation()}
              className="w-full text-sm bg-white/[0.08] border border-white/[0.12] rounded-lg px-2 py-0.5 text-white focus:outline-none focus:border-[#1488fc]/60"
            />
          ) : (
            <>
              <p className="text-sm font-medium truncate">{session.name}</p>
              <p className="text-[11px] text-[#5a5a5f] mt-0.5">
                {timeAgo(session.updated_at)}
              </p>
            </>
          )}
        </div>

        {/* Three-dot menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
            className={`p-1 rounded-lg transition-all ${
              menuOpen
                ? "opacity-100 bg-white/[0.08] text-white"
                : "opacity-0 group-hover:opacity-100 text-[#6a6a6f] hover:text-white hover:bg-white/[0.06]"
            }`}
            aria-label="Session options"
          >
            <MoreHorizontal className="size-3.5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-7 z-20 bg-[#1a1a1e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden py-1 w-36 animate-in fade-in slide-in-from-top-1 duration-150">
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#a0a0a5] hover:bg-white/[0.06] hover:text-white transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  setRenaming(true);
                  setRenameValue(session.name);
                }}
              >
                <Pencil className="size-3.5" />
                Rename
              </button>
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  setConfirmDelete(true);
                }}
              >
                <Trash2 className="size-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmDialog
        open={confirmDelete}
        sessionName={session.name}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
