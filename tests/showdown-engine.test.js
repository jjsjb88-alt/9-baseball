import { describe, expect, it } from "vitest";
import { resolveShowdownContact } from "../src/game/showdown-engine.js";

const sequence = (...values) => {
  let index = 0;
  return () => values[index++ % values.length];
};

describe("resolveShowdownContact", () => {
  it("keeps read and execution separate", () => {
    const result = resolveShowdownContact({ read: "READ", mastered: true, variance: sequence(0.5, 0) });
    expect(result.outcome).toBe("swingMiss");
  });

  it("gives POWER more PQ but less CQ on the same rolls", () => {
    const normal = resolveShowdownContact({ read: "READ", mastered: true, variance: sequence(0.9, 0.9, 0.9, 0.9) });
    const power = resolveShowdownContact({ read: "READ", mastered: true, modifier: "smash", variance: sequence(0.9, 0.9, 0.9, 0.9) });
    expect(power.cq).toBeLessThan(normal.cq);
    expect(power.pq).toBeGreaterThan(normal.pq);
  });

  it("does not turn a misread POWER swing into a strong ball", () => {
    const normal = resolveShowdownContact({ read: "MISREAD", mastered: false, variance: sequence(0.99, 0.99, 0.99, 0.99) });
    const power = resolveShowdownContact({ read: "MISREAD", mastered: false, modifier: "smash", variance: sequence(0.99, 0.99, 0.99, 0.99) });
    expect(power.cq).toBeLessThan(normal.cq);
    expect(power.pq).toBe(normal.pq);
  });

  it("penalizes BASIC SWING mastery", () => {
    const mastered = resolveShowdownContact({ read: "READ", mastered: true, variance: sequence(0.9, 0.9, 0.9) });
    const basic = resolveShowdownContact({ read: "READ", mastered: false, variance: sequence(0.9, 0.9, 0.9) });
    expect(basic.cq).toBeLessThan(mastered.cq);
    expect(basic.pq).toBeLessThan(mastered.pq);
  });
});

describe("read protection", () => {
  it("turns a whiff into a cut when the read was precise", () => {
    const plain = resolveShowdownContact({ read: "READ", mastered: true, variance: sequence(0.5, 0) });
    const saved = resolveShowdownContact({ read: "READ", mastered: true, whiffBecomesFoul: true, variance: sequence(0.5, 0) });
    expect(plain.outcome).toBe("swingMiss");
    expect(saved.outcome).toBe("foul");
    expect(saved.whiffSaved).toBe(true);
  });

  it("does not protect a misread", () => {
    const result = resolveShowdownContact({ read: "MISREAD", mastered: true, whiffBecomesFoul: true, variance: sequence(0.5, 0) });
    expect(result.outcome).toBe("swingMiss");
  });

  it("stops protecting once the batter has cut too many times in the at-bat", () => {
    const inside = resolveShowdownContact({ read: "READ", mastered: true, whiffBecomesFoul: true, cutsThisPa: 2, variance: sequence(0.5, 0) });
    const beyond = resolveShowdownContact({ read: "READ", mastered: true, whiffBecomesFoul: true, cutsThisPa: 3, variance: sequence(0.5, 0) });
    expect(inside.outcome).toBe("foul");
    expect(beyond.outcome).toBe("swingMiss");
  });
});

describe("read protection and POWER", () => {
  it("leaves POWER swings exposed - the risk is what POWER buys", () => {
    const plain = resolveShowdownContact({ read: "READ", mastered: true, whiffBecomesFoul: true, variance: sequence(0.5, 0) });
    const power = resolveShowdownContact({ read: "READ", mastered: true, modifier: "smash", whiffBecomesFoul: true, variance: sequence(0.5, 0) });
    expect(plain.outcome).toBe("foul");
    expect(power.outcome).toBe("swingMiss");
  });
});
