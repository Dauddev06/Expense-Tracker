import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from "typeorm";
import type { User } from "./Users";
import type { SpendingAccount } from "../../accounts";

@Entity({ name: "spendings" })
export class Spending {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 120 })
  title!: string;

  // numeric is exact (no floating-point rounding) - always use it for money.
  // The pg driver returns numeric as a STRING ("12.50"), so the transformer
  // converts it back to a JS number when reading.
  @Column({
    type: "numeric",
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  amount!: number;

  @Column({ type: "varchar", length: 30 })
  category!: string;

  // type "date" = just a calendar day, no time. pg returns it as "2026-10-03".
  @Column({ type: "date" })
  spentOn!: string;

  @Column({ type: "text", nullable: true })
  note!: string | null;

  // Which account the money came out of. The default makes every spending
  // that existed before this column was added a "current" spending.
  @Column({ type: "varchar", length: 20, default: "current" })
  account!: SpendingAccount;

  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne("User", (user: User) => user.spendings, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: Relation<User>;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
