import { redirect } from "next/navigation";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { listFactsForCurrentUser } from "@/lib/memory-repo";
import { getProfileForCurrentUser } from "@/lib/profile-repo";
import { signOutAction } from "@/app/login/actions";
import DeleteAccountForm from "./DeleteAccountForm";
import RoleForm from "./RoleForm";
import { forgetFactAction } from "./actions";

export const dynamic = "force-dynamic";

function formatJoined(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export default async function ProfilePage() {
  if (!isSupabaseConfigured()) redirect("/login");

  const sb = createSupabaseServerClient();
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) redirect("/login?next=/profile");

  const { email, created_at } = data.user;
  const [facts, profile] = await Promise.all([
    listFactsForCurrentUser(),
    getProfileForCurrentUser(),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">Manage profile</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">Account details and sign-in controls.</p>
      </header>

      <section className="mb-8 rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:bg-stone-900 dark:border-stone-800">
        <h2 className="font-serif text-2xl">Account</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div className="sm:col-span-1">
            <dt className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Email</dt>
            <dd className="mt-0.5 break-all text-stone-800 dark:text-stone-100">{email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Joined</dt>
            <dd className="mt-0.5 text-stone-800 dark:text-stone-100">{formatJoined(created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Sign-in</dt>
            <dd className="mt-0.5 text-stone-800 dark:text-stone-100">Email code (no password)</dd>
          </div>
        </dl>

        <div className="mt-5 border-t border-stone-100 pt-4 dark:border-stone-800">
          <form action={signOutAction}>
            <button type="submit" className="btn-ghost">Sign out</button>
          </form>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:bg-stone-900 dark:border-stone-800">
        <h2 className="font-serif text-2xl">Your role</h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Tell us how you&rsquo;re involved. Wedding planners can add their company name, which
          appears as a header at the top of every PDF and Excel export.
        </p>
        <RoleForm initialRole={profile.role} initialCompanyName={profile.companyName} />
      </section>

      <section className="mb-8 rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:bg-stone-900 dark:border-stone-800">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-2xl">What the assistant remembers</h2>
          <span className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">
            {facts.length} {facts.length === 1 ? "fact" : "facts"}
          </span>
        </div>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Facts the chatbot has saved about you. They&rsquo;re injected into every
          conversation so the assistant has context. Delete anything that&rsquo;s
          wrong or stale.
        </p>

        {facts.length === 0 ? (
          <div className="mt-4 rounded-lg bg-stone-50 px-4 py-3 text-sm text-stone-600 dark:bg-stone-900/40 dark:text-stone-400">
            Nothing saved yet. Tell the chatbot about yourself and it&rsquo;ll
            start filling this in.
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-stone-100 border-t border-stone-100 dark:divide-stone-800 dark:border-stone-800">
            {facts.map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-3 py-3 text-sm"
              >
                {f.category && (
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] uppercase tracking-wide text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                    {f.category.replace(/_/g, " ")}
                  </span>
                )}
                <span className="flex-1 text-stone-800 dark:text-stone-100">{f.fact}</span>
                <form action={forgetFactAction}>
                  <input type="hidden" name="id" value={f.id} />
                  <button
                    type="submit"
                    className="rounded-md px-2 py-1 text-xs text-stone-500 transition hover:bg-stone-100 hover:text-rose-700 dark:text-stone-400 dark:hover:bg-stone-800"
                  >
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-rose-200 bg-white p-5 shadow-sm dark:bg-stone-900">
        <h2 className="font-serif text-2xl text-rose-900">Danger zone</h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Delete your account and everything in it. This action is permanent.
        </p>
        <div className="mt-4">
          <DeleteAccountForm />
        </div>
      </section>
    </div>
  );
}
