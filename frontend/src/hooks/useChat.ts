"use client";

import { useCallback, useRef } from "react";
import { mutate as swrMutate } from "swr";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useChatState, useChatDispatch } from "@/context/ChatContext";
import { apiUrl } from "@/services/apiClient";
import type { ChatMessage, OptimisticMessage } from "@/types";

export function useChat() {
  const { currentSession, isStreaming } = useChatState();
  const dispatch = useChatDispatch();
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!currentSession || isStreaming) return;

      const tempId = `optimistic-${Date.now()}`;
      const optimistic: OptimisticMessage = {
        id: tempId,
        session_id: currentSession.id,
        role: "user",
        content,
        created_at: new Date().toISOString(),
        isOptimistic: true,
      };

      dispatch({ type: "ADD_OPTIMISTIC_MESSAGE", message: optimistic });
      dispatch({ type: "STREAM_START" });

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        await fetchEventSource(
          apiUrl(`/api/v1/sessions/${currentSession.id}/chat`),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ content }),
            signal: ctrl.signal,

            onopen: async (res) => {
              if (!res.ok) {
                dispatch({ type: "ERROR_MESSAGE", tempId });
                let errMsg = `Server error: ${res.status}`;
                if (res.status === 503) {
                  errMsg = "API key not configured for this bot. Add the provider key in the backend .env to start chatting.";
                } else if (res.status === 401) {
                  errMsg = "Session expired. Please log in again.";
                } else if (res.status === 404) {
                  errMsg = "Session not found. Please start a new chat.";
                }
                try {
                  const body = await res.json();
                  if (body?.detail) errMsg = body.detail;
                } catch { /* ignore */ }
                dispatch({ type: "STREAM_ERROR", error: errMsg });
                ctrl.abort();
              }
            },

            onmessage: (ev) => {
              if (ev.event === "token") {
                try {
                  const { token } = JSON.parse(ev.data) as { token: string };
                  dispatch({ type: "STREAM_TOKEN", token });
                } catch {
                  // ignore malformed token event
                }
              } else if (ev.event === "done") {
                try {
                  const msg = JSON.parse(ev.data) as ChatMessage;
                  dispatch({ type: "STREAM_DONE", assistantMessage: msg });
                } catch {
                  // Fallback: synthesize assistant message from accumulated content
                  dispatch({
                    type: "STREAM_DONE",
                    assistantMessage: {
                      id: `assistant-${Date.now()}`,
                      session_id: currentSession.id,
                      role: "assistant",
                      content: "",
                      created_at: new Date().toISOString(),
                    } as ChatMessage,
                  });
                }
              } else if (ev.event === "session_name") {
                try {
                  const { name, is_saved } = JSON.parse(ev.data) as { session_id: string; name: string; is_saved?: boolean };
                  const updatedSession = {
                    ...currentSession,
                    name,
                    ...(is_saved ? { is_saved: true } : {}),
                    updated_at: new Date().toISOString(),
                  };
                  dispatch({ type: "UPDATE_SESSION", session: updatedSession });
                  // Refresh sidebar so the saved session appears
                  if (is_saved) {
                    swrMutate(`sessions-${currentSession.bot_id}`);
                  }
                } catch {
                  // ignore malformed event
                }
              } else if (ev.event === "error") {
                let errMsg = "An error occurred";
                try {
                  const d = JSON.parse(ev.data) as { detail?: string };
                  errMsg = d.detail ?? errMsg;
                } catch {
                  /* ignore */
                }
                dispatch({ type: "ERROR_MESSAGE", tempId });
                dispatch({ type: "STREAM_ERROR", error: errMsg });
                ctrl.abort();
              }
            },

            onerror: (err) => {
              dispatch({ type: "ERROR_MESSAGE", tempId });
              dispatch({
                type: "STREAM_ERROR",
                error: err instanceof Error ? err.message : "Connection error",
              });
              throw err; // stops fetchEventSource retries
            },

            openWhenHidden: true,
          }
        );
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          dispatch({ type: "ERROR_MESSAGE", tempId });
          dispatch({
            type: "STREAM_ERROR",
            error: "Connection failed. Please try again.",
          });
        }
      }
    },
    [currentSession, isStreaming, dispatch]
  );

  return { sendMessage, isStreaming };
}
