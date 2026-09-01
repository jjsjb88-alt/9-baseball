import { describe, expect, it } from "vitest";
import { runPolicyRegression, simulatePolicy } from "../src/game/policy-simulator.js";

describe("fixed-seed policy regression", () => {
  it("is deterministic for the same seed", () => {
    const first = simulatePolicy("Pattern", { seed: 20260902, plateAppearances: 200 });
    const second = simulatePolicy("Pattern", { seed: 20260902, plateAppearances: 200 });
    expect(second).toEqual(first);
  });

  it("keeps POWER spam from becoming a dominant strategy", () => {
    const report = runPolicyRegression();
    expect(report.checks.powerIsNotDominant).toBe(true);
    expect(report.checks.powerPaysContactCost).toBe(true);
  });

  it("rewards a policy that learns the two-strike tell", () => {
    const report = runPolicyRegression();
    expect(report.checks.patternFindsMoreDeepReads).toBe(true);
    expect(report.passed).toBe(true);
  });
});
