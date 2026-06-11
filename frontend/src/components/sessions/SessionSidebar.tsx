"use client";

import { Plus } from "lucide-react";
import { useChatState, useChatDispatch } from "@/context/ChatContext";
import { useSessions } from "@/hooks/useSessions";
import { listMessages } from "@/services/messageService";
import SessionListItem from "./SessionListItem";

interface SessionSidebarProps {
  agentId: string;
  onSessionSelect?: () => void;
}

export default function SessionSidebar({
  agentId,
  onSessionSelect,
}: SessionSidebarProps) {
  const { currentSession } = useChatState();
  const dispatch = useChatDispatch();
  const { sessions, isLoading, mutate } = useSessions(agentId);

  function handleNewChat() {
    dispatch({ type: "CLEAR_SESSION" });
    onSessionSelect?.();
  }

  async function handleSelectSession(sessionId: string) {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    try {
      const paginated = await listMessages(sessionId, 1, 50);
      dispatch({ type: "SET_SESSION", session, messages: paginated.items });
    } catch {
      dispatch({ type: "SET_SESSION", session, messages: [] });
    }
    onSessionSelect?.();
  }

  function handleDeleted(sessionId: string) {
    dispatch({ type: "REMOVE_SESSION", sessionId });
  }

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f]">
      {/* New chat button */}
      <div className="p-3">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#1488fc]/10 border border-[#1488fc]/20 text-[#4da5fc] text-sm font-medium hover:bg-[#1488fc]/20 hover:border-[#1488fc]/30 transition-all duration-200 active:scale-[0.98]"
        >
          <Plus className="size-4" />
          New Chat
        </button>
      </div>

      <div className="px-2 pb-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#3a3a3f] px-2 mb-1">
          Sessions
        </p>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {isLoading && (
          <div className="space-y-1.5 px-1 pt-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-11 rounded-xl bg-white/[0.03] animate-pulse"
              />
            ))}
          </div>
        )}

        {!isLoading && sessions.length === 0 && (
          <p className="text-xs text-[#3a3a3f] text-center mt-10 px-4">
            No sessions yet
          </p>
        )}

        {sessions.map((session) => (
          <SessionListItem
            key={session.id}
            session={session}
            isActive={currentSession?.id === session.id}
            onClick={() => handleSelectSession(session.id)}
            onMutate={mutate}
            onDeleted={handleDeleted}
          />
        ))}
      </div>
    </div>
  );
}
