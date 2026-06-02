import { useState, useCallback } from "react";
import useSWR from "swr";
import { listMessages } from "@/services/messageService";
import type { ChatMessage, Paginated } from "@/types";

export function useMessages(sessionId: string | null) {
  const [extraMessages, setExtraMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  const key = sessionId ? `messages-${sessionId}-1` : null;

  const { data, isLoading, mutate } = useSWR<Paginated<ChatMessage>>(
    key,
    () => listMessages(sessionId!, 1, 50),
    {
      onSuccess: (d) => {
        setHasMore(d.has_more);
        setExtraMessages([]);
        setPage(1);
      },
    }
  );

  const loadMore = useCallback(async () => {
    if (!sessionId || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await listMessages(sessionId, nextPage, 50);
      setExtraMessages((prev) => [...res.items, ...prev]);
      setHasMore(res.has_more);
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  }, [sessionId, hasMore, loadingMore, page]);

  const messages: ChatMessage[] = [
    ...extraMessages,
    ...(data?.items ?? []),
  ];

  return { messages, isLoading, loadingMore, hasMore, loadMore, mutate };
}
