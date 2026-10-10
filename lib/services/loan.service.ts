import { In, type EntityManager } from "typeorm";
import { getRepo } from "@/lib/db/data-source";
import type { Loan, LoanDirection, LoanStatus } from "@/lib/db/entities/Loan";
import type { LoanPayment } from "@/lib/db/entities/LoanPayment";
import type { LedgerEntry } from "@/lib/db/entities/LedgerEntry";
import type { SpendingAccount } from "@/lib/accounts";
import { formatMoney } from "@/lib/constants";
import type { LoanInput, LoanPaymentInput } from "@/lib/loan-input";
import {
  assertAllNonNegative,
  assertNoNegativeBalance,
  moneyTransaction,
  type MoneyCheck,
} from "./balance.service";
import { assertOwnAccounts } from "./savings-account.service";
import { FieldError } from "./errors";

export type LoanPaymentDTO = {
  id: string;
  amount: number;
  account: SpendingAccount;
  paidOn: string;
  note: string | null;
};

export type LoanDTO = {
  id: string;
  personName: string;
  direction: LoanDirection;
  amount: number;
  account: SpendingAccount;
  startedOn: string;
  note: string | null;
  status: LoanStatus;
  paid: number; // paid back so far
  outstanding: number; // amount - paid
  payments: LoanPaymentDTO[]; // newest first
};

const round = (n: number) => Math.round(n * 100) / 100;

function toDTO(loan: Loan): LoanDTO {
  const payments = [...(loan.payments ?? [])].sort((a, b) =>
    a.paidOn === b.paidOn
      ? b.createdAt.getTime() - a.createdAt.getTime()
      : a.paidOn < b.paidOn ? 1 : -1,
  );
  const paid = round(payments.reduce((sum, p) => sum + p.amount, 0));
  return {
    id: loan.id,
    personName: loan.personName,
    direction: loan.direction,
    amount: loan.amount,
    account: loan.account,
    startedOn: loan.startedOn,
    note: loan.note,
    status: loan.status,
    paid,
    outstanding: round(loan.amount - paid),
    payments: payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      account: p.account,
      paidOn: p.paidOn,
      note: p.note,
    })),
  };
}

async function loadLoan(m: EntityManager, userId: string, id: string): Promise<Loan | null> {
  return m.getRepository<Loan>("Loan").findOne({
    where: { id, userId },
    relations: { payments: true },
  });
}

// The ledger row for the loan itself:
//   given -> money leaves `account`    taken -> money arrives in `account`
function loanEntryFields(loan: Loan) {
  return loan.direction === "given"
    ? { type: "loan_given" as const, fromAccount: loan.account, toAccount: null }
    : { type: "loan_taken" as const, fromAccount: null, toAccount: loan.account };
}

// "settled" once everything is paid back, "open" otherwise
async function refreshStatus(m: EntityManager, loan: Loan) {
  const rows: { paid: string }[] = await m.query(
    `SELECT COALESCE(SUM(amount), 0) AS paid FROM loan_payments WHERE "loanId" = $1`,
    [loan.id],
  );
  const status: LoanStatus = Number(rows[0].paid) >= loan.amount ? "settled" : "open";
  await m.getRepository<Loan>("Loan").update({ id: loan.id }, { status });
}

export async function listLoans(userId: string): Promise<LoanDTO[]> {
  const repo = await getRepo("Loan");
  const rows = await repo.find({
    where: { userId },
    relations: { payments: true },
    order: { startedOn: "DESC", createdAt: "DESC" },
  });
  return rows.map(toDTO);
}

export async function getLoan(userId: string, id: string): Promise<LoanDTO | null> {
  const repo = await getRepo("Loan");
  const row = await repo.findOne({ where: { id, userId }, relations: { payments: true } });
  return row ? toDTO(row) : null;
}

// For the dashboard: what people owe me / what I owe people
export function summarizeLoans(loans: LoanDTO[]) {
  const open = loans.filter((l) => l.status === "open");
  return {
    owedToMe: round(open.filter((l) => l.direction === "given").reduce((s, l) => s + l.outstanding, 0)),
    iOwe: round(open.filter((l) => l.direction === "taken").reduce((s, l) => s + l.outstanding, 0)),
  };
}

export async function createLoan(userId: string, input: LoanInput): Promise<LoanDTO> {
  return moneyTransaction(userId, async (m) => {
    await assertOwnAccounts(m, userId, [input.account]);
    const repo = m.getRepository<Loan>("Loan");
    const loan = await repo.save(repo.create({ ...input, userId, status: "open" }));

    const ledger = m.getRepository<LedgerEntry>("LedgerEntry");
    await ledger.save(
      ledger.create({
        ...loanEntryFields(loan),
        userId,
        amount: loan.amount,
        occurredOn: loan.startedOn,
        note: null,
        loanId: loan.id,
      }),
    );

    // Lending money out needs enough money in that account
    if (loan.direction === "given") {
      await assertNoNegativeBalance(m, userId, [
        { account: loan.account, field: "amount", requested: loan.amount },
      ]);
    }
    loan.payments = [];
    return toDTO(loan);
  });
}

