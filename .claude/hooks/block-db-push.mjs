#!/usr/bin/env node
// PreToolUse hook: block `db:push` / `drizzle-kit push`.
// ba2olak is schema-first — push leaves no migration file, so QA/prod never get the
// change. Exit code 2 denies the tool call and shows the message to Claude.
import { readFileSync } from "node:fs";

let payload = {};
try {
  payload = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  process.exit(0); // can't parse → don't interfere
}

const command = String(payload?.tool_input?.command ?? "");

// Match `db:push` (npm/turbo script) or a direct `drizzle-kit push`.
const isPush = /\bdb:push\b/.test(command) || /drizzle-kit\s+push\b/.test(command);

if (isPush) {
  process.stderr.write(
    "Blocked: `db:push` is forbidden in ba2olak (schema-first rule).\n" +
      "It leaves no migration file, so QA/prod never receive the change.\n" +
      "Use the schema-first flow instead: edit the schema, then run `/migrate`\n" +
      "(npm run db:generate → npm run db:migrate), and commit the generated\n" +
      ".sql + meta/ snapshot together.\n",
  );
  process.exit(2);
}

process.exit(0);
