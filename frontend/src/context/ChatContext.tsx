"use client";

import {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  Dispatch,
} from "react";
import type { Bot, ChatMessage, ChatSession, OptimisticMessage } from "@/types";

// ── State ────────────────────────────────────────────────────────────────────

export interface ChatState {
  currentBot: Bot | null;
  currentSession: ChatSession | null;
  messages: (ChatMessage | OptimisticMessage)[];
  sessions: ChatSession[];
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
}

const initialState: ChatState = {
  currentBot: null,
  currentSession: null,
  messages: [],
  sessions: [],
  isStreaming: false,
  streamingContent: "",
  error: null,
};

// ── Actions ───────────────────────────────────────────────────────────────────

export type ChatAction =
  | { type: "SET_BOT"; bot: Bot }
  | { type: "SET_SESSION"; session: ChatSession; messages: ChatMessage[] }
  | { type: "SET_SESSIONS"; sessions: ChatSession[] }
  | { type: "ADD_SESSION"; session: ChatSession }
  | { type: "UPDATE_SESSION"; session: ChatSession }
  | { type: "REMOVE_SESSION"; sessionId: string }
  | { type: "ADD_OPTIMISTIC_MESSAGE"; message: OptimisticMessage }
  | { type: "COMMIT_MESSAGE"; tempId: string; message: ChatMessage }
  | { type: "ERROR_MESSAGE"; tempId: string }
  | { type: "STREAM_START" }
  | { type: "STREAM_TOKEN"; token: string }
  | { type: "STREAM_DONE"; assistantMessage: ChatMessage }
  | { type: "STREAM_ERROR"; error: string }
  | { type: "PREPEND_MESSAGES"; messages: ChatMessage[] }
  | { type: "CLEAR_ERROR" }
  | { type: "CLEAR_SESSION" };

// ── Reducer ───────────────────────────────────────────────────────────────────

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "SET_BOT":
      return { ...state, currentBot: action.bot };

    case "SET_SESSION":
      return {
        ...state,
        currentSession: action.session,
        messages: action.messages,
        streamingContent: "",
        error: null,
      };

    case "SET_SESSIONS":
      return { ...state, sessions: action.sessions };

    case "ADD_SESSION":
      return { ...state, sessions: [action.session, ...state.sessions] };

    case "UPDATE_SESSION":
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.session.id ? action.session : s
        ),
        currentSession:
          state.currentSession?.id === action.session.id
            ? action.session
            : state.currentSession,
      };

    case "REMOVE_SESSION":
      return {
        ...state,
        sessions: state.sessions.filter((s) => s.id !== action.sessionId),
        currentSession:
          state.currentSession?.id === action.sessionId
            ? null
            : state.currentSession,
        messages:
          state.currentSession?.id === action.sessionId ? [] : state.messages,
      };

    case "ADD_OPTIMISTIC_MESSAGE":
      return { ...state, messages: [...state.messages, action.message] };

    case "ERROR_MESSAGE":
      return {
        ...state,
        messages: state.messages.filter((m) => m.id !== action.tempId),
        error: "Failed to send message. Please try again.",
      };

    case "STREAM_START":
      return { ...state, isStreaming: true, streamingContent: "", error: null };

    case "STREAM_TOKEN":
      return { ...state, streamingContent: state.streamingContent + action.token };

    case "STREAM_DONE":
      return {
        ...state,
        isStreaming: false,
        streamingContent: "",
        messages: [...state.messages, action.assistantMessage],
      };

    case "STREAM_ERROR":
      return {
        ...state,
        isStreaming: false,
        streamingContent: "",
        error: action.error,
      };

    case "PREPEND_MESSAGES":
      return { ...state, messages: [...action.messages, ...state.messages] };

    case "CLEAR_ERROR":
      return { ...state, error: null };

    case "CLEAR_SESSION":
      return { ...state, currentSession: null, messages: [], streamingContent: "", error: null };

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const ChatStateContext = createContext<ChatState>(initialState);
const ChatDispatchContext = createContext<Dispatch<ChatAction>>(() => {});

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  return (
    <ChatStateContext.Provider value={state}>
      <ChatDispatchContext.Provider value={dispatch}>
        {children}
      </ChatDispatchContext.Provider>
    </ChatStateContext.Provider>
  );
}

export const useChatState = () => useContext(ChatStateContext);
export const useChatDispatch = () => useContext(ChatDispatchContext);
