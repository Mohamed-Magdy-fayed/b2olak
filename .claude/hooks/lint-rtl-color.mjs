#!/usr/bin/env node
// PostToolUse hook (Edit|Write): advisory warning when an edit introduces directional
// CSS classes or hardcoded palette colors, which break RTL / the design system.
// The edit is NOT undone — this only surfaces the issue to Claude to fix.
import { readFileSync } from "node:fs";

let payload = {};
try {
  payload = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  process.exit(0);
}

const input = payload?.tool_input ?? {};
const filePath = String(input.file_path ?? "");

// Only care about source files that carry className strings.
if (!/\.(tsx|jsx|ts|js|css)$/.test(filePath)) process.exit(0);

// Look at just the text this edit introduced.
const added = [input.content, input.new_string]
  .filter((v) => typeof v === "string")
  .join("\n");
if (!added) process.exit(0);

const findings = [];

// Directional spacing/positioning classes — should be logical (ms-/me-/ps-/pe-).
const directional = added.match(/(?:^|[\s"'`{(])(-?(?:ml|mr|pl|pr)-[\w.[\]/-]+)/g);
if (directional) {
  const cls = [...new Set(directional.map((m) => m.trim().replace(/^["'`{(\s]+/, "")))];
  findings.push(
    `Directional CSS (breaks RTL): ${cls.join(", ")} — use logical props ms-/me-/ps-/pe-.`,
  );
}

// Hardcoded palette colors — should be semantic tokens / shadcn variables.
const rawColor = added.match(
  /\b(?:bg|text|border|ring|fill|stroke|from|to|via)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|grey|zinc|neutral|stone)-\d{2,3}\b/g,
);
if (rawColor) {
  const cls = [...new Set(rawColor)];
  findings.push(
    `Hardcoded colors: ${cls.join(", ")} — use semantic tokens / shadcn variables (packages/theme).`,
  );
}

if (findings.length) {
  process.stderr.write(
    `⚠ ba2olak style check on ${filePath}:\n- ${findings.join("\n- ")}\n` +
      "(Advisory — the edit was applied. Fix to comply with CLAUDE.md.)\n",
  );
  process.exit(2);
}

process.exit(0);
