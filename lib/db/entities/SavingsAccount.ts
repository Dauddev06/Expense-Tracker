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

// An EXTRA savings account (the built-in "Savings" is not stored here).
// Money movements refer to it by `key` (e.g. "sv_k3j9x2ab"), exactly like
// they refer to "current" or "pocket", so balances work the same way.
@Entity({ name: "savings_accounts" })
@Index(["userId", "key"], { unique: true })
export class SavingsAccount {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 20 })
  key!: string;

  @Column({ type: "varchar", length: 60 })
  name!: string;

  // Closed accounts are hidden, but kept so old activity still shows their name
  @Column({ type: "boolean", default: false })
  closed!: boolean;

  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne("User", { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: Relation<User>;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
