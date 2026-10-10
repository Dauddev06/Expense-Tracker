// Used ONLY by the TypeORM command line (pnpm db:migrate etc.), never by the
// Next.js app. That's why the `migrations` list lives here and not in
// data-source.ts: Next.js would otherwise try to bundle the migration files.
import "reflect-metadata";
import { existsSync } from "node:fs";
import { DataSource } from "typeorm";
import { buildDataSourceOptions } from "./data-source";

// Next.js loads .env.local for the app, but this CLI doesn't, so load it here
// (for the local DB_* settings). Anything already set in your terminal,
// like DATABASE_URL for production, wins over the file.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const migrationDataSource = new DataSource({
  ...buildDataSourceOptions(), // same connection + ALL entities as the app
  synchronize: false, // migrations decide the schema, never synchronize
  migrations: ["lib/db/migrations/*.ts"],
});

export default migrationDataSource;
