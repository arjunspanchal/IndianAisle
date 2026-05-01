"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { WeddingRole, WeddingType } from "@/lib/supabase/types";
import DateField from "@/components/ui/DateField";
import { createWeddingAction } from "./actions";

type Step = 0 | 1 | 2 | 3 | 4;

type FormState = {
  role: WeddingRole | null;
  coupleNames: string;
  weddingDate: string; // ISO yyyy-mm-dd, "" for not decided
  dateUnknown: boolean;
  weddingType: WeddingType | null;
};

const ROLE_OPTIONS: { value: WeddingRole; label: string; hint: string }[] = [
  { value: "couple", label: "It's my wedding", hint: "I'm one of the people getting married." },
  { value: "planner", label: "I'm planning someone else's wedding", hint: "I'm a wedding planner or coordinator." },
  { value: "family_or_friend", label: "I'm helping a family member or friend", hint: "Parent, sibling, friend or other helper." },
];

const TYPE_OPTIONS: { value: WeddingType; label: string; hint: string }[] = [
  { value: "local", label: "Local", hint: "Hosted in your home city." },
  { value: "destination", label: "Destination", hint: "Travelling somewhere for the wedding." },
];

const STEP_TITLES = [
  "Whose wedding is it?",
  "Couple names",
  "When is the wedding?",
  "Local or destination?",
  "Review & create",
];

const ROLE_LABEL: Record<WeddingRole, string> = {
  couple: "It's my wedding",
  planner: "Planning someone else's wedding",
  family_or_friend: "Helping a family member or friend",
};

const TYPE_LABEL: Record<WeddingType, string> = {
  local: "Local",
  destination: "Destination",
};

export default function OnboardingForm() {
  const [step, setStep] = useState<Step>(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>({
    role: null,
    coupleNames: "",
    weddingDate: "",
    dateUnknown: false,
    weddingType: null,
  });

  const goNext = () => {
    setError(null);
    if (step === 0 && !state.role) return setError("Pick one to continue.");
    if (step === 1 && !state.coupleNames.trim()) return setError("Add the couple's names to continue.");
    if (step === 2) {
      if (!state.dateUnknown && !state.weddingDate) {
        return setError("Pick a date or mark it as not decided.");
      }
    }
    if (step === 3 && !state.weddingType) return setError("Pick local or destination.");
    setStep((s) => (s >= 4 ? 4 : ((s + 1) as Step)));
  };

  const goBack = () => {
    setError(null);
    setStep((s) => (s <= 0 ? 0 : ((s - 1) as Step)));
  };

  const submit = () => {
    setError(null);
    if (!state.role || !state.coupleNames.trim() || !state.weddingType) {
      setError("Some answers are missing. Go back and complete each step.");
      return;
    }
    const fd = new FormData();
    fd.set("role", state.role);
    fd.set("couple_names", state.coupleNames.trim());
    fd.set("wedding_date", state.dateUnknown ? "" : state.weddingDate);
    fd.set("wedding_type", state.weddingType);
    startTransition(async () => {
      try {
        await createWeddingAction(fd);
      } catch (e) {
        // redirect() throws a special error — Next swallows it on the server, but the
        // client will already have navigated. Anything that reaches here is real.
        const msg = e instanceof Error ? e.message : String(e);
        if (!/NEXT_REDIRECT/i.test(msg)) setError(msg);
      }
    });
  };

  return (
    <div className="space-y-6">
      <Stepper current={step} />

      <div>
        <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">{STEP_TITLES[step]}</h1>
      </div>

      {step === 0 && (
        <div className="space-y-2">
          {ROLE_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              selected={state.role === opt.value}
              label={opt.label}
              hint={opt.hint}
              onClick={() => setState((s) => ({ ...s, role: opt.value }))}
            />
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-2">
          <label htmlFor="couple_names" className="block text-xs uppercase tracking-wide text-stone-500">
            Couple names
          </label>
          <input
            id="couple_names"
            className="text-input text-base"
            type="text"
            placeholder="e.g. Kash & Arjun"
            value={state.coupleNames}
            onChange={(e) => setState((s) => ({ ...s, coupleNames: e.target.value }))}
            autoFocus
          />
          <p className="text-xs text-stone-500">
            However you&apos;d like to refer to the couple — use names, nicknames, or hashtags.
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <span id="wedding_date_label" className="block text-xs uppercase tracking-wide text-stone-500">
            Wedding date
          </span>
          <DateField
            id="wedding_date"
            ariaLabel="Wedding date"
            value={state.weddingDate}
            disabled={state.dateUnknown}
            placeholder="Pick a date"
            onChange={(v) => setState((s) => ({ ...s, weddingDate: v }))}
          />
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={state.dateUnknown}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  dateUnknown: e.target.checked,
                  weddingDate: e.target.checked ? "" : s.weddingDate,
                }))
              }
              className="h-4 w-4 rounded border-stone-300 text-ink focus:ring-gold"
            />
            Not decided yet
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-2">
          {TYPE_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              selected={state.weddingType === opt.value}
              label={opt.label}
              hint={opt.hint}
              onClick={() => setState((s) => ({ ...s, weddingType: opt.value }))}
            />
          ))}
        </div>
      )}

      {step === 4 && (
        <ReviewSummary state={state} onEdit={(s) => setStep(s)} />
      )}

      {error && (
        <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        {step === 0 ? (
          <Link href="/" className="text-sm text-stone-500 underline-offset-2 hover:underline">
            Cancel
          </Link>
        ) : (
          <button
            type="button"
            onClick={goBack}
            className="btn-ghost"
            disabled={pending}
          >
            Back
          </button>
        )}

        {step < 4 ? (
          <button type="button" onClick={goNext} className="btn-primary" disabled={pending}>
            Continue
          </button>
        ) : (
          <button type="button" onClick={submit} className="btn-primary" disabled={pending}>
            {pending ? "Creating…" : "Create wedding"}
          </button>
        )}
      </div>
    </div>
  );
}

