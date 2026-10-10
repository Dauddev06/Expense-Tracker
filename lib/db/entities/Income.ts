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
import { moneyTransformer, nullableMoneyTransformer } from "../transformers";

// "skipped" = deleted for ONE month. The row stays (hidden) so that month is
// never filled again, and it still repeats into the next month if `repeats`.
export type IncomeStatus = "expected" | "received" | "skipped";

@Entity({ name: "incomes" })
@Index(["userId", "chapter"])
export class Income {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // The month this income belongs to, "YYYY-MM"
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

  @Column({ type: "varchar", length: 20, default: "expected" })
  status!: IncomeStatus;

  @Column({ type: "date", nullable: true })
  receivedOn!: string | null;

  // The Sadqa % used when it was received. Saved so that changing the %
  // in Settings later never rewrites the past.
  @Column({
    type: "numeric",
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: nullableMoneyTransformer,
  })
  sadqaPercentApplied!: number | null;

  // The savings % and account used when it was received (same idea:
  // changing Settings later never rewrites the past). null = nothing saved.
  @Column({
    type: "numeric",
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: nullableMoneyTransformer,
  })
  savingsPercentApplied!: number | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  savingsAccountApplied!: string | null;

  // true = "Every month": on the 1st it copies itself into the new month
  // (as "not received yet"). false = one-off money, like a bonus.
  @Column({ type: "boolean", default: true })
  repeats!: boolean;

  // The income in the month before that this one was copied from. UNIQUE, so
  // one income can never be copied twice (even if two requests race).
  @Column({ type: "uuid", nullable: true, unique: true })
  copiedFromId!: string | null;

  @ManyToOne("Income", { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "copiedFromId" })
  copiedFrom!: Relation<Income> | null;

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
