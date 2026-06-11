import useSWR from "swr";
import { listAgents } from "@/services/agentService";
import type { Agent } from "@/types";

export function useAgents() {
  const { data, error, isLoading } = useSWR<Agent[]>("agents", listAgents);
  return { agents: data ?? [], isLoading, error };
}
