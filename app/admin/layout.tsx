import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

// Wraps every /admin/* page in a single requireAdmin() check. Pages can
// still do their own additional gating, but the layout ensures unauth'd or
// non-admin users are bounced before any admin UI renders.

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen bg-parchment">
      <header className="border-b border-parchment-line">
        <div className="mx-auto flex max-w-5xl items-baseline justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/admin/vendors" className="font-display text-2xl text-ink">
            The Indian Aisle <span className="text-rose-deep">Admin</span>
          </Link>
          <form action="/vendor/logout" method="post">
            <button
              type="submit"
              className="font-display text-sm italic text-ink-mute underline-offset-2 hover:text-ink hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
