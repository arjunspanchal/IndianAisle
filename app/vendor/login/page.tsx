import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  getPrimaryVendorForCurrentUser,
} from "@/lib/auth";
import VendorLoginForm from "./LoginForm";

export const metadata = { title: "Vendor sign in · The Indian Aisle" };
export const dynamic = "force-dynamic";

export default async function VendorLoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const user = await getCurrentUser();
  if (user) {
    const primary = await getPrimaryVendorForCurrentUser();
    redirect(primary ? "/vendor/dashboard" : "/vendor/onboarding");
  }

  const next =
    searchParams.next && searchParams.next.startsWith("/")
      ? searchParams.next
      : null;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <div className="rounded-xl border border-parchment-line bg-white p-6 shadow-sm">
        <h1 className="font-display text-3xl text-ink">Vendor sign in</h1>
        <p className="mt-1 text-sm text-ink-mute">
          Manage your listing on The Indian Aisle.
        </p>
        <VendorLoginForm next={next} />
      </div>
      <p className="mt-4 text-center text-sm text-ink-mute">
        New here?{" "}
        <Link href="/vendor/signup" className="text-gold underline-offset-2 hover:underline">
          Create a vendor account
        </Link>
        .
      </p>
    </div>
  );
}
