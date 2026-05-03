import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

// Minimal vendor-portal shell: a single header with branding and (when
// signed in) a logout link. Layout itself doesn't gate auth — pages do.

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="min-h-screen bg-parchment">
      <header className="border-b border-parchment-line">
        <div className="mx-auto flex max-w-4xl items-baseline justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/vendor/dashboard" className="font-display text-2xl text-ink">
            The Indian Aisle <span className="text-gold">Vendors</span>
          </Link>
          {user && (
            <form action="/vendor/logout" method="post">
              <button
                type="submit"
                className="font-display text-sm italic text-ink-mute underline-offset-2 hover:text-ink hover:underline"
              >
                Sign out
              </button>
            </form>
          )}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
