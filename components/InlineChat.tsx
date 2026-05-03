"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";

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

const ACCEPTED_FILE_TYPES = "application/pdf";
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

export default function InlineChat({
  greeting = "Hi! Tell me about your wedding and I'll set it up for you. Try: \"Plan a destination wedding for Kash & Arjun in March 2026.\"",
  placeholder = "Tell me about your wedding…",
  className="",
  hero = false,
}: Props) {
  const router = useRouter();
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

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept={ACCEPTED_FILE_TYPES}
      className="hidden"
      onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
    />
  );

  const attachButton = (
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
  );

  const attachmentChip = attached && (
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
  );

  if (hero && messages.length === 0) {
    return (
      <form
        onSubmit={handleSubmit}
        className={`group rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition focus-within:border-stone-400 focus-within:shadow-md dark:border-stone-800 dark:bg-stone-900 dark:focus-within:border-stone-600 sm:p-5${className}`}
      >
        {fileInput}
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
          className="block w-full resize-none border-0 bg-transparent text-base text-stone-800 placeholder:text-stone-400 focus:outline-none dark:text-stone-100 dark:placeholder:text-stone-500 sm:text-lg"
          rows={2}
          disabled={isStreaming}
          autoFocus
        />
        {attachmentChip}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {attachButton}
            <span className="hidden text-xs text-stone-400 dark:text-stone-500 sm:inline">
              Press Enter to send · attach a vendor PDF to auto-fill
            </span>
          </div>
          <button
            type="submit"
            disabled={isStreaming || (!input.trim() && !attached)}
            className="rounded-full bg-ink px-4 py-1.5 text-sm text-parchment transition disabled:opacity-40"
          >
            Send
          </button>
        </div>
        {fileError && (
          <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            {fileError}
          </div>
        )}
        {error && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
            Something went wrong. Check that <code>ANTHROPIC_API_KEY</code> is set.
          </div>
        )}
      </form>
    );
  }

  return (
    <div
      className={`flex h-[32rem] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900${className}`}
    >
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
        {messages.length === 0 && (
          <div className="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:bg-stone-900/40">
            {greeting}
          </div>
        )}

        {messages.map((m) => {
          const text = m.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("");
          const fileParts = m.parts.filter(
            (p): p is { type: "file"; mediaType: string; filename?: string; url: string } =>
              p.type === "file",
          );
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={`flex${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] space-y-1 whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm${
                  isUser
                    ? "bg-ink text-parchment"
                    : "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-100"
                }`}
              >
                {fileParts.map((fp, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 text-xs${
                      isUser ? "text-parchment/80" : "text-stone-600"
                    }`}
                  >
                    <Icon name="file" size={12} />
                    <span className="truncate">{fp.filename ?? "attached.pdf"}</span>
                  </div>
                ))}
                {text || (isStreaming && !isUser ? "…" : "")}
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
        className="border-t border-stone-200 bg-white px-3 py-3 dark:border-stone-800 dark:bg-stone-900 sm:px-4"
      >
        {fileInput}
        <div className="flex items-center gap-2">
          {attachButton}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-stone-500"
            disabled={isStreaming}
            autoFocus
          />
          <button
            type="submit"
            disabled={isStreaming || (!input.trim() && !attached)}
            className="rounded-lg bg-ink px-4 py-2 text-sm text-parchment disabled:opacity-40"
          >
            Send
          </button>
        </div>
        {attachmentChip}
        {fileError && (
          <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            {fileError}
          </div>
        )}
      </form>
    </div>
  );
}
