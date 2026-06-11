import { apiFetch } from "@/services/apiClient";
import type { LLMConfigAdmin, LLMConfigCreatePayload, LLMConfigUpdatePayload } from "@/types";

export async function listAllLLMConfigs(): Promise<LLMConfigAdmin[]> {
  const res = await apiFetch("/api/v1/admin/llm-configs");
  return res.json();
}

export async function getLLMConfig(id: string): Promise<LLMConfigAdmin> {
  const res = await apiFetch(`/api/v1/admin/llm-configs/${id}`);
  return res.json();
}

export async function createLLMConfig(data: LLMConfigCreatePayload): Promise<LLMConfigAdmin> {
  const res = await apiFetch("/api/v1/admin/llm-configs", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateLLMConfig(
  id: string,
  data: LLMConfigUpdatePayload
): Promise<LLMConfigAdmin> {
  const res = await apiFetch(`/api/v1/admin/llm-configs/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteLLMConfig(id: string): Promise<void> {
  await apiFetch(`/api/v1/admin/llm-configs/${id}`, { method: "DELETE" });
}
