import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Lazy, serverless-safe Drizzle client.
 * - Lazy so the web app boots without DATABASE_URL until a procedure actually
 *   touches the database.
 * - `max: 1` + Neon pooled connection string per docs/02-architecture.md.
 * - Connection cached on globalThis in dev to survive HMR.
 */

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

type Database = ReturnType<typeof createDb>;

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to apps/web/.env and fill it in.",
    );
  }
  const conn = globalForDb.conn ?? postgres(url, { max: 1, prepare: false });
  if (process.env.NODE_ENV !== "production") globalForDb.conn = conn;
  return drizzle(conn, { schema, casing: "snake_case" });
}

let _db: Database | undefined;

export function getDb(): Database {
  _db ??= createDb();
  return _db;
}

/** Ergonomic `db` export — initializes the connection on first property access. */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export type Db = Database;
