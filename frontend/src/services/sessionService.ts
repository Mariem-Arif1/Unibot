import { apiFetch } from "./apiClient";
import type { ChatSession, Paginated } from "@/types";

export async function listSessions(botId: string): Promise<ChatSession[]> {
  const res = await apiFetch(`/api/v1/sessions?bot_id=${botId}`);
  const data: Paginated<ChatSession> = await res.json();
  return data.items;
}

export async function createSession(botId: string, name?: string): Promise<ChatSession> {
  const res = await apiFetch("/api/v1/sessions", {
    method: "POST",
    body: JSON.stringify({ bot_id: botId, name }),
  });
  return res.json();
}

export async function renameSession(sessionId: string, name: string): Promise<ChatSession> {
  const res = await apiFetch(`/api/v1/sessions/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function saveSession(sessionId: string): Promise<ChatSession> {
  const res = await apiFetch(`/api/v1/sessions/${sessionId}/save`, { method: "POST" });
  return res.json();
}

export async function deleteSession(sessionId: string): Promise<void> {
  await apiFetch(`/api/v1/sessions/${sessionId}`, { method: "DELETE" });
}
