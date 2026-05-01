"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function ChatWidget() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

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

  if (pathname === "/login" || pathname.startsWith("/login/")) return null;
  if (pathname === "/") return null;

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close chat" : "Open chat"}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-parchment shadow-lg transition hover:scale-105 print:hidden"
      >
        <span className="text-2xl" aria-hidden>
          {open ? "×" : "💬"}
        </span>
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[32rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl print:hidden">
          <header className="border-b border-stone-200 bg-white/90 px-4 py-3">
            <div className="font-serif text-lg leading-tight">Wedding Assistant</div>
            <div className="text-xs text-stone-500">Ask about budgets, venues, traditions…</div>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600">
                Hi! I can help you plan an Indian wedding — try asking{" "}
                <em>“What does a 250-guest sangeet usually cost?”</em>
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
            className="flex gap-2 border-t border-stone-200 bg-white px-3 py-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500"
              disabled={isStreaming}
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
