// 런 밸런스 측정용 시뮬레이터.
// 실제 게임과 같은 판정 엔진(resolveShowdownContact)·투구 모델·런 규칙(showdown-run.js)을 쓴다.
// 여기서 나오는 클리어율은 "3아웃 안에 세 투수를 눕힐 수 있는가"를 숫자로 보기 위한 것이다.

import { resolveShowdownContact } from "./showdown-engine.js";
import { buildTrueIntent, computeDistribution, sampleDistribution } from "./showdown-pitch-model.js";
import {
  MASTERED_ZONES,
  PITCHES,
  POLICY_NAMES,
  createSeededRandom,
  maxZone,
  patternZone,
  readResult,
} from "./policy-simulator.js";
import { ACTS, applyRunOutcome, createRun, currentAct, takeRewardAndAdvance } from "./showdown-run.js";

// 주자 진루는 화면과 같은 규칙만 필요하다: 단타 1루, 2루타 2루, 3루타 3루, 홈런 전원.
function advanceBases(bases, outcome) {
  const steps = { single: 1, double: 2, triple: 3, homerun: 4 }[outcome];
  if (!steps) return { bases, runs: 0 };
  const next = [false, false, false];
  let runs = 0;
  bases.forEach((occupied, index) => {
    if (!occupied) return;
    const target = index + steps + 1;
    if (target >= 3) runs += 1;
    else next[target] = true;
  });
  const batter = steps - 1;
  if (batter >= 3) runs += 1;
  else next[batter] = true;
  return { bases: next, runs };
}

export function simulateRun(policy, { seed = 1, rewardPolicy = "heal" } = {}) {
  const random = createSeededRandom(seed);
  const policyRandom = createSeededRandom(seed ^ 0x0a11ce);
  const recentAims = [];
  const twoStrikeObservations = { total: 0, zones: Array(9).fill(0) };

  let run = createRun();
  let bases = [false, false, false];
  let plateAppearances = 0;
  let pitches = 0;

  while (run.status === "playing" && plateAppearances < 400) {
    plateAppearances += 1;
    const act = currentAct(run);
    let balls = 0;
    let strikes = 0;
    let fouls = 0;
    let paDone = false;

    while (!paDone && pitches < 4000) {
      pitches += 1;
      const targetZone = Math.floor(random() * 9);
      const pitch = PITCHES[Math.floor(random() * PITCHES.length)];
      const publicIntent = computeDistribution(targetZone, act.control, pitch.controlMod);
      const trueIntent = buildTrueIntent(publicIntent, { strikes, aiStage: act.aiStage, recentAims });
      const actualZone = sampleDistribution(trueIntent, random);

      let aim;
      if (policy === "Random") aim = Math.floor(policyRandom() * 9);
      else if (policy === "Pattern") aim = patternZone(publicIntent, strikes, twoStrikeObservations);
      else aim = maxZone(publicIntent);

      recentAims.push(aim);
      if (recentAims.length > 12) recentAims.shift();
      if (strikes >= 2 && actualZone !== 9) {
        twoStrikeObservations.total += 1;
        twoStrikeObservations.zones[actualZone] += 1;
      }

      // 존 밖으로 빠진 공은 골라낸다. 볼 넷이면 걸어 나간다.
      if (actualZone === 9) {
        balls += 1;
        const walked = balls >= 4;
        const applied = applyRunOutcome(run, { outcome: "ball" });
        run = applied.run;
        if (run.status !== "playing") { paDone = true; break; }
        if (walked) {
          const forced = advanceBases(bases, "single");
          bases = forced.bases;
          const walkResult = applyRunOutcome(run, { outcome: "walk", runsScored: forced.runs });
          run = walkResult.run;
          paDone = true;
        }
        continue;
      }

      const result = resolveShowdownContact({
        whiffBecomesFoul: true,
        cutsThisPa: fouls,
        read: readResult({ aim, actualZone, publicIntent, trueIntent }),
        mastered: MASTERED_ZONES.has(actualZone) && aim === actualZone,
        modifier: policy === "PowerSpam" ? "smash" : null,
        pitchPower: pitch.power * (act.stuff / 60),
        variance: random,
      });

      if (result.outcome === "swingMiss") {
        strikes += 1;
        const strikeout = strikes >= 3;
        const applied = applyRunOutcome(run, { outcome: strikeout ? "out" : "swingMiss" });
        run = applied.run;
        paDone = strikeout;
      } else if (result.outcome === "foul") {
        strikes = Math.min(2, strikes + 1);
        fouls += 1;
        run = applyRunOutcome(run, { outcome: "foul" }).run;
      } else if (result.outcome === "out") {
        run = applyRunOutcome(run, { outcome: "out" }).run;
        paDone = true;
      } else {
        const advanced = advanceBases(bases, result.outcome);
        bases = advanced.bases;
        run = applyRunOutcome(run, { outcome: result.outcome, runsScored: advanced.runs }).run;
        paDone = true;
      }

      if (run.status !== "playing") paDone = true;
    }

    if (run.status === "actClear") {
      run = takeRewardAndAdvance(run, rewardPolicy);
      bases = [false, false, false];
    }
  }

  return {
    policy,
    seed,
    status: run.status,
    actsCleared: run.actsCleared,
    damageDealt: run.damageDealt,
    plateAppearances,
    pitches,
  };
}

