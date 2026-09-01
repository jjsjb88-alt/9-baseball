import { runPolicyRegression } from "../src/game/policy-simulator.js";

const report = runPolicyRegression();
const rows = report.results.map((result) => ({
  policy: result.policy,
  "H/PA": result.hitRate.toFixed(3),
  "TB/PA": result.totalBasesPerPa.toFixed(3),
  contact: result.contactRate.toFixed(3),
  "DEEP READ": result.deepReadRate.toFixed(3),
}));

console.table(rows);
console.log(`POWER / best non-POWER TB: ${report.powerRatio.toFixed(3)}`);
console.log(report.checks);

if (!report.passed) process.exitCode = 1;
