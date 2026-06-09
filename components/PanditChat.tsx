"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";

const SUGGESTIONS = [
  "What is the meaning of the seven pheras?",
  "Explain the haldi ceremony",
  "What happens during kanyadaan?",
  "Why is the sacred fire so important?",
];

export default function PanditChat({
  initialPrompt,
}: {
  initialPrompt?: string;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/pandit" }),
  });

  const isStreaming = status === "submitted" || status === "streaming";

  // Fire an initial prompt once (e.g. when arriving from a ritual card).
  const firedRef = useRef(false);
  useEffect(() => {
    if (initialPrompt && !firedRef.current) {
      firedRef.current = true;
      sendMessage({ text: initialPrompt });
    }
  }, [initialPrompt, sendMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || isStreaming) return;
    sendMessage({ text: t });
    setInput("");
  };

  return (
    <div className="flex h-[34rem] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <header className="flex items-center gap-3 border-b border-stone-200 bg-white/90 px-4 py-3 dark:border-stone-800 dark:bg-stone-900/90">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/20 text-lg" aria-hidden>
          🪔
        </div>
        <div>
          <div className="font-serif text-lg leading-tight">Pandit ji</div>
          <div className="text-xs text-stone-500 dark:text-stone-400">
            Ask about the meaning of any wedding ritual
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              Namaste 🙏 I can explain the meaning and sequence of Hindu wedding
              ceremonies. Which tradition is your wedding — North Indian,
              Gujarati, Punjabi, Marwari, or South Indian? Or just ask a question
              below.
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-600 transition hover:border-gold hover:text-ink dark:border-stone-700 dark:text-stone-300"
                >
                  {s}
                </button>
              ))}
            </div>
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
                    : "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-100"
                }`}
              >
                {text || (isStreaming ? "…" : "")}
              </div>
            </div>
          );
        })}

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
            Something went wrong. Check that <code>ANTHROPIC_API_KEY</code> is set.
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="border-t border-stone-200 bg-white px-3 py-3 dark:border-stone-800 dark:bg-stone-900"
      >
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a ritual…"
            className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500"
            disabled={isStreaming}
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="rounded-lg bg-ink px-4 py-2 text-sm text-parchment disabled:opacity-40"
          >
            Ask
          </button>
        </div>
      </form>
    </div>
  );
}
