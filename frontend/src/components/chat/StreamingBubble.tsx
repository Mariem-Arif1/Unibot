"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AgentProcess, { parseProcessBlock } from "./AgentProcess";

interface StreamingBubbleProps {
  content: string;
  isWaiting?: boolean;
}

export default function StreamingBubble({ content, isWaiting = false }: StreamingBubbleProps) {
  const { data, answer, blockOpen } = parseProcessBlock(content);

  return (
    <div className="flex justify-start">
      <div className="max-w-[75%] bg-[#1e1e22] ring-1 ring-white/[0.08] text-[#e8e8ea] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed">
        {isWaiting && !content ? (
          <span className="inline-flex gap-1 items-center h-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4da5fc] animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#4da5fc] animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#4da5fc] animate-bounce" />
          </span>
        ) : (
          <>
            {/* Render process steps progressively as each JSONL line completes */}
            {data && <AgentProcess data={data} />}

            {/* Answer streams in after the block closes */}
            {answer ? (
              <>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
                <span className="inline-block w-0.5 h-4 bg-[#4da5fc] align-middle ml-0.5 animate-pulse" />
              </>
            ) : (
              /* Block still streaming or answer hasn't started — blinking cursor */
              <span className="inline-block w-0.5 h-4 bg-[#4da5fc] align-middle animate-pulse" />
            )}
          </>
        )}
      </div>
    </div>
  );
}
