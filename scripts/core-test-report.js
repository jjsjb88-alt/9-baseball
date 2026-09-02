import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  mergeCoreTestResultSets,
  summarizeCoreTestResults,
} from "../src/game/core-test-results.js";

const args = process.argv.slice(2);
const paths = args[0] === "--" ? args.slice(1) : args;

if (paths.length === 0) {
  console.error("Usage: pnpm run report:core-test -- <export.json> [more-exports.json ...]");
  process.exitCode = 1;
} else {
  const resultSets = await Promise.all(paths.map(async (path) => {
    const contents = await readFile(resolve(path), "utf8");
    const parsed = JSON.parse(contents);
    if (!Array.isArray(parsed)) throw new TypeError(`${path}: expected a JSON array`);
    return parsed;
  }));

  const merged = mergeCoreTestResultSets(resultSets);
  const summary = summarizeCoreTestResults(merged.results);
  const rows = summary.questions.map((question) => ({
    signal: question.id,
    yes: question.yes,
    no: question.no,
    positive: `${question.positive}/${summary.total}`,
  }));

  console.log("9ZONE SHOWDOWN · CORE TEST HUMAN REPORT");
  console.log(`Responses: ${summary.total}/${summary.target} (${summary.readyForReview ? "READY" : "MORE NEEDED"})`);
  console.log(`Sources: ${paths.length} · duplicates removed: ${merged.duplicates} · invalid skipped: ${merged.skipped}`);
  console.table(rows);

  if (summary.notes.length > 0) {
    console.log("Notes:");
    summary.notes.forEach((note, index) => console.log(`${index + 1}. ${note}`));
  }
}
