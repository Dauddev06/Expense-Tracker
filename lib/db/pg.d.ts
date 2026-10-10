// We don't install @types/pg, so tell TypeScript the "pg" module exists.
// (We only pass it straight to TypeORM; we never call it ourselves.)
declare module "pg";
