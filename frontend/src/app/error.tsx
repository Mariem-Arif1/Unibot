"use client";

import { useEffect } from "react";
import { Zap } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="size-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-2">
        <Zap className="size-6 text-red-400" />
      </div>
      <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
      <p className="text-sm text-[#6a6a6f] max-w-sm">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="px-5 py-2.5 bg-[#1488fc] hover:bg-[#1a94ff] text-white text-sm font-medium rounded-xl transition-all shadow-[0_0_16px_rgba(20,136,252,0.3)] active:scale-95"
      >
        Try again
      </button>
    </div>
  );
}
