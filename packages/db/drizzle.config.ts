import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Single source of env for the monorepo: apps/web/.env (where the server runs).
config({ path: "../../apps/web/.env" });

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
