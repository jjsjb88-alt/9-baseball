import { describe, expect, it, vi } from "vitest";

vi.mock("tone", () => ({}));
import { resolveShowdownContact } from "../BaseballSim-deck-5.jsx";

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

  it("penalizes BASIC SWING mastery", () => {
    const mastered = resolveShowdownContact({ read: "READ", mastered: true, variance: sequence(0.9, 0.9, 0.9) });
    const basic = resolveShowdownContact({ read: "READ", mastered: false, variance: sequence(0.9, 0.9, 0.9) });
    expect(basic.cq).toBeLessThan(mastered.cq);
    expect(basic.pq).toBeLessThan(mastered.pq);
  });
});
