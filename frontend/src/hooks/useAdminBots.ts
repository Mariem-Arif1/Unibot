import useSWR, { type KeyedMutator } from "swr";
import { listAllBots } from "@/services/adminBotService";
import type { BotAdmin } from "@/types";

export function useAdminBots(): {
  bots: BotAdmin[];
  isLoading: boolean;
  error: unknown;
  mutate: KeyedMutator<BotAdmin[]>;
} {
  const { data, isLoading, error, mutate } = useSWR<BotAdmin[]>(
    "/api/v1/admin/bots",
    listAllBots
  );

  return { bots: data ?? [], isLoading, error, mutate };
}
