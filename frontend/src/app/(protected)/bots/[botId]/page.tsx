"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChatProvider, useChatDispatch } from "@/context/ChatContext";
import AppHeader from "@/components/layout/AppHeader";
import SessionSidebar from "@/components/sessions/SessionSidebar";
import ChatArea from "@/components/chat/ChatArea";
import { getBot } from "@/services/botService";
import type { Bot } from "@/types";

function ChatPageInner() {
  const params = useParams();
  const botId = params.botId as string;
  const dispatch = useChatDispatch();
  const [bot, setBot] = useState<Bot | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    getBot(botId).then((b) => {
      setBot(b);
      dispatch({ type: "SET_BOT", bot: b });
    });
  }, [botId, dispatch]);

  return (
    <div className="flex flex-col h-screen bg-[#0f0f0f]">
      <AppHeader onMenuToggle={() => setSidebarOpen((o) => !o)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-60 shrink-0 border-r border-white/[0.06] flex-col">
          <SessionSidebar botId={botId} />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="relative z-50 w-72 border-r border-white/[0.06] flex flex-col h-full">
              <SessionSidebar
                botId={botId}
                onSessionSelect={() => setSidebarOpen(false)}
              />
            </aside>
          </div>
        )}

        {/* Main chat area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {bot ? (
            <ChatArea />
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#3a3a3f] text-sm">
              Loading…
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <ChatProvider>
      <ChatPageInner />
    </ChatProvider>
  );
}
