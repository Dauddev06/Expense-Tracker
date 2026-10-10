import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
  type Relation,
} from "typeorm";
import type { User } from "./Users";
import type { RecurringExpense } from "./RecurringExpense";
import type { Spending } from "./Spendings";
import { moneyTransformer } from "../transformers";

// "pending" = still to pay, "done" = paid (a Spending was created),
// "skipped" = the user removed ONE occurrence of a repeating expense.
// We keep skipped rows (hidden in the UI) so they are not created again.
export type PlannedStatus = "pending" | "done" | "skipped";

// One expected expense in one month. Either a one-time item
// (recurringExpenseId = null) or one occurrence of a RecurringExpense.
@Entity({ name: "planned_expenses" })
@Index(["userId", "chapter"])
// The same template can't have two occurrences on the same day. This is what
// makes "create the missing occurrences" safe to run again and again.
@Unique("UQ_planned_recurring_due", ["recurringExpenseId", "dueDate"])
export class PlannedExpense {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 7 })
  chapter!: string;

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

  @Column({ type: "date" })
  dueDate!: string;

  @Column({ type: "varchar", length: 20, default: "pending" })
  status!: PlannedStatus;

  // SET NULL: deleting the template keeps past occurrences as one-time items
  @Column({ type: "uuid", nullable: true })
  recurringExpenseId!: string | null;

  @ManyToOne("RecurringExpense", { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "recurringExpenseId" })
  recurringExpense!: Relation<RecurringExpense> | null;

  // The Spending created by "Mark as paid"
  @Column({ type: "uuid", nullable: true })
  spendingId!: string | null;

  @ManyToOne("Spending", { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "spendingId" })
  spending!: Relation<Spending> | null;

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
