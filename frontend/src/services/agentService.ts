import { apiFetch } from "./apiClient";
import type { Agent, Paginated } from "@/types";

export async function listAgents(): Promise<Agent[]> {
  const res = await apiFetch("/api/v1/agents");
  const data: Paginated<Agent> = await res.json();
  return data.items;
}

export async function getAgent(agentId: string): Promise<Agent> {
  const res = await apiFetch(`/api/v1/agents/${agentId}`);
  return res.json();
}
