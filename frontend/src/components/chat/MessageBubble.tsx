"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage, OptimisticMessage } from "@/types";
import AgentProcess, { parseProcessBlock } from "./AgentProcess";

interface MessageBubbleProps {
  message: ChatMessage | OptimisticMessage;
}

const markdownComponents = {
  p: ({ children }: React.PropsWithChildren) => (
    <p className="mb-2 last:mb-0">{children}</p>
  ),
  code: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => {
    const isBlock = className?.includes("language-");
    return isBlock ? (
      <code className="block bg-[#0f0f0f] rounded-lg p-3 text-xs text-[#a0c8ff] font-mono overflow-x-auto my-2">
        {children}
      </code>
    ) : (
      <code className="bg-white/[0.08] rounded px-1.5 py-0.5 text-xs text-[#a0c8ff] font-mono">
        {children}
      </code>
    );
  },
  ul: ({ children }: React.PropsWithChildren) => (
    <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }: React.PropsWithChildren) => (
    <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
  ),
  strong: ({ children }: React.PropsWithChildren) => (
    <strong className="text-white font-semibold">{children}</strong>
  ),
};

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isOptimistic = "isOptimistic" in message && message.isOptimistic;

  if (isUser) {
    return (
      <div className={`flex justify-end ${isOptimistic ? "opacity-50" : ""}`}>
        <div className="max-w-[75%] bg-[#1488fc] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed shadow-[0_0_12px_rgba(20,136,252,0.2)]">
          {message.content}
        </div>
      </div>
    );
  }

  const { data, answer } = parseProcessBlock(message.content);

  return (
    <div className="flex justify-start">
      <div className="max-w-[75%] bg-[#1e1e22] ring-1 ring-white/[0.08] text-[#e8e8ea] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed">
        {data && <AgentProcess data={data} />}
        {answer && (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {answer}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
