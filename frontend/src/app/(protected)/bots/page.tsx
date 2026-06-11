"use client";

import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import RayBackground from "@/components/layout/RayBackground";
import BotCard from "@/components/bots/BotCard";
import { useAgents } from "@/hooks/useAgents";

export default function BotsPage() {
  const router = useRouter();
  const { agents, isLoading, error } = useAgents();

  function handleAgentClick(agentId: string) {
    router.push(`/bots/${agentId}`);
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0f0f0f] overflow-hidden">
      <RayBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        <AppHeader />

        <main className="flex-1 flex flex-col items-center px-4 pt-16 pb-12">
          {/* Hero text */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.08] bg-white/[0.04] text-xs text-[#8a8a8f] mb-6">
              <Zap className="size-3.5 text-[#1488fc]" />
              <span>Your AI workspace</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-3">
              Choose your{" "}
              <span className="bg-gradient-to-b from-[#4da5fc] via-[#4da5fc] to-white bg-clip-text text-transparent italic">
                agent
              </span>
            </h1>
            <p className="text-base text-[#6a6a6f] max-w-md mx-auto">
              Each agent is configured with its own tools, context, and
              capabilities.
            </p>
          </div>

          {/* Agent grid */}
          <div className="w-full max-w-4xl">
            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-white/[0.06] bg-[#1e1e22] p-5 h-32 animate-pulse"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="size-10 rounded-xl bg-white/[0.04]" />
                      <div className="h-3 bg-white/[0.04] rounded-full w-20" />
                    </div>
                    <div className="h-3 bg-white/[0.04] rounded-full w-2/3 mb-2" />
                    <div className="h-2.5 bg-white/[0.04] rounded-full w-full" />
                  </div>
                ))}
              </div>
            )}

            {error && (
              <p className="text-center text-sm text-red-400">
                Failed to load agents. Please refresh.
              </p>
            )}

            {!isLoading && !error && agents.length === 0 && (
              <p className="text-center text-sm text-[#4a4a4f] italic">
                No agents available yet.
              </p>
            )}

            {!isLoading && !error && agents.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map((agent) => (
                  <BotCard key={agent.id} agent={agent} onClick={handleAgentClick} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
