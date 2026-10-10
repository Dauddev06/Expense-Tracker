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

export type IncomeStatus = "expected" | "received";

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
