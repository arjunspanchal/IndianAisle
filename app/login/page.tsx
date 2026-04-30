import LoginForm from "./LoginForm";

export const metadata = { title: "Login · The Indian Aisle" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10">
      <div className="w-full rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="font-serif text-3xl">Sign in</h1>
        <p className="mt-1 text-sm text-stone-500">
          Auth isn&apos;t wired up yet — this page is a placeholder.
        </p>
        <LoginForm />
        <p className="mt-4 text-xs text-stone-400">
          Coming soon: Airtable email allow-list + magic link.
        </p>
      </div>
    </div>
  );
}
