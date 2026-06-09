"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";

/**
 * Grounding intake — a short question list Pandit ji walks you through before
 * explaining anything, so its answers are tailored to your wedding. Each step
 * is a single question with quick-pick options; the answers are composed into
 * the first message sent to the model.
 */
type IntakeStep = {
  key: "faith" | "tradition" | "role" | "focus";
  question: string;
  options: string[];
};

const INTAKE: IntakeStep[] = [
  {
    key: "faith",
    question: "Which faith is your wedding?",
    options: [
      "Hindu",
      "Sikh",
      "Muslim",
      "Christian",
      "Jain",
      "Interfaith",
      "Not sure / other",
    ],
  },
  {
    key: "tradition",
    question: "Any particular community or region? (optional)",
    options: [
      "North Indian",
      "Gujarati",
      "Punjabi",
      "Marwari",
      "South Indian",
      "Bengali",
      "Skip this",
    ],
  },
  {
    key: "role",
    question: "And who are you in this wedding?",
    options: ["The couple", "Family", "Wedding planner", "Just curious"],
  },
  {
    key: "focus",
    question: "Where would you like to begin?",
    options: [
      "A full ceremony overview",
      "Pre-wedding rituals",
      "Wedding-day rituals",
      "Post-wedding rituals",
      "A specific ritual",
    ],
  },
];

function composeGroundingMessage(answers: Record<string, string>): string {
  const faith = answers.faith ?? "Not sure / other";
  const tradition = answers.tradition;
  const role = answers.role ?? "Just curious";
  const focus = answers.focus ?? "A full ceremony overview";
  const communityLine =
    tradition && tradition !== "Skip this"
      ? `• Community / region: ${tradition}\n`
      : "";
  return (
    `Here's a bit about my wedding so you can tailor things:\n` +
    `• Faith: ${faith}\n` +
    communityLine +
    `• My role: ${role}\n` +
    `• I'd like to start with: ${focus}\n\n` +
    `Please ground your explanations in this faith. Give me a warm, concise starting point and ask me anything you need to know.`
  );
}

export default function PanditChat({
  initialPrompt,
}: {
  initialPrompt?: string;
}) {
  const [input, setInput] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [intakeDone, setIntakeDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/pandit" }),
  });

  const isStreaming = status === "submitted" || status === "streaming";

  // If a caller passes an explicit prompt (e.g. from a ritual card), skip intake.
  const firedRef = useRef(false);
  useEffect(() => {
    if (initialPrompt && !firedRef.current) {
      firedRef.current = true;
      setIntakeDone(true);
      sendMessage({ text: initialPrompt });
    }
  }, [initialPrompt, sendMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, stepIndex]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || isStreaming) return;
    setIntakeDone(true);
    sendMessage({ text: t });
    setInput("");
  };

  const pickOption = (value: string) => {
    const step = INTAKE[stepIndex];
    const nextAnswers = { ...answers, [step.key]: value };
    setAnswers(nextAnswers);
    if (stepIndex < INTAKE.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      // Last answer — fire the grounding message.
      setIntakeDone(true);
      sendMessage({ text: composeGroundingMessage(nextAnswers) });
    }
  };

  const skipIntake = () => setIntakeDone(true);

  const showIntake = !intakeDone && messages.length === 0;
  const currentStep = INTAKE[stepIndex];

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
        {showIntake && (
          <div className="space-y-4">
            <div className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              Namaste 🙏 A few quick questions so I can tailor things to your
              wedding — then ask me anything.
            </div>

            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-stone-400">
                Question {stepIndex + 1} of {INTAKE.length}
              </div>
              <div className="mb-2 font-serif text-base text-ink dark:text-parchment">
                {currentStep.question}
              </div>
              <div className="flex flex-wrap gap-2">
                {currentStep.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => pickOption(opt)}
                    className="rounded-full border border-stone-300 px-3 py-1.5 text-xs text-stone-700 transition hover:border-gold hover:bg-gold/10 hover:text-ink dark:border-stone-700 dark:text-stone-200"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={skipIntake}
              className="text-xs text-stone-400 underline-offset-2 hover:text-stone-600 hover:underline dark:hover:text-stone-300"
            >
              Skip — I'll just ask a question
            </button>
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
