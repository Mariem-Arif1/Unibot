import useSWR from "swr";
import { listSessions } from "@/services/sessionService";
import type { ChatSession } from "@/types";

export function useSessions(agentId: string | null) {
  const key = agentId ? `sessions-${agentId}` : null;
  const { data, error, isLoading, mutate } = useSWR<ChatSession[]>(
    key,
    () => listSessions(agentId!)
  );
  return { sessions: data ?? [], isLoading, error, mutate };
}
