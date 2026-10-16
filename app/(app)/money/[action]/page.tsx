import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getBalances, getOwedBySavings, totalOwed } from "@/lib/services/balance.service";
import { balanceOf } from "@/lib/accounts";
import type { MoneyAction } from "@/lib/money-input";
import { MoneyActionForm } from "@/components/money-action-form";
import { FormCard } from "@/components/page-header";
import { Icon } from "@/components/icons";

// /money/add, /money/move, ... -> which action and its page text
const PAGES: Record<string, { type: MoneyAction; title: string; intro: string }> = {
  add: {
    type: "deposit",
    title: "Add money",
    intro: "Got money from somewhere other than your income? Add it here (e.g. a gift).",
  },
  move: {
    type: "transfer",
    title: "Move money",
    intro: "Move money between your own accounts, e.g. take cash out of Current into Pocket.",
  },
  borrow: {
    type: "savings_borrow",
    title: "Borrow from savings",
    intro: "Take money out of a savings account for now. We'll remember how much you need to put back.",
  },
  repay: {
    type: "savings_repay",
    title: "Pay savings back",
    intro: "Put back money you borrowed from a savings account.",
  },
  sadqa: {
    type: "sadqa_given",
    title: "Give Sadqa",
    intro: "Pick the account the money comes out of. It's taken off your Sadqa to give.",
  },
};

export default async function MoneyActionPage({ params, searchParams }: PageProps<"/money/[action]">) {
  const { action } = await params;
  const { from, to } = await searchParams;
  const page = PAGES[action];
  if (!page) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [balances, owedBySavings] = await Promise.all([
    getBalances(user.id),
    getOwedBySavings(user.id),
  ]);

  return (
    <FormCard back={{ href: "/accounts", label: "Back to accounts" }} title={page.title} intro={page.intro}>
        {page.type === "savings_repay" && totalOwed(owedBySavings) <= 0 ? (
          <p className="flex items-center gap-2 rounded-xl bg-positive-soft px-3 py-3 text-positive">
            <Icon name="check-circle" />
            You don&apos;t owe any savings account anything right now.
          </p>
        ) : page.type === "sadqa_given" && balanceOf(balances, "sadqa") <= 0 ? (
          <p className="rounded-xl bg-surface-2 px-3 py-3 text-ink-2">
            You have no Sadqa to give right now. When you receive income, part of it is added
            here as a reminder (you can choose the % in Settings).
          </p>
        ) : (
          <MoneyActionForm
            type={page.type}
            balances={balances}
            owedBySavings={owedBySavings}
            presetFrom={typeof from === "string" ? from : undefined}
            presetTo={typeof to === "string" ? to : undefined}
          />
        )}
    </FormCard>
  );
}
