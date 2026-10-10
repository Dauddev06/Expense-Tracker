import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from "typeorm";
import type { User } from "./Users";
import type { LoanPayment } from "./LoanPayment";
import type { SpendingAccount } from "../../accounts";
import { moneyTransformer } from "../transformers";

// "given" = I lent money to someone, "taken" = I borrowed money from someone
export type LoanDirection = "given" | "taken";
export type LoanStatus = "open" | "settled";

@Entity({ name: "loans" })
export class Loan {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  personName!: string;

  @Column({ type: "varchar", length: 10 })
  direction!: LoanDirection;

  @Column({
    type: "numeric",
    precision: 12,
    scale: 2,
    transformer: moneyTransformer,
  })
  amount!: number;

  // The account the money left (given) or arrived in (taken)
  @Column({ type: "varchar", length: 20 })
  account!: SpendingAccount;

  @Column({ type: "date" })
  startedOn!: string;

  @Column({ type: "text", nullable: true })
  note!: string | null;

  @Column({ type: "varchar", length: 10, default: "open" })
  status!: LoanStatus;

  // true = the loan is OLDER than the user's use of the app (e.g. Ali has owed
  // you 5,000 since last year). It's only remembered: adding it moves no
  // money, because that money left / arrived before the starting balances.
  // Payments made later DO move money, like for any loan.
  @Column({ type: "boolean", default: false })
  alreadyExisted!: boolean;

  @Index()
  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne("User", { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: Relation<User>;

  @OneToMany("LoanPayment", (payment: LoanPayment) => payment.loan)
  payments!: Relation<LoanPayment[]>;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
