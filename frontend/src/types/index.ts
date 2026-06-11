export interface User {
  id: string;
  email: string;
  display_name: string;
  role: "admin" | "user";
  is_active: boolean;
  created_at: string;
}

/** A bot = business persona stored in the `agents` table. */
export interface Agent {
  id: string;
  name: string;
  description: string | null;
  agent_type: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id?: string;
  agent_id: string;
  name: string;
  is_saved: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface OptimisticMessage extends ChatMessage {
  isOptimistic: true;
  isError?: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page?: number;
  page_size?: number;
  has_more?: boolean;
}

// ── Admin: Bot management (agents table) ────────────────────────────────────

export interface BotAdmin {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  agent_type: string | null;
  temperature: number;
  max_tokens: number;
  context_window_tokens: number;
  is_active: boolean;
  created_at: string;
}

export interface BotCreatePayload {
  name: string;
  description?: string | null;
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  context_window_tokens?: number;
  agent_type?: string | null;
  is_active?: boolean;
}

export type BotUpdatePayload = Partial<BotCreatePayload>;

// ── Admin: LLM config management (llm_configs table) ────────────────────────

export interface LLMConfigAdmin {
  id: string;
  name: string;
  description: string | null;
  provider: string;
  model: string;
  api_key_masked: string | null;
  max_tokens: number;
  context_window_tokens: number;
  temperature: number;
  is_active: boolean;
  bot_id: string | null;
  bot_name: string | null;
  created_at: string;
}

export interface LLMConfigCreatePayload {
  name: string;
  description?: string | null;
  provider: string;
  model: string;
  api_key?: string | null;
  max_tokens?: number;
  context_window_tokens?: number;
  temperature?: number;
  is_active?: boolean;
  bot_id?: string | null;
}

export type LLMConfigUpdatePayload = Partial<LLMConfigCreatePayload>;
