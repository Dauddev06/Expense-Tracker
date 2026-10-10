import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from "typeorm";
import type { User } from "./Users";
import type { SpendingAccount } from "../../accounts";
import { moneyTransformer } from "../transformers";

export type Frequency = "weekly" | "biweekly" | "monthly";

// The TEMPLATE for an expense that repeats (e.g. "Rent, every month").
// Each month we create PlannedExpense rows (occurrences) from it.
@Entity({ name: "recurring_expenses" })
export class RecurringExpense {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 120 })
  title!: string;

  @Column({
    type: "numeric",
    precision: 12,
    scale: 2,
    transformer: moneyTransformer,
  })
  amount!: number;

  @Column({ type: "varchar", length: 30 })
  category!: string;

  @Column({ type: "varchar", length: 20 })
  frequency!: Frequency;

  // Which account it will be paid from (shown on that account's page).
  // The default makes every item that existed before this column "current".
  @Column({ type: "varchar", length: 20, default: "current" })
  account!: SpendingAccount;

  // false = paused: no new occurrences are created
  @Column({ type: "boolean", default: true })
  active!: boolean;

  // First month ("YYYY-MM") this template applies to
  @Column({ type: "varchar", length: 7 })
  startChapter!: string;

  @Index()
  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne("User", { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: Relation<User>;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
