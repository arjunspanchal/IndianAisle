import OnboardingForm from "./OnboardingForm";

export const metadata = { title: "Create a wedding · The Indian Aisle" };
export const dynamic = "force-dynamic";

export default function NewWeddingPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <p className="text-xs uppercase tracking-[0.3em] text-stone-500 dark:text-stone-400">New wedding</p>
      <div className="mt-3">
        <OnboardingForm />
      </div>
    </div>
  );
}
