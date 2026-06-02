import useSWR from "swr";
import { listBots } from "@/services/botService";
import type { Bot } from "@/types";

export function useBots() {
  const { data, error, isLoading } = useSWR<Bot[]>("bots", listBots);
  return { bots: data ?? [], isLoading, error };
}