export async function updateLoan(userId: string, id: string, input: LoanInput): Promise<LoanDTO | null> {
  return moneyTransaction(userId, async (m) => {
    const loan = await loadLoan(m, userId, id);
    if (!loan) return null;
    if (loan.account !== input.account) await assertOwnAccounts(m, userId, [input.account]);

    const moneyChanged = loan.amount !== input.amount || loan.account !== input.account;
    if (moneyChanged && loan.payments.length > 0) {
      throw new FieldError(
        "amount",
        "The amount and account can't change once a payment was made. Delete the payments first.",
      );
    }

    const oldAccount = loan.account;
    loan.personName = input.personName;
    loan.amount = input.amount;
    loan.account = input.account;
    loan.startedOn = input.startedOn;
    loan.note = input.note;
    // (direction never changes after the loan is created)
    await m.getRepository<Loan>("Loan").save(loan);

    await m.getRepository<LedgerEntry>("LedgerEntry").update(
      // the loan's own row (not its payments' rows)
      { loanId: loan.id, userId, type: In(["loan_given", "loan_taken"]) },
      { ...loanEntryFields(loan), amount: loan.amount, occurredOn: loan.startedOn },
    );
    await refreshStatus(m, loan);

    if (moneyChanged) {
      const checks: MoneyCheck[] = [
        {
          account: loan.account,
          field: "amount",
          requested: loan.direction === "given" ? loan.amount : undefined,
        },
      ];
      if (oldAccount !== loan.account) checks.push({ account: oldAccount, field: "account" });
      await assertNoNegativeBalance(m, userId, checks);
    }
    return toDTO((await loadLoan(m, userId, id))!);
  });
}

export async function deleteLoan(userId: string, id: string): Promise<boolean> {
  return moneyTransaction(userId, async (m) => {
    // ON DELETE CASCADE removes its payments and money movements too
    const result = await m.getRepository<Loan>("Loan").delete({ id, userId });
    if ((result.affected ?? 0) === 0) return false;
    await assertAllNonNegative(m, userId);
    return true;
  });
}

export async function addLoanPayment(
  userId: string,
  loanId: string,
  input: LoanPaymentInput,
): Promise<LoanDTO | null> {
  return moneyTransaction(userId, async (m) => {
    const loan = await loadLoan(m, userId, loanId);
    if (!loan) return null;
    await assertOwnAccounts(m, userId, [input.account]);

    const outstanding = toDTO(loan).outstanding;
    if (input.amount > outstanding) {
      throw new FieldError(
        "amount",
        outstanding > 0
          ? `Only ${formatMoney(outstanding)} is left to pay.`
          : "This loan is already fully paid back.",
      );
    }

    const paymentRepo = m.getRepository<LoanPayment>("LoanPayment");
    const payment = await paymentRepo.save(paymentRepo.create({ ...input, userId, loanId }));

    // Given loan: money comes back IN. Taken loan: money goes OUT.
    const ledger = m.getRepository<LedgerEntry>("LedgerEntry");
    await ledger.save(
      ledger.create({
        userId,
        amount: input.amount,
        occurredOn: input.paidOn,
        note: input.note,
        loanId,
        loanPaymentId: payment.id,
        ...(loan.direction === "given"
          ? { type: "loan_payment_in" as const, fromAccount: null, toAccount: input.account }
          : { type: "loan_payment_out" as const, fromAccount: input.account, toAccount: null }),
      }),
    );
    await refreshStatus(m, loan);

    if (loan.direction === "taken") {
      await assertNoNegativeBalance(m, userId, [
        { account: input.account, field: "amount", requested: input.amount },
      ]);
    }
    return toDTO((await loadLoan(m, userId, loanId))!);
  });
}

export async function deleteLoanPayment(
  userId: string,
  loanId: string,
  paymentId: string,
): Promise<LoanDTO | null> {
  return moneyTransaction(userId, async (m) => {
    const loan = await loadLoan(m, userId, loanId);
    const payment = loan?.payments.find((p) => p.id === paymentId);
    if (!loan || !payment) return null;

    // ON DELETE CASCADE removes the payment's money movement too
    await m.getRepository<LoanPayment>("LoanPayment").delete({ id: paymentId, userId, loanId });
    await refreshStatus(m, loan); // back to "open"
    await assertNoNegativeBalance(m, userId, [{ account: payment.account, field: null }]);
    return toDTO((await loadLoan(m, userId, loanId))!);
  });
}
