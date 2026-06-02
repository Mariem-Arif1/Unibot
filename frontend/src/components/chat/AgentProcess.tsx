"use client";

import { useState, useEffect } from "react";
import { Clock, Globe, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchResult {
  title: string;
  source: string;
}

export type ProcessStep =
  | { type: "thinking"; text: string }
  | { type: "search"; query: string; results: SearchResult[]; count?: number }
  | { type: "done"; label?: string };

export interface AgentProcessData {
  title: string;
  steps: ProcessStep[];
}

// ─── JSONL parser (used by both MessageBubble and StreamingBubble) ────────────

/**
 * Parses a JSONL process block from raw streamed/completed content.
 * Returns partial data as soon as any lines are valid — enabling progressive rendering.
 * Also returns the answer text that follows the closing ```.
 */
export function parseProcessBlock(content: string): {
  data: AgentProcessData | null;
  answer: string;
  blockOpen: boolean; // true while ``` hasn't closed yet
} {
  // Match open block (streaming) or closed block (complete)
  const closedMatch = content.match(/^```process\n([\s\S]*?)```\n?([\s\S]*)$/);
  const openMatch = !closedMatch && content.match(/^```process\n([\s\S]*)$/);

  const rawLines = closedMatch ? closedMatch[1] : openMatch ? openMatch[1] : null;
  const afterBlock = closedMatch ? closedMatch[2] : "";

  if (rawLines === null) return { data: null, answer: content, blockOpen: false };

  let title = "";
  const steps: ProcessStep[] = [];

  for (const line of rawLines.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (obj.type === "title") {
        title = obj.text ?? "";
      } else if (["thinking", "search", "done"].includes(obj.type)) {
        steps.push(obj as ProcessStep);
      }
    } catch {
      // Line still streaming — skip
    }
  }

  const data: AgentProcessData | null =
    title || steps.length > 0 ? { title, steps } : null;

  return {
    data,
    answer: afterBlock.trim(),
    blockOpen: !closedMatch,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FAVICON_COLORS = [
  "#e34c26", "#1d6fa4", "#2da44e", "#8957e5",
  "#e36209", "#cf222e", "#0969da", "#6e7781",
];

function faviconColor(source: string) {
  let h = 0;
  for (let i = 0; i < source.length; i++) h = source.charCodeAt(i) + ((h << 5) - h);
  return FAVICON_COLORS[Math.abs(h) % FAVICON_COLORS.length];
}

// ─── Step sub-components ──────────────────────────────────────────────────────

function FaviconDot({ source }: { source: string }) {
  return (
    <span
      className="w-5 h-5 rounded-sm flex items-center justify-center flex-shrink-0 text-white font-bold"
      style={{ fontSize: 10, backgroundColor: faviconColor(source) }}
    >
      {(source.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}

function ThinkingStep({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 py-2 animate-in fade-in duration-300">
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mt-0.5">
        <Clock className="w-4 h-4 text-[#5a5a5f]" />
      </div>
      <p className="text-sm text-[#c8c8cc] leading-snug">{text}</p>
    </div>
  );
}

function SearchStep({ query, results, count }: Extract<ProcessStep, { type: "search" }>) {
  const displayCount = count ?? results.length;
  return (
    <div className="flex items-start gap-3 py-2 animate-in fade-in duration-300">
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mt-0.5">
        <Globe className="w-4 h-4 text-[#5a5a5f]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-sm text-white font-medium">{query}</span>
          {displayCount > 0 && (
            <span className="text-xs text-[#5a5a5f] flex-shrink-0">
              {displayCount} résultat{displayCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {results.length > 0 && (
          <div className="rounded-lg border border-white/[0.07] bg-[#161618] overflow-hidden max-h-36 overflow-y-auto divide-y divide-white/[0.05]">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2">
                <FaviconDot source={r.source} />
                <span className="flex-1 min-w-0 text-xs text-[#c8c8cc] truncate">{r.title}</span>
                <span className="text-[10px] text-[#4a4a4f] flex-shrink-0 truncate max-w-[120px]">
                  {r.source}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DoneStep({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-2 animate-in fade-in duration-300">
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
        <CheckCircle2 className="w-4 h-4 text-green-500" strokeWidth={2} />
      </div>
      <span className="text-sm text-[#c8c8cc]">{label ?? "Terminé"}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const STEP_INTERVAL_MS = 280; // delay between each step reveal

export default function AgentProcess({ data }: { data: AgentProcessData }) {
  const [open, setOpen] = useState(true);
  // visibleCount drives the one-by-one reveal regardless of how fast data arrives
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount < data.steps.length) {
      const t = setTimeout(
        () => setVisibleCount((v) => v + 1),
        visibleCount === 0 ? 80 : STEP_INTERVAL_MS,
      );
      return () => clearTimeout(t);
    }
  }, [visibleCount, data.steps.length]);

  const visibleSteps = data.steps.slice(0, visibleCount);

  return (
    <div className="mb-3 rounded-xl border border-white/[0.07] bg-[#131315] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-xs text-[#6a6a6f] truncate pr-2">
          {data.title || "…"}
        </span>
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-[#4a4a4f] flex-shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-[#4a4a4f] flex-shrink-0" />}
      </button>

      {/* Steps */}
      {open && (
        <div className="px-4 pb-2 border-t border-white/[0.05]">
          <div className="relative">
            <div className="absolute left-[9px] top-0 bottom-0 w-px bg-white/[0.06]" aria-hidden />
            <div>
              {visibleSteps.map((step, i) => (
                <div key={i} className="relative">
                  {step.type === "thinking" && <ThinkingStep text={step.text} />}
                  {step.type === "search" && (
                    <SearchStep type="search" query={step.query} results={step.results} count={step.count} />
                  )}
                  {step.type === "done" && <DoneStep label={step.label} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
