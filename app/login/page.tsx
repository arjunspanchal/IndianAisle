import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in · The Indian Aisle" };
export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; deleted?: string };
}) {
  const next = searchParams.next && searchParams.next.startsWith("/") ? searchParams.next : "/";
  const justDeleted = searchParams.deleted === "1";
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10">
      <div className="w-full rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="font-serif text-3xl">The Indian Aisle</h1>
        <p className="mt-1 text-sm text-stone-500">Sign in to plan your wedding budget.</p>
        {justDeleted && (
          <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Your account has been deleted.
          </div>
        )}
        <LoginForm next={next} />
      </div>
    </div>
  );
}
