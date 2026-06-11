import useSWR, { type KeyedMutator } from "swr";
import { listAllLLMConfigs } from "@/services/adminLLMConfigService";
import type { LLMConfigAdmin } from "@/types";

export function useAdminLLMConfigs(): {
  configs: LLMConfigAdmin[];
  isLoading: boolean;
  error: unknown;
  mutate: KeyedMutator<LLMConfigAdmin[]>;
} {
  const { data, isLoading, error, mutate } = useSWR<LLMConfigAdmin[]>(
    "/api/v1/admin/llm-configs",
    listAllLLMConfigs
  );

  return { configs: data ?? [], isLoading, error, mutate };
}
