import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("records an unknown recall separately from an answered mistake", async () => {
  const [schema, progressRoute, diagnosisRoute, migration] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/progress/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/diagnosis/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0008_redundant_garia.sql", import.meta.url), "utf8"),
  ]);

  assert.match(schema, /responseKind: text\("response_kind"\)\.notNull\(\)\.default\("answered"\)/);
  assert.match(migration, /ADD `response_kind` text DEFAULT 'answered' NOT NULL/);
  assert.match(progressRoute, /type ResponseKind = "answered" \| "unknown"/);
  assert.match(progressRoute, /responseKind === "unknown" && skill !== "recall"/);
  assert.match(progressRoute, /correct = false;\s*verifiedScore = 0;/);
  assert.match(diagnosisRoute, /responseKind\?: "answered" \| "unknown"/);
  assert.match(diagnosisRoute, /answer\.responseKind !== "unknown" \|\| \(answer\.skill === "recall" && answer\.correct === false\)/);
});
