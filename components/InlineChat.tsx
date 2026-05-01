"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  greeting?: string;
  placeholder?: string;
  className?: string;
  /**
   * Hero mode strips the chat card chrome on the empty state — meant for the
   * landing page where a parent renders the title above and action chips below.
   * Once a message has been sent, the layout falls back to the normal threaded
   * chat box.
   */
  hero?: boolean;
};

export default function InlineChat({
  greeting = "Hi! Tell me about your wedding and I'll set it up for you. Try: \"Plan a destination wedding for Kash & Arjun in March 2026.\"",
  placeholder = "Tell me about your wedding…",
  className = "",
  hero = false,
}: Props) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onData: (part) => {
      if (part.type === "data-wedding-created") {
        const data = part.data as { url?: unknown };
        if (typeof data?.url === "string") setPendingNav(data.url);
      }
    },
  });

  const isStreaming = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (pendingNav && status === "ready") {
      const url = pendingNav;
      setPendingNav(null);
      const t = setTimeout(() => router.push(url), 800);
      return () => clearTimeout(t);
    }
  }, [pendingNav, status, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    sendMessage({ text });
    setInput("");
  };

  if (hero && messages.length === 0) {
    return (
      <form
        onSubmit={handleSubmit}
        className={`group rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition focus-within:border-stone-400 focus-within:shadow-md sm:p-5 ${className}`}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder={placeholder}
          className="block w-full resize-none border-0 bg-transparent text-base text-stone-800 placeholder:text-stone-400 focus:outline-none sm:text-lg"
          rows={2}
          disabled={isStreaming}
          autoFocus
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-stone-400">Press Enter to send · Shift+Enter for new line</span>
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="rounded-full bg-ink px-4 py-1.5 text-sm text-parchment transition disabled:opacity-40"
          >
            Send
          </button>
        </div>
        {error && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            Something went wrong. Check that <code>ANTHROPIC_API_KEY</code> is set.
          </div>
        )}
      </form>
    );
  }

  return (
    <div
      className={`flex h-[32rem] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm ${className}`}
    >
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
        {messages.length === 0 && (
          <div className="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-700">
            {greeting}
          </div>
        )}

        {messages.map((m) => {
          const text = m.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("");
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                  isUser
                    ? "bg-ink text-parchment"
                    : "bg-stone-100 text-stone-800"
                }`}
              >
                {text || (isStreaming ? "…" : "")}
              </div>
            </div>
          );
        })}

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            Something went wrong. Check that <code>ANTHROPIC_API_KEY</code> is set.
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-stone-200 bg-white px-3 py-3 sm:px-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500"
          disabled={isStreaming}
          autoFocus
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="rounded-lg bg-ink px-4 py-2 text-sm text-parchment disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
