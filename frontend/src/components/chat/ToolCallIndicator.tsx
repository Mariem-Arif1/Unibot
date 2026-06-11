"use client";

import { useEffect, useState } from "react";
import { Database, CheckCircle2, AlertCircle } from "lucide-react";

interface ToolResult {
  rowCount: number;
  success: boolean;
}

interface ToolCallIndicatorProps {
  tool: string | null;
  lastResult: ToolResult | null;
}

export default function ToolCallIndicator({ tool, lastResult }: ToolCallIndicatorProps) {
  const [showResult, setShowResult] = useState(false);
  const [visible, setVisible] = useState(false);

  // Show result banner briefly after tool completes
  useEffect(() => {
    if (lastResult !== null) {
      setShowResult(true);
      const t = setTimeout(() => setShowResult(false), 2000);
      return () => clearTimeout(t);
    }
  }, [lastResult]);

  // Track overall visibility — show when active or showing result
  useEffect(() => {
    setVisible(tool !== null || showResult);
  }, [tool, showResult]);

  if (!visible) return null;

  return (
    <div className="flex justify-start mb-2 animate-in fade-in duration-200">
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.07] bg-[#131315] text-xs text-[#8a8a8f]">
        {showResult && lastResult ? (
          lastResult.success ? (
            <>
              <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
              <span>
                Retrieved {lastResult.rowCount} row{lastResult.rowCount !== 1 ? "s" : ""}
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="size-3.5 text-red-400 shrink-0" />
              <span>Data lookup failed</span>
            </>
          )
        ) : (
          <>
            <Database className="size-3.5 text-[#4da5fc] shrink-0" />
            <span>Looking up data in Business Central</span>
            <span className="inline-flex gap-0.5 items-center">
              <span className="w-1 h-1 rounded-full bg-[#4da5fc] animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1 h-1 rounded-full bg-[#4da5fc] animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1 h-1 rounded-full bg-[#4da5fc] animate-bounce" />
            </span>
          </>
        )}
      </div>
    </div>
  );
}
