import "reflect-metadata";
import { DataSource, type DataSourceOptions, type Repository } from "typeorm";
// TypeORM normally finds the Postgres driver ("pg") by itself, with a hidden
// require() that build tools can't see. Vercel only uploads the files it can
// SEE being imported, so without this line the deployed app would fail with
// "Cannot find module 'pg'". Importing it here and handing it to TypeORM
// (driver: pg, below) makes sure it is always included.
import pg from "pg";
import { User } from "./entities/Users";
import { Session } from "./entities/Session";
import { Spending } from "./entities/Spendings";
import { LedgerEntry } from "./entities/LedgerEntry";
import { Income } from "./entities/Income";
import { UserSettings } from "./entities/UserSettings";
import { RecurringExpense } from "./entities/RecurringExpense";
import { PlannedExpense } from "./entities/PlannedExpense";
import { Loan } from "./entities/Loan";
import { LoanPayment } from "./entities/LoanPayment";

type PostgresOptions = Extract<DataSourceOptions, { type: "postgres" }>;

// The connection settings, in ONE place. Used by the app (below) and by the
// migration CLI (lib/db/migration-data-source.ts), so they never drift apart.
export function buildDataSourceOptions(): PostgresOptions {
  // On Vercel we set DATABASE_URL (one string with host, user, password...).
  // Locally we keep using the separate DB_* values from .env.local.
  const connection = process.env.DATABASE_URL
    ? { url: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT ?? 5432),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      };

  return {
    type: "postgres",
    driver: pg, // see the import at the top
    ...connection,
    // Hosted Postgres (Neon) only accepts encrypted connections.
    ssl: process.env.DB_SSL === "true",
    // Max connections in the pool. On Vercel every serverless function opens
    // its own pool, so keep this small there (e.g. DB_POOL_MAX=3).
    extra: { max: Number(process.env.DB_POOL_MAX ?? 10) },
    // Use Postgres' built-in gen_random_uuid() for uuid primary keys. It is
    // part of core Postgres since v13, so a fresh hosted database needs no
    // extra extension (the default "uuid-ossp" would have to be installed).
    uuidExtension: "pgcrypto",
    entities: [
      User,
      Session,
      Spending,
      LedgerEntry,
      Income,
      UserSettings,
      RecurringExpense,
      PlannedExpense,
      Loan,
      LoanPayment,
    ],
    // synchronize: TypeORM looks at your entity classes and creates/alters the
    // tables to match. Great while learning, DANGEROUS in production (it can
    // drop columns). Production uses migrations instead (pnpm db:migrate).
    synchronize: process.env.NODE_ENV !== "production",
    logging: false,
  };
}

// In development Next.js reloads your modules every time you save a file.
// If we created a new DataSource on every reload we would open a new pool
// of connections each time and quickly hit Postgres' connection limit.
// So we park ONE promise on `globalThis`, which survives those reloads.
const globalForDb = globalThis as unknown as {
  dataSourcePromise?: Promise<DataSource>;
};

function createDataSource() {
  return new DataSource(buildDataSourceOptions());
}

export async function getDataSource(): Promise<DataSource> {
  if (!globalForDb.dataSourcePromise) {
    globalForDb.dataSourcePromise = createDataSource()
      .initialize()
      .catch((err) => {
        // If connecting failed, forget the promise so the next request retries.
        globalForDb.dataSourcePromise = undefined;
        throw err;
      });
  }
  return globalForDb.dataSourcePromise;
}

// Every entity, by name. Used to give getRepo() proper types.
export type Entities = {
  User: User;
  Session: Session;
  Spending: Spending;
  LedgerEntry: LedgerEntry;
  Income: Income;
  UserSettings: UserSettings;
  RecurringExpense: RecurringExpense;
  PlannedExpense: PlannedExpense;
  Loan: Loan;
  LoanPayment: LoanPayment;
};

// Get a repository by entity NAME (a string), not by class.
// Why? Next.js bundles pages and API routes separately, so each one gets its
// OWN copy of the `User` class. TypeORM only knows the copy it was initialized
// with, and would throw "No metadata for User was found" for the other copies.
// Looking the entity up by its name works no matter which copy you have.
export async function getRepo<K extends keyof Entities>(
  name: K,
): Promise<Repository<Entities[K]>> {
  const db = await getDataSource();
  return db.getRepository<Entities[K]>(name);
}
