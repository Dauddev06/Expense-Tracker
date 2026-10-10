import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/services/settings.service";
import { SettingsForm } from "@/components/settings-form";
import { LogoutButton } from "@/components/logout-button";
import { Icon, IconTile } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { InstallAppButton } from "@/components/install-app-button";
import { ThemePicker } from "@/components/theme-picker";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const settings = await getSettings(user.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />

      <section className="card" aria-labelledby="sadqa-title">
        <div className="flex items-center gap-3">
          <IconTile name="heart" tone="bg-sadqa-soft text-sadqa" />
          <h2 id="sadqa-title" className="card-title">
            Sadqa
          </h2>
        </div>
        <p className="mt-3 mb-5 text-muted">
          Each time you mark income as received, this part of it is moved from Current into
          Sadqa. Changing it only affects income you receive from now on.
        </p>
        <SettingsForm sadqaPercent={settings.sadqaPercent} submitLabel="Save Sadqa %" />
      </section>

      <section className="card" aria-labelledby="look-title">
        <div className="flex items-center gap-3">
          <IconTile name="sun" tone="bg-brand-soft text-brand-ink" />
          <h2 id="look-title" className="card-title">
            Appearance
          </h2>
        </div>
        <p className="mt-3 mb-5 text-muted">
          Choose light or dark colours, or follow your phone&apos;s setting. This only changes
          this device.
        </p>
        <ThemePicker />
      </section>

      <section className="card py-2 sm:py-2" aria-label="More settings">
        <ul className="divide-y divide-line-soft">
          <li>
            <Link href="/accounts/opening" className="list-row -mx-2 rounded-xl px-2 hover:bg-surface-2">
              <IconTile name="pencil" tone="bg-brand-soft text-brand-ink" />
              <span className="row-title flex-1">Change starting balances</span>
              <Icon name="chevron-right" className="size-5 text-faint" />
            </Link>
          </li>
          <li>
            <Link href="/expected/recurring" className="list-row -mx-2 rounded-xl px-2 hover:bg-surface-2">
              <IconTile name="repeat" tone="bg-brand-soft text-brand-ink" />
              <span className="row-title flex-1">Manage repeating expenses</span>
              <Icon name="chevron-right" className="size-5 text-faint" />
            </Link>
          </li>
          <li>
            <InstallAppButton variant="row" />
          </li>
        </ul>
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted">
          Logged in as <strong className="text-ink">{user.email}</strong>
        </p>
        <LogoutButton />
      </section>
    </div>
  );
}
