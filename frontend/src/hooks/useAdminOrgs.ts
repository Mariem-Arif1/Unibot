import useSWR, { type KeyedMutator } from "swr";
import { listAllOrgs } from "@/services/adminOrgService";
import type { OrgAdmin } from "@/types/organization";

export function useAdminOrgs(): {
  orgs: OrgAdmin[];
  isLoading: boolean;
  error: unknown;
  mutate: KeyedMutator<OrgAdmin[]>;
} {
  const { data, isLoading, error, mutate } = useSWR<OrgAdmin[]>(
    "/api/v1/organizations?active_only=false",
    () => listAllOrgs(false)
  );

  return { orgs: data ?? [], isLoading, error, mutate };
}
