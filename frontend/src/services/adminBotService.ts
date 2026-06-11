import { apiFetch } from "@/services/apiClient";
import type { BotAdmin, BotCreatePayload, BotUpdatePayload } from "@/types";

export async function listAllBots(): Promise<BotAdmin[]> {
  const res = await apiFetch("/api/v1/admin/bots");
  return res.json();
}

export async function getBot(id: string): Promise<BotAdmin> {
  const res = await apiFetch(`/api/v1/admin/bots/${id}`);
  return res.json();
}

export async function createBot(data: BotCreatePayload): Promise<BotAdmin> {
  const res = await apiFetch("/api/v1/admin/bots", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateBot(
  id: string,
  data: BotUpdatePayload
): Promise<BotAdmin> {
  const res = await apiFetch(`/api/v1/admin/bots/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteBot(id: string): Promise<void> {
  await apiFetch(`/api/v1/admin/bots/${id}`, { method: "DELETE" });
}
