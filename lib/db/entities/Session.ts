import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from "typeorm";
import type { User } from "./Users";

@Entity({ name: "sessions" })
export class Session {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  token!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne("User", { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: Relation<User>;

  @Column({ type: "timestamptz" })
  expiresAt!: Date;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
