import bcrypt from "bcryptjs";
import { getRepo } from "@/lib/db/data-source";
import type { User } from "@/lib/db/entities/Users";

// A "public" user = what is safe to send to the browser (no password hash!)
export type PublicUser = { id: string; name: string; email: string };

function toPublicUser(user: User): PublicUser {
  return { id: user.id, name: user.name, email: user.email };
}

export class EmailTakenError extends Error {
  constructor() {
    super("An account with this email already exists");
  }
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<PublicUser> {
  const repo = await getRepo("User");
  const email = input.email.trim().toLowerCase();

  const existing = await repo.findOne({ where: { email } });
  if (existing) throw new EmailTakenError();

  // 10 = "salt rounds" (cost factor). Each +1 doubles the hashing time.
  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = repo.create({ name: input.name.trim(), email, passwordHash });
  const saved = await repo.save(user);
  return toPublicUser(saved);
}

// Returns the user if email+password are correct, otherwise null.
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<PublicUser | null> {
  const repo = await getRepo("User");

  // passwordHash has select:false, so we must ask for it explicitly here.
  const user = await repo
    .createQueryBuilder("user")
    .addSelect("user.passwordHash")
    .where("user.email = :email", { email: email.trim().toLowerCase() })
    .getOne();

  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.passwordHash);
  return isValid ? toPublicUser(user) : null;
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const repo = await getRepo("User");
  const user = await repo.findOne({ where: { id } });
  return user ? toPublicUser(user) : null;
}

export async function listUserNames(): Promise<{ id: string; name: string }[]> {
  const repo = await getRepo("User");
  return repo.find({
    select: { id: true, name: true },
    order: { name: "ASC" },
  });
}
