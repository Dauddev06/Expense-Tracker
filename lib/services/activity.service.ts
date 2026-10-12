import { Between } from "typeorm";
import { getRepo } from "@/lib/db/data-source";
import type { LedgerEntry } from "@/lib/db/entities/LedgerEntry";
import type { Spending } from "@/lib/db/entities/Spendings";
import { accountLabel, type AccountId, type AccountInfo } from "@/lib/accounts";
import { formatMoney } from "@/lib/constants";
import { isMoneyAction } from "@/lib/money-input";
import { getAllAccountNames } from "./savings-account.service";

// One line in an activity list, ready to show. Built on the server so the
// browser never sees internal names like "savings_borrow".
export type ActivityItem = {
  key: string;
  date: string; // "YYYY-MM-DD"
  sentence: string; // "Moved PKR 10,000 from Savings to Current"
  amount: number;
  // in = money came in, out = money went out, move = between your accounts
  flow: "in" | "out" | "move";
  href: string | null; // where to tap to see/change it
  // Set for movements added by hand: they can be removed from the list.
  removable: { id: string; effect: string } | null;
};

type Sortable = ActivityItem & { createdAt: number };

// Ledger types that bring money IN from outside / send it OUT of your accounts
const MONEY_IN = ["opening", "deposit", "income", "loan_taken", "loan_payment_in"];
const MONEY_OUT = ["sadqa_given", "loan_given", "loan_payment_out"];

function sentenceFor(e: LedgerEntry, accounts: AccountInfo[]): string {
  const amount = formatMoney(e.amount);
  const from = e.fromAccount ? accountLabel(e.fromAccount, accounts) : "";
  const to = e.toAccount ? accountLabel(e.toAccount, accounts) : "";
  const person = e.loan?.personName ?? "someone";

  switch (e.type) {
    case "opening":
      return `Starting balance of ${amount} in ${to}`;
    case "deposit":
      return `Added ${amount} to ${to}`;
    case "transfer":
      return `Moved ${amount} from ${from} to ${to}`;
    case "savings_borrow":
      return `Borrowed ${amount} from ${from} into ${to}`;
    case "savings_repay":
      return `Paid back ${amount} to ${to} from ${from}`;
    case "income":
      return `Received ${amount} ${e.income?.title ?? "income"} into ${to}`;
    case "sadqa_allocation":
      return `${amount} of ${e.income?.title ?? "income"} added to Sadqa to give`;
    case "savings_allocation":
      return `${amount} of ${e.income?.title ?? "income"} saved into ${to}`;
    case "sadqa_given":
      return `Gave ${amount} as Sadqa from ${from}`;
    case "loan_given":
      return `Lent ${amount} to ${person} from ${from}`;
    case "loan_taken":
      return `Borrowed ${amount} from ${person} into ${to}`;
    case "loan_payment_in":
      return `${person} paid back ${amount} into ${to}`;
    case "loan_payment_out":
      return `Paid back ${amount} to ${person} from ${from}`;
  }
}

// What removing a hand-made movement will do, in plain words.
function removeEffect(e: LedgerEntry, accounts: AccountInfo[]): string {
  const amount = formatMoney(e.amount);
  if (e.type === "deposit")
    return `This will take ${amount} back out of ${accountLabel(e.toAccount!, accounts)}.`;
  if (e.type === "sadqa_given")
    return `This will put ${amount} back into ${accountLabel(e.fromAccount!, accounts)} and back on your Sadqa to give.`;
  return `This will move ${amount} back from ${accountLabel(e.toAccount!, accounts)} to ${accountLabel(e.fromAccount!, accounts)}.`;
}

function hrefFor(e: LedgerEntry): string | null {
  if (e.loanId) return `/loans/${e.loanId}`;
  if (e.income) return `/income?chapter=${e.income.chapter}`;
  if (e.type === "opening") return "/accounts/opening";
  return null;
}

function fromLedger(e: LedgerEntry, accounts: AccountInfo[], account?: AccountId): Sortable {
  let flow: ActivityItem["flow"];
  if (account) flow = e.toAccount === account ? "in" : "out";
  else if (MONEY_IN.includes(e.type)) flow = "in";
  else if (MONEY_OUT.includes(e.type)) flow = "out";
  else flow = "move";

  return {
    key: `l-${e.id}`,
    date: e.occurredOn,
    sentence: sentenceFor(e, accounts),
    amount: e.amount,
    flow,
    href: hrefFor(e),
    removable: isMoneyAction(e.type)
      ? { id: e.id, effect: removeEffect(e, accounts) }
      : null,
    createdAt: e.createdAt.getTime(),
  };
}

function fromSpending(s: Spending, accounts: AccountInfo[]): Sortable {
  return {
    key: `s-${s.id}`,
    date: s.spentOn,
    sentence: `Spent ${formatMoney(s.amount)} on ${s.title} (${accountLabel(s.account, accounts)})`,
    amount: s.amount,
    flow: "out",
    href: `/spendings/${s.id}`,
    removable: null,
    createdAt: s.createdAt.getTime(),
  };
}

// Money movements and spendings merged into one list, newest first.
// Pass `account` to only see what touched that one account, and
// `from` / `to` ("YYYY-MM-DD") to only see one stretch of days.
export async function listActivity(
  userId: string,
  options: { account?: AccountId; limit: number; from?: string; to?: string },
): Promise<ActivityItem[]> {
  const { account, limit, from, to } = options;
  const ledgerRepo = await getRepo("LedgerEntry");
  const spendingRepo = await getRepo("Spending");

  const query = ledgerRepo
    .createQueryBuilder("e")
    .leftJoinAndSelect("e.loan", "loan")
    .leftJoinAndSelect("e.income", "income")
    .where("e.userId = :userId", { userId })
    .andWhere("e.amount > 0") // hide starting balances of 0
    .orderBy("e.occurredOn", "DESC")
    .addOrderBy("e.createdAt", "DESC")
    .limit(limit);
  if (account === "sadqa") {
    // Sadqa given comes out of a real account, but it belongs here too
    query.andWhere("(e.toAccount = 'sadqa' OR e.type = 'sadqa_given')");
  } else if (account) {
    query.andWhere("(e.fromAccount = :account OR e.toAccount = :account)", {
      account,
    });
  }
  if (from && to) {
    query.andWhere("e.occurredOn BETWEEN :from AND :to", { from, to });
  }
  const spendingWhere = {
    userId,
    ...(account ? { account: account as Spending["account"] } : {}),
    ...(from && to ? { spentOn: Between(from, to) } : {}),
  };

  const [entries, spendings, accounts] = await Promise.all([
    query.getMany(),
    // Sadqa isn't money, so there are no Sadqa spendings to show
    account === "sadqa"
      ? Promise.resolve([] as Spending[])
      : spendingRepo.find({
          where: spendingWhere,
          order: { spentOn: "DESC", createdAt: "DESC" },
          take: limit,
        }),
    getAllAccountNames(userId),
  ]);

  const items: Sortable[] = [
    ...entries.map((e) => fromLedger(e, accounts, account)),
    ...spendings.map((s) => fromSpending(s, accounts)),
  ];
  items.sort((a, b) =>
    a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1,
  );
  // Drop the createdAt we only needed for sorting
  return items.slice(0, limit).map((item) => ({
    key: item.key,
    date: item.date,
    sentence: item.sentence,
    amount: item.amount,
    flow: item.flow,
    href: item.href,
    removable: item.removable,
  }));
}
