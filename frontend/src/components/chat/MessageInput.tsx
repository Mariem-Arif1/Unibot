"use client";

import {
  KeyboardEvent,
  useRef,
  useEffect,
  FormEvent,
  ChangeEvent,
} from "react";
import { SendHorizontal } from "lucide-react";
import type { Bot } from "@/types";
import BotSelector from "./BotSelector";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
  currentBot?: Bot | null;
}

export default function MessageInput({
  onSend,
  disabled = false,
  value,
  onChange,
  currentBot,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    onChange("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 pb-4 pt-2">
      <div className="relative w-full max-w-3xl mx-auto">
        {/* Gradient border overlay */}
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />

        <div className="relative rounded-2xl bg-[#1e1e22] ring-1 ring-white/[0.08] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_20px_rgba(0,0,0,0.4)]">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={disabled ? "Waiting for response…" : "Message…"}
            className="w-full resize-none bg-transparent text-[15px] text-white placeholder-[#5a5a5f] px-5 pt-4 pb-3 focus:outline-none min-h-[56px] max-h-[200px]"
            style={{ height: "56px" }}
          />

          <div className="flex items-center justify-between px-3 pb-3">
            {/* Left: bot selector */}
            <div>
              {currentBot && <BotSelector currentBot={currentBot} />}
            </div>

            {/* Right: send button */}
            <button
              type="submit"
              disabled={disabled || !value.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-[#1488fc] hover:bg-[#1a94ff] text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 shadow-[0_0_20px_rgba(20,136,252,0.3)]"
            >
              <span className="hidden sm:inline">{disabled ? "Sending…" : "Send"}</span>
              <SendHorizontal className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
