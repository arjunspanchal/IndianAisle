"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

export default function ChatWidget() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const [attached, setAttached] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

  const onPickFile = (f: File | null) => {
    setFileError(null);
    if (!f) return setAttached(null);
    if (f.type !== "application/pdf") {
      setFileError("Only PDF files are supported.");
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setFileError("File is too large (max 20 MB).");
      return;
    }
    setAttached(f);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if ((!text && !attached) || isStreaming) return;
    if (attached) {
      const dt = new DataTransfer();
      dt.items.add(attached);
      sendMessage({ text: text || `Attached PDF: ${attached.name}`, files: dt.files });
    } else {
      sendMessage({ text });
    }
    setInput("");
    setAttached(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (pathname === "/login" || pathname.startsWith("/login/")) return null;

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close chat" : "Open chat"}
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
        <div className="fixed bottom-24 right-5 z-50 flex h-[32rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-900 print:hidden">
          <header className="border-b border-stone-200 bg-white/90 px-4 py-3 dark:border-stone-800 dark:bg-stone-900/90">
            <div className="font-serif text-lg leading-tight">Wedding Assistant</div>
            <div className="text-xs text-stone-500 dark:text-stone-400">Ask about budgets, venues, traditions…</div>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:bg-stone-900/40 dark:text-stone-400">
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
            onSubmit={handleSubmit}
            className="border-t border-stone-200 bg-white px-3 py-3 dark:border-stone-800 dark:bg-stone-900"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming}
                title="Attach a vendor PDF"
                className="rounded-md p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 disabled:opacity-40 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                aria-label="Attach a PDF"
              >
                <Icon name="paperclip" size={18} />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything…"
                className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-stone-500"
                disabled={isStreaming}
              />
              <button
                type="submit"
                disabled={isStreaming || (!input.trim() && !attached)}
                className="rounded-lg bg-ink px-3 py-2 text-sm text-parchment disabled:opacity-40"
              >
                Send
              </button>
            </div>
            {attached && (
              <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-700 dark:bg-stone-800 dark:text-stone-200">
                <Icon name="file" size={12} className="text-stone-500 dark:text-stone-400" />
                <span className="truncate">{attached.name}</span>
                <button
                  type="button"
                  onClick={() => onPickFile(null)}
                  className="text-stone-500 hover:text-rose-700 dark:text-stone-400"
                  aria-label="Remove attachment"
                >
                  ×
                </button>
              </div>
            )}
            {fileError && (
              <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                {fileError}
              </div>
            )}
          </form>
        </div>
      )}
    </>
  );
}