export function simulateRuns(policy, { runs = 400, seed = 1, rewardPolicy = "heal" } = {}) {
  if (!POLICY_NAMES.includes(policy)) throw new Error(`Unknown policy: ${policy}`);
  const results = [];
  for (let index = 0; index < runs; index += 1) {
    results.push(simulateRun(policy, { seed: seed + index * 7919, rewardPolicy }));
  }
  const cleared = (act) => results.filter((result) => result.actsCleared >= act).length / runs;
  return {
    policy,
    runs,
    victoryRate: results.filter((result) => result.status === "victory").length / runs,
    act1ClearRate: cleared(1),
    act2ClearRate: cleared(2),
    act3ClearRate: cleared(3),
    avgActsCleared: results.reduce((sum, r) => sum + r.actsCleared, 0) / runs,
    avgDamage: results.reduce((sum, r) => sum + r.damageDealt, 0) / runs,
    avgPlateAppearances: results.reduce((sum, r) => sum + r.plateAppearances, 0) / runs,
    totalActHp: ACTS.reduce((sum, act) => sum + act.hp, 0),
  };
}

export function runBalanceReport(options) {
  return POLICY_NAMES.map((policy) => simulateRuns(policy, options));
}

// 런 밸런스 회귀. 봇은 카드·수식어·집중·덱 성장을 전혀 쓰지 않으므로 여기 수치는 "바닥값"이다.
export function runBalanceRegression(options = {}) {
  const results = runBalanceReport(options);
  const byPolicy = Object.fromEntries(results.map((result) => [result.policy, result]));
  const healed = simulateRuns("MaxProb", { ...options, rewardPolicy: "heal" });
  const noHeal = simulateRuns("MaxProb", { ...options, rewardPolicy: "card" });
  const checks = {
    // 1막에서 런이 그냥 끝나버리면 안 되고, 봇이 거저 통과해서도 안 된다.
    firstActIsPassableButNotFree: byPolicy.MaxProb.act1ClearRate >= 0.55 && byPolicy.MaxProb.act1ClearRate <= 0.9,
    // 보스까지 가는 건 바닥값 기준으로 드물어야 한다.
    bossIsRareForABot: byPolicy.MaxProb.victoryRate > 0.01 && byPolicy.MaxProb.victoryRate <= 0.35,
    // 읽는 쪽이 무작위보다 확실히 멀리 간다.
    readingBeatsRandom: byPolicy.MaxProb.avgActsCleared > byPolicy.Random.avgActsCleared * 1.2,
    // POWER 연타가 지배전략이 되면 안 된다.
    powerSpamIsNotDominant: byPolicy.PowerSpam.victoryRate <= byPolicy.MaxProb.victoryRate,
    // 아웃 회복 보상이 실제로 런을 늘려야 선택이 성립한다.
    healRewardMatters: healed.victoryRate > noHeal.victoryRate,
  };
  return { results, healed, noHeal, checks, passed: Object.values(checks).every(Boolean) };
}
