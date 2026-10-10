import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from "typeorm";
import type { Spending } from "./Spendings";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  // select: false -> this column is NOT returned by normal queries.
  // We must ask for it explicitly (only the login code does).
  @Column({ type: "varchar", length: 255, select: false })
  passwordHash!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @OneToMany("Spending", (spending: Spending) => spending.user)
  spendings!: Relation<Spending[]>;
}
