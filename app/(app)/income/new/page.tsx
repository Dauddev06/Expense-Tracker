import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/services/settings.service";
import { getBalances } from "@/lib/services/balance.service";
import { readChapterParam } from "@/lib/dates";
import { IncomeForm } from "@/components/income-form";
import { FormCard } from "@/components/page-header";


export const metadata = { title: "Add income" };
export default async function NewIncomePage({ searchParams }: PageProps<"/income/new">) {
  const { chapter: chapterParam } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const chapter = readChapterParam(chapterParam);
  const [settings, balances] = await Promise.all([getSettings(user.id), getBalances(user.id)]);

  return (
    <FormCard back={{ href: `/income?chapter=${chapter}`, label: "Back to income" }} title="Add income">
        <IncomeForm
          chapter={chapter}
          balances={balances}
          sadqaPercent={settings.sadqaPercent}
          savings={{ percent: settings.savingsPercent, account: settings.savingsAccount }}
          submitLabel="Add income"
        />
    </FormCard>
  );
}
