import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  getPrimaryVendorForCurrentUser,
} from "@/lib/auth";
import VendorSignupForm from "./SignupForm";

export const metadata = { title: "Vendor signup · The Indian Aisle" };
export const dynamic = "force-dynamic";

export default async function VendorSignupPage() {
  const user = await getCurrentUser();
  if (user) {
    const primary = await getPrimaryVendorForCurrentUser();
    redirect(primary ? "/vendor/dashboard" : "/vendor/onboarding");
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <div className="rounded-xl border border-parchment-line bg-white p-6 shadow-sm">
        <h1 className="font-display text-3xl text-ink">Create your vendor account</h1>
        <p className="mt-1 text-sm text-ink-mute">
          List your business on The Indian Aisle. Approval typically takes 1–2 working days.
        </p>
        <VendorSignupForm />
      </div>
      <p className="mt-4 text-center text-sm text-ink-mute">
        Already have an account?{" "}
        <Link href="/vendor/login" className="text-gold underline-offset-2 hover:underline">
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}
