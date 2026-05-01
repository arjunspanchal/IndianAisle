import { redirect } from "next/navigation";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { signOutAction } from "@/app/login/actions";
import DeleteAccountForm from "./DeleteAccountForm";

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

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">Manage profile</h1>
        <p className="mt-1 text-sm text-stone-600">Account details and sign-in controls.</p>
      </header>

      <section className="mb-8 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-serif text-2xl">Account</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div className="sm:col-span-1">
            <dt className="text-xs uppercase tracking-wide text-stone-500">Email</dt>
            <dd className="mt-0.5 break-all text-stone-800">{email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-stone-500">Joined</dt>
            <dd className="mt-0.5 text-stone-800">{formatJoined(created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-stone-500">Sign-in</dt>
            <dd className="mt-0.5 text-stone-800">Email code (no password)</dd>
          </div>
        </dl>

        <div className="mt-5 border-t border-stone-100 pt-4">
          <form action={signOutAction}>
            <button type="submit" className="btn-ghost">Sign out</button>
          </form>
        </div>
      </section>

      <section className="rounded-xl border border-rose-200 bg-white p-5 shadow-sm">
        <h2 className="font-serif text-2xl text-rose-900">Danger zone</h2>
        <p className="mt-1 text-sm text-stone-600">
          Delete your account and everything in it. This action is permanent.
        </p>
        <div className="mt-4">
          <DeleteAccountForm />
        </div>
      </section>
    </div>
  );
}
