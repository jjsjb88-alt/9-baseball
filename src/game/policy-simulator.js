import { resolveShowdownContact } from "./showdown-engine.js";
import { buildTrueIntent, computeDistribution, sampleDistribution } from "./showdown-pitch-model.js";

export const POLICY_NAMES = ["Random", "MaxProb", "Pattern", "PowerSpam"];

export const MASTERED_ZONES = new Set([1, 3, 4, 7]);
export const PITCHES = [
  { power: 75, controlMod: 1 },
  { power: 60, controlMod: 0.85 },
  { power: 45, controlMod: 0.75 },
  { power: 55, controlMod: 0.9 },
];
const TOTAL_BASES = { single: 1, double: 2, triple: 3, homerun: 4 };

export function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export const maxZone = (dist) =>
  Number(Object.entries(dist).reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0]);

export const patternZone = (publicIntent, strikes, observations) => {
  if (strikes < 2 || observations.total < 12) return maxZone(publicIntent);
  const [zone, count] = observations.zones.reduce(
    (best, value, index) => (value > best[1] ? [index, value] : best),
    [0, -1],
  );
  return count / observations.total >= 0.16 ? zone : maxZone(publicIntent);
};

export const readResult = ({ aim, actualZone, publicIntent, trueIntent }) => {
  if (actualZone === 9) return "CHASE";
  if (aim === actualZone && (trueIntent[aim] || 0) - (publicIntent[aim] || 0) >= 12) return "DEEP_READ";
  if (aim === actualZone) return "READ";
  const aimRow = Math.floor(aim / 3);
  const aimCol = aim % 3;
  const actualRow = Math.floor(actualZone / 3);
  const actualCol = actualZone % 3;
  return Math.hypot(aimRow - actualRow, aimCol - actualCol) <= 1.5 ? "NEAR_READ" : "MISREAD";
};

const stageForPlateAppearance = (index, total) => {
  if (index < total / 3) return "ROOKIE";
  if (index < (total * 2) / 3) return "ADAPTER";
  return "FOX";
};

export function simulatePolicy(policy, { seed = 0x9a0e2026, plateAppearances = 3000 } = {}) {
  if (!POLICY_NAMES.includes(policy)) throw new Error(`Unknown policy: ${policy}`);
  const random = createSeededRandom(seed);
  const policyRandom = createSeededRandom(seed ^ 0x0a11ce);
  const recentAims = [];
  const twoStrikeObservations = { total: 0, zones: Array(9).fill(0) };
  const metrics = {
    policy,
    seed,
    plateAppearances,
    pitches: 0,
    hits: 0,
    totalBases: 0,
    batContacts: 0,
    swingMisses: 0,
    deepReads: 0,
    outcomes: {},
  };

  for (let pa = 0; pa < plateAppearances; pa += 1) {
    let strikes = 0;
    let complete = false;
    const aiStage = stageForPlateAppearance(pa, plateAppearances);

    for (let pitchNumber = 0; pitchNumber < 12 && !complete; pitchNumber += 1) {
      const targetZone = Math.floor(random() * 9);
      const pitch = PITCHES[Math.floor(random() * PITCHES.length)];
      const publicIntent = computeDistribution(targetZone, 72, pitch.controlMod);
      const trueIntent = buildTrueIntent(publicIntent, { strikes, aiStage, recentAims });
      const actualZone = sampleDistribution(trueIntent, random);

      let aim;
      if (policy === "Random") aim = Math.floor(policyRandom() * 9);
      else if (policy === "Pattern") aim = patternZone(publicIntent, strikes, twoStrikeObservations);
      else aim = maxZone(publicIntent);

      const read = readResult({ aim, actualZone, publicIntent, trueIntent });
      const result = resolveShowdownContact({
        read,
        mastered: MASTERED_ZONES.has(actualZone) && aim === actualZone,
        modifier: policy === "PowerSpam" ? "smash" : null,
        pitchPower: pitch.power,
        variance: random,
      });

      metrics.pitches += 1;
      metrics.outcomes[result.outcome] = (metrics.outcomes[result.outcome] || 0) + 1;
      if (result.outcome !== "swingMiss") metrics.batContacts += 1;
      if (result.outcome === "swingMiss") metrics.swingMisses += 1;
      if (read === "DEEP_READ") metrics.deepReads += 1;
      if (TOTAL_BASES[result.outcome]) {
        metrics.hits += 1;
        metrics.totalBases += TOTAL_BASES[result.outcome];
      }

      if (strikes >= 2 && actualZone !== 9) {
        twoStrikeObservations.total += 1;
        twoStrikeObservations.zones[actualZone] += 1;
      }
      recentAims.push(aim);
      if (recentAims.length > 12) recentAims.shift();

      if (result.outcome === "swingMiss") {
        strikes += 1;
        complete = strikes >= 3;
      } else if (result.outcome === "foul") {
        strikes = Math.min(2, strikes + 1);
      } else {
        complete = true;
      }
    }
  }

  return {
    ...metrics,
    hitRate: metrics.hits / plateAppearances,
    totalBasesPerPa: metrics.totalBases / plateAppearances,
    contactRate: metrics.batContacts / metrics.pitches,
    deepReadRate: metrics.deepReads / metrics.pitches,
  };
}

export function runPolicyRegression(options) {
  const results = POLICY_NAMES.map((policy) => simulatePolicy(policy, options));
  const byPolicy = Object.fromEntries(results.map((result) => [result.policy, result]));
  const bestNonPower = Math.max(
    byPolicy.Random.totalBasesPerPa,
    byPolicy.MaxProb.totalBasesPerPa,
    byPolicy.Pattern.totalBasesPerPa,
  );
  const powerRatio = byPolicy.PowerSpam.totalBasesPerPa / bestNonPower;
  const checks = {
    powerIsNotDominant: powerRatio <= 1.05,
    powerPaysContactCost: byPolicy.PowerSpam.contactRate < byPolicy.MaxProb.contactRate - 0.04,
    patternFindsMoreDeepReads: byPolicy.Pattern.deepReadRate > byPolicy.MaxProb.deepReadRate,
  };
  return { results, checks, passed: Object.values(checks).every(Boolean), powerRatio };
}
