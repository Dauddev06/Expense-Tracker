import "reflect-metadata";
import { DataSource, type Repository } from "typeorm";
import { User } from "./entities/Users";
import { Session } from "./entities/Session";
import { Spending } from "./entities/Spendings";

// In development Next.js reloads your modules every time you save a file.
// If we created a new DataSource on every reload we would open a new pool
// of connections each time and quickly hit Postgres' connection limit.
// So we park ONE promise on `globalThis`, which survives those reloads.
const globalForDb = globalThis as unknown as {
  dataSourcePromise?: Promise<DataSource>;
};

function createDataSource() {
  return new DataSource({
    type: "postgres",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [User, Session, Spending],
    // synchronize: TypeORM looks at your entity classes and creates/alters the
    // tables to match. Great while learning, DANGEROUS in production (it can
    // drop columns). Production apps use migrations instead.
    synchronize: process.env.NODE_ENV !== "production",
    logging: false,
  });
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
type Entities = {
  User: User;
  Session: Session;
  Spending: Spending;
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
