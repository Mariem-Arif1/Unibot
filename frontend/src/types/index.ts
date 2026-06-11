export interface User {
  id: string;
  email: string;
  display_name: string;
  role: "admin" | "user";
  is_active: boolean;
  created_at: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  agent_type: string | null;
  is_active: boolean;
  created_at: string;
}

/** Legacy model config — kept for the /bots admin API. Not used in main app flow. */
export interface Bot {
  id: string;
  name: string;
  description: string | null;
  provider: "anthropic" | "openai" | "gemini";
  model: string;
  is_active: boolean;
  agent_type: string | null;
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
