import { redirect } from "next/navigation";
import { CitizenHeader } from "@/components/layout/header";
import { ComplaintFlow } from "@/components/complaint/complaint-flow";
import { getCurrentUser } from "@/lib/auth";
import { getDraft } from "@/lib/complaints/draft";

export default async function NewComplaintPage({
  searchParams,
}: {
  searchParams: { draft?: string };
}) {
  if (!searchParams.draft) redirect("/");
  const draft = await getDraft(searchParams.draft);
  if (!draft) redirect("/");
  const user = await getCurrentUser();
  return (
    <>
      <CitizenHeader signedIn={!!user} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <ComplaintFlow draftId={draft.id} />
      </main>
    </>
  );
}
