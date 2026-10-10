import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { readChapterParam } from "@/lib/dates";
import { ExpectedForm } from "@/components/expected-form";
import { FormCard } from "@/components/page-header";


export const metadata = { title: "Add expected expense" };
export default async function NewExpectedPage({ searchParams }: PageProps<"/expected/new">) {
  const { chapter: chapterParam, account } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const chapter = readChapterParam(chapterParam);

  return (
    <FormCard back={{ href: `/expected?chapter=${chapter}`, label: "Back to expected expenses" }} title="Add expected expense">
      <ExpectedForm chapter={chapter} presetAccount={typeof account === "string" ? account : undefined} />
    </FormCard>
  );
}
