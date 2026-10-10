import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { hasOpeningBalances } from "@/lib/services/ledger.service";
import { getSettings } from "@/lib/services/settings.service";
import { currentChapter } from "@/lib/dates";
import { WelcomeFlow } from "@/components/welcome-flow";


export const metadata = { title: "Welcome" };
export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Already set up? Then there is nothing to welcome.
  if (await hasOpeningBalances(user.id)) redirect("/home");

  const settings = await getSettings(user.id);
  return (
    <WelcomeFlow name={user.name} chapter={currentChapter()} sadqaPercent={settings.sadqaPercent} />
  );
}
