import { apiFetch } from "@/services/apiClient";
import type { OrgAdmin, OrgCreatePayload, OrgUpdatePayload } from "@/types/organization";

export async function listAllOrgs(activeOnly = false): Promise<OrgAdmin[]> {
  const res = await apiFetch(`/api/v1/organizations?active_only=${activeOnly}`);
  const data = await res.json();
  return data.items as OrgAdmin[];
}

export async function getOrg(id: string): Promise<OrgAdmin> {
  const res = await apiFetch(`/api/v1/organizations/${id}`);
  return res.json();
}

export async function createOrg(data: OrgCreatePayload): Promise<OrgAdmin> {
  const res = await apiFetch("/api/v1/organizations", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateOrg(id: string, data: OrgUpdatePayload): Promise<OrgAdmin> {
  const res = await apiFetch(`/api/v1/organizations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deactivateOrg(id: string): Promise<void> {
  await apiFetch(`/api/v1/organizations/${id}`, { method: "DELETE" });
}
