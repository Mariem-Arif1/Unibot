"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, X } from "lucide-react";
import { mutate as swrMutate } from "swr";
import { useChatState, useChatDispatch } from "@/context/ChatContext";
import { useChat } from "@/hooks/useChat";
import { listMessages } from "@/services/messageService";
import { createSession, saveSession } from "@/services/sessionService";
import RayBackground from "@/components/layout/RayBackground";
import MessageBubble from "./MessageBubble";
import StreamingBubble from "./StreamingBubble";
import ToolCallIndicator from "./ToolCallIndicator";
import MessageInput from "./MessageInput";

export default function ChatArea() {
  const { currentSession, currentAgent, messages, isStreaming, streamingContent, error, activeToolCall, lastToolResult } =
    useChatState();
  const dispatch = useChatDispatch();
  const { sendMessage } = useChat();
  const [inputValue, setInputValue] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevSessionId = useRef<string | null>(null);
  // queue a message to send after session is created
  const pendingMessage = useRef<string | null>(null);

  // Reset pagination when session changes
  useEffect(() => {
    if (currentSession?.id !== prevSessionId.current) {
      prevSessionId.current = currentSession?.id ?? null;
      setPage(1);
      setHasMore(false);
      if (currentSession) {
        listMessages(currentSession.id, 1, 50).then((res) => {
          setHasMore(res.has_more ?? false);
        });
      }
    }
  }, [currentSession?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Once a session is ready and we have a pending message, fire it
  useEffect(() => {
    if (currentSession && pendingMessage.current) {
      const msg = pendingMessage.current;
      pendingMessage.current = null;
      sendMessage(msg);
    }
  }, [currentSession?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom on new messages or streaming tokens
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent]);

  async function handleLoadMore() {
    if (!currentSession || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await listMessages(currentSession.id, nextPage, 50);
      dispatch({ type: "PREPEND_MESSAGES", messages: res.items });
      setHasMore(res.has_more ?? false);
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleSaveSession() {
    if (!currentSession || saving || currentSession.is_saved) return;
    setSaving(true);
    try {
      const updated = await saveSession(currentSession.id);
      dispatch({ type: "UPDATE_SESSION", session: updated });
      // Refresh the sidebar's saved sessions list
      await swrMutate(`sessions-${currentSession.bot_id}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleSend(content: string) {
    setInputValue("");

    // If no session exists yet, create one then send
    if (!currentSession) {
      if (!currentAgent || creatingSession) return;
      setCreatingSession(true);
      try {
        const session = await createSession(currentAgent.id);
        pendingMessage.current = content;
        dispatch({ type: "ADD_SESSION", session });
        dispatch({ type: "SET_SESSION", session, messages: [] });
      } finally {
        setCreatingSession(false);
      }
      return;
    }

    sendMessage(content);
  }

  // Empty state — no session selected
  if (!currentSession) {
    return (
      <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden bg-[#0f0f0f]">
        <RayBackground />
        <div className="relative z-10 flex flex-col items-center px-4 -mt-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight text-center mb-2">
            What will you{" "}
            <span className="bg-gradient-to-b from-[#4da5fc] via-[#4da5fc] to-white bg-clip-text text-transparent italic">
              ask
            </span>{" "}
            today?
          </h1>
          <p className="text-base text-[#6a6a6f] text-center mb-10">
            Type a message to start a new chat.
          </p>
          <div className="w-full max-w-xl">
            <MessageInput
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSend}
              disabled={creatingSession}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f]">
      {/* Session title bar */}
      <div className="px-5 py-3 border-b border-white/[0.06] shrink-0 flex items-center justify-between gap-3">
        <h2 className="font-medium text-sm text-[#8a8a8f] truncate">
          {currentSession.name}
        </h2>
        {currentSession.is_saved ? (
          <BookmarkCheck className="size-4 shrink-0 text-[#1488fc]" aria-label="Saved" />
        ) : (
          <button
            onClick={handleSaveSession}
            disabled={saving}
            title="Save this conversation"
            className="shrink-0 p-1 rounded-lg text-[#5a5a5f] hover:text-[#4da5fc] hover:bg-white/[0.06] transition-all disabled:opacity-40"
          >
            <Bookmark className="size-4" />
          </button>
        )}
      </div>

      {/* Messages scroll area */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {hasMore && (
          <div className="flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="text-xs text-[#4da5fc] hover:text-[#1488fc] disabled:opacity-50 transition-colors"
            >
              {loadingMore ? "Loading…" : "Load earlier messages"}
            </button>
          </div>
        )}

        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-48 text-[#3a3a3f]">
            <p className="text-sm">Send a message to start the conversation</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isStreaming && (
          <>
            <ToolCallIndicator
              tool={activeToolCall?.tool ?? null}
              lastResult={lastToolResult ? { rowCount: lastToolResult.rowCount, success: lastToolResult.success } : null}
            />
            <StreamingBubble
              content={streamingContent}
              isWaiting={!streamingContent && activeToolCall === null}
            />
          </>
        )}

        {error && !isStreaming && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
              <span>{error}</span>
              <button
                className="text-red-400/60 hover:text-red-400 transition-colors"
                onClick={() => dispatch({ type: "CLEAR_ERROR" })}
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <MessageInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        disabled={isStreaming}
      />
    </div>
  );
}
