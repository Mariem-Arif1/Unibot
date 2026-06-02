import useSWR from "swr";
import { listSessions } from "@/services/sessionService";
import type { ChatSession } from "@/types";

export function useSessions(botId: string | null) {
  const key = botId ? `sessions-${botId}` : null;
  const { data, error, isLoading, mutate } = useSWR<ChatSession[]>(
    key,
    () => listSessions(botId!)
  );
  return { sessions: data ?? [], isLoading, error, mutate };
}
