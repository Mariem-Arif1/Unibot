import { apiFetch } from "./apiClient";
import type { Bot } from "@/types";

export async function listBots(): Promise<Bot[]> {
  const res = await apiFetch("/api/v1/bots");
  const data = await res.json();
  return data.items as Bot[];
}

export async function getBot(botId: string): Promise<Bot> {
  const res = await apiFetch(`/api/v1/bots/${botId}`);
  return res.json();
}
