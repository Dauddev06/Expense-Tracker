import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from "typeorm";
import type { User } from "./Users";
import type { Income } from "./Income";
import type { Loan } from "./Loan";
import type { LoanPayment } from "./LoanPayment";
import type { AccountId, LedgerType } from "../../accounts";
import { moneyTransformer } from "../transformers";

// One row = one movement of money (except spendings, which have their own
// table). Money goes OUT of `fromAccount` and IN to `toAccount`:
//   deposit:   from = null,      to = "pocket"
//   transfer:  from = "savings", to = "current"
//   sadqa_given: from = "sadqa", to = null
// Balances are always calculated from these rows - never stored.
// (Not called "Transaction": that name clashes with a TypeORM export.)
@Entity({ name: "ledger_entries" })
@Index(["userId", "occurredOn"])
export class LedgerEntry {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 30 })
  type!: LedgerType;

  // Always positive. The direction comes from fromAccount/toAccount.
  @Column({
    type: "numeric",
    precision: 12,
    scale: 2,
    transformer: moneyTransformer,
  })
  amount!: number;

  @Column({ type: "varchar", length: 20, nullable: true })
  fromAccount!: AccountId | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  toAccount!: AccountId | null;

  @Column({ type: "date" })
  occurredOn!: string;

  @Column({ type: "text", nullable: true })
  note!: string | null;

  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne("User", { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: Relation<User>;

  // Optional links to the thing that created this movement. CASCADE means:
  // delete the income/loan/payment and its money movements go with it.
  @Column({ type: "uuid", nullable: true })
  incomeId!: string | null;

  @ManyToOne("Income", { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "incomeId" })
  income!: Relation<Income> | null;

  @Column({ type: "uuid", nullable: true })
  loanId!: string | null;

  @ManyToOne("Loan", { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "loanId" })
  loan!: Relation<Loan> | null;

  @Column({ type: "uuid", nullable: true })
  loanPaymentId!: string | null;

  @ManyToOne("LoanPayment", { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "loanPaymentId" })
  loanPayment!: Relation<LoanPayment> | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
