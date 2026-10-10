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
import type { Loan } from "./Loan";
import type { SpendingAccount } from "../../accounts";
import { moneyTransformer } from "../transformers";

// A (partial or full) payment towards a Loan.
@Entity({ name: "loan_payments" })
export class LoanPayment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  loanId!: string;

  @ManyToOne("Loan", (loan: Loan) => loan.payments, { onDelete: "CASCADE" })
  @JoinColumn({ name: "loanId" })
  loan!: Relation<Loan>;

  @Column({
    type: "numeric",
    precision: 12,
    scale: 2,
    transformer: moneyTransformer,
  })
  amount!: number;

  // Given loan: the money came back INTO this account.
  // Taken loan: the money went OUT of this account.
  @Column({ type: "varchar", length: 20 })
  account!: SpendingAccount;

  @Column({ type: "date" })
  paidOn!: string;

  @Column({ type: "text", nullable: true })
  note!: string | null;

  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne("User", { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: Relation<User>;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
