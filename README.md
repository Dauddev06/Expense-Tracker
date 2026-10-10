This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Local development

```bash
docker compose up -d     # start Postgres (and Adminer on http://localhost:8081)
cp .env.example .env.local
pnpm install
pnpm dev                 # http://localhost:3000
```

In development TypeORM's `synchronize` creates and updates the tables for you.
In production it is OFF: tables are created with **migrations** (below).

## Deploying to Vercel

The app runs on Vercel with a hosted Postgres from **Neon** (create it from the
Vercel dashboard: *Storage → Create Database → Neon*). Docker is only for local
development. No code changes are needed to deploy.

### 1. Environment variables

In Vercel: *Project → Settings → Environment Variables*:

| Name           | Value                                                    | Why                                                           |
| -------------- | -------------------------------------------------------- | ------------------------------------------------------------- |
| `DATABASE_URL` | Neon's connection string (Neon adds it for you)          | Where the database is. Replaces all the `DB_*` values.        |
| `DB_SSL`       | `true`                                                   | Neon only accepts encrypted connections.                      |
| `DB_POOL_MAX`  | `3`                                                      | Each serverless function opens its own pool, so keep it small. |

Do **not** set `DB_HOST`, `DB_USER`, etc. on Vercel. `NODE_ENV=production` is
set by Vercel automatically, which turns `synchronize` off.

### 2. Create the tables (run migrations from your laptop)

Copy the connection string from Neon (*Connection Details*, the
non-pooled one is best for migrations), then run the migrations against it
**before** the first deploy, and again whenever you add a new migration.

macOS / Linux:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require" DB_SSL=true pnpm db:migrate
```

Windows (PowerShell):

```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
$env:DB_SSL="true"
pnpm db:migrate
Remove-Item Env:DATABASE_URL; Remove-Item Env:DB_SSL   # so later commands use your local DB again
```

`pnpm db:migration:revert` undoes the last migration (same environment variables).

### 3. Deploy

Push to GitHub and import the repo in Vercel (or run `vercel`). The build
command is the normal `pnpm build`.

### Changing the database later (the migration workflow)

1. Change an entity in `lib/db/entities/` (locally `synchronize` updates your dev DB).
2. Generate a migration. It compares the entities with a database that is
   exactly at the current migrations, so use a fresh empty database for it:

   ```bash
   docker exec spendings-postgres createdb -U spender spendings_migrations
   DATABASE_URL="postgresql://spender:spender_pass@localhost:5432/spendings_migrations" pnpm db:migrate
   DATABASE_URL="postgresql://spender:spender_pass@localhost:5432/spendings_migrations" pnpm db:migration:generate lib/db/migrations/AddSomething
   docker exec spendings-postgres dropdb -U spender spendings_migrations
   ```

   (PowerShell: set `$env:DATABASE_URL=...` first, then run the same `pnpm` commands.)
3. Read the new file in `lib/db/migrations/` and commit it.
4. Run `pnpm db:migrate` against production (step 2 above), then deploy.