function Stepper({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-1">
      {STEP_TITLES.map((_, i) => (
        <span
          key={i}
          aria-hidden
          className={`h-1.5 flex-1 rounded-full transition ${
            i <= current ? "bg-gold" : "bg-stone-200"
          }`}
        />
      ))}
    </div>
  );
}

function OptionCard({
  selected,
  label,
  hint,
  onClick,
}: {
  selected: boolean;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-xl border px-4 py-3 text-left transition ${
        selected
          ? "border-ink bg-ink/5 ring-1 ring-ink"
          : "border-stone-200 bg-white hover:border-stone-300"
      }`}
    >
      <div className="font-serif text-xl">{label}</div>
      <div className="mt-0.5 text-sm text-stone-600">{hint}</div>
    </button>
  );
}

function ReviewSummary({
  state,
  onEdit,
}: {
  state: FormState;
  onEdit: (step: Step) => void;
}) {
  const date = state.dateUnknown || !state.weddingDate
    ? "Not decided yet"
    : new Date(state.weddingDate + "T00:00:00").toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

  const rows: { label: string; value: string; step: Step }[] = [
    { label: "Whose wedding", value: state.role ? ROLE_LABEL[state.role] : "—", step: 0 },
    { label: "Couple", value: state.coupleNames.trim() || "—", step: 1 },
    { label: "Date", value: date, step: 2 },
    { label: "Type", value: state.weddingType ? TYPE_LABEL[state.weddingType] : "—", step: 3 },
  ];

  return (
    <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-stone-500">{r.label}</div>
            <div className="mt-0.5 text-base">{r.value}</div>
          </div>
          <button
            type="button"
            onClick={() => onEdit(r.step)}
            className="text-sm text-stone-500 underline-offset-2 hover:underline"
          >
            Edit
          </button>
        </li>
      ))}
    </ul>
  );
}
