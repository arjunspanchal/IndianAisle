"use client";

import { useState } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="mt-5 rounded-md border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
        Got it. We&apos;ll wire up the magic-link flow soon. For now, head to the{" "}
        <a className="underline" href="/calculator">calculator</a>.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wide text-stone-500">Email</span>
        <input
          className="text-input"
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <button type="submit" className="btn-primary w-full">Send sign-in link</button>
    </form>
  );
}
