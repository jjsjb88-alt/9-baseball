import { runBalanceRegression } from "../src/game/run-simulator.js";
import { ACTS, MAX_OUTS } from "../src/game/showdown-run.js";

const report = runBalanceRegression({ runs: 400 });

console.log(`아웃 ${MAX_OUTS}개 · 막별 체력 ${ACTS.map((act) => `${act.league} ${act.hp}`).join(" / ")}`);
console.table(report.results.map((result) => ({
  policy: result.policy,
  "승률": result.victoryRate.toFixed(3),
  "1막": result.act1ClearRate.toFixed(2),
  "2막": result.act2ClearRate.toFixed(2),
  "3막": result.act3ClearRate.toFixed(2),
  "타석/런": result.avgPlateAppearances.toFixed(1),
  "누적딜": result.avgDamage.toFixed(0),
})));
console.log(`아웃회복 보상 승률 ${report.healed.victoryRate.toFixed(3)} vs 카드만 ${report.noHeal.victoryRate.toFixed(3)}`);
console.log(report.checks);

if (!report.passed) process.exitCode = 1;
