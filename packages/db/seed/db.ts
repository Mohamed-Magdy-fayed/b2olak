import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../src/schema";

/**
 * Seed-only Drizzle connection.
 *
 * The app's runtime client (`../src/client`) carries `import "server-only"`, so
 * it cannot be imported from this plain-Node `tsx` script (no `react-server`
 * export condition → the throwing build of `server-only`). Seeds get their own
 * short-lived connection here, using the same schema + casing.
 */

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to apps/web/.env and fill it in.",
  );
}

const conn = postgres(url, { max: 1, prepare: false });

export const db = drizzle(conn, { schema, casing: "snake_case" });
