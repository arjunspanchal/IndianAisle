import { notFound } from "next/navigation";
import Calculator from "@/components/Calculator";
import { getWeddingBudget } from "@/lib/wedding-repo";

export const dynamic = "force-dynamic";

export default async function WeddingPage({ params }: { params: { id: string } }) {
  const budget = await getWeddingBudget(params.id);
  if (!budget) notFound();
  return <Calculator initialBudget={budget} weddingId={params.id} />;
}
