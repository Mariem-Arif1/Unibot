import { apiFetch } from "./apiClient";
import type { ChatMessage, Paginated } from "@/types";

export async function listMessages(
  sessionId: string,
  page = 1,
  pageSize = 50
): Promise<Paginated<ChatMessage>> {
  const res = await apiFetch(
    `/api/v1/sessions/${sessionId}/messages?page=${page}&page_size=${pageSize}`
  );
  return res.json();
}
