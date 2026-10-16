import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
  type Relation,
} from "typeorm";
import type { User } from "./Users";
import { moneyTransformer } from "../transformers";

// One row per user. The userId IS the primary key, so a user can never
// have two settings rows.
@Entity({ name: "user_settings" })
export class UserSettings {
  @PrimaryColumn({ type: "uuid" })
  userId!: string;

  @OneToOne("User", { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: Relation<User>;

  // e.g. 2.5 means 2.5% of every income is added to "Sadqa to give" (a reminder)
  @Column({
    type: "numeric",
    precision: 5,
    scale: 2,
    default: 0,
    transformer: moneyTransformer,
  })
  sadqaPercent!: number;

  // e.g. 10 means 10% of every income is moved into `savingsAccount`
  @Column({
    type: "numeric",
    precision: 5,
    scale: 2,
    default: 0,
    transformer: moneyTransformer,
  })
  savingsPercent!: number;

  // Which savings account it goes to: "savings" or an extra one ("sv_...")
  @Column({ type: "varchar", length: 20, default: "savings" })
  savingsAccount!: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
