"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";

type Props = {
  weddingId: string;
};

/**
 * Calculator-scoped chat. Mounted inside /weddings/[id]. The chat route is
 * told this weddingId via `body`, which switches on the in-calc edit tools
 * (add_line / update_line / delete_line / update_meta). On every successful
 * edit, the route emits a transient `data-budget-updated` event and we call
 * router.refresh() to re-fetch the page's server data so the calculator
 * re-renders with the new state.
 */
export default function CalculatorChat({ weddingId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { weddingId },
      }),
    [weddingId],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
    onData: (part) => {
      if (part.type === "data-budget-updated") {
        // Re-fetch the wedding page data so the calculator reflects the edit.
        router.refresh();
      }
    },
  });

  const isStreaming = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close calculator chat" : "Open calculator chat"}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-parchment shadow-lg transition hover:scale-105 print:hidden"
      >
        {open ? (
          <span className="text-2xl leading-none" aria-hidden>
            ×
          </span>
        ) : (
          <Icon name="message" size={22} />
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[34rem] w-[24rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-900 print:hidden">
          <header className="border-b border-stone-200 bg-white/90 px-4 py-3 dark:border-stone-800 dark:bg-stone-900/90">
            <div className="font-serif text-lg leading-tight">Budget assistant</div>
            <div className="text-xs text-stone-500 dark:text-stone-400">
              Edit this calculator with plain English. Try{" "}
              <em>“Add Rs 30k for outdoor lounge to decor.”</em>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                I can see your current budget. Ask me to add, update, or remove line items, or change guest count / dates.
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
                    {text || (isStreaming && !isUser ? "…" : "")}
                  </div>
                </div>
              );
            })}

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
                Something went wrong. Check that <code>ANTHROPIC_API_KEY</code> is set and your session is active.
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-stone-200 bg-white px-3 py-3 dark:border-stone-800 dark:bg-stone-900"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Edit the calculator…"
              className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500"
              disabled={isStreaming}
              autoFocus
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="rounded-lg bg-ink px-3 py-2 text-sm text-parchment disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
