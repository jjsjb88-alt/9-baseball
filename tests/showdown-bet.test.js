import { describe, expect, it } from "vitest";
import { coveredZones, previewBet, zoneMultiplier, WEAK_ZONE_MULT } from "../src/game/showdown-bet.js";

const ZONE_RATING = [55, 70, 58, 60, 85, 62, 45, 68, 50];

describe("coveredZones", () => {
  it("keeps a single pick as one zone", () => {
    expect(coveredZones([4])).toEqual([4]);
  });

  it("expands pushHit to every zone within the adjacent distance, diagonals included", () => {
    expect(coveredZones([4], "pushHit").sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(coveredZones([0], "pushHit").sort((a, b) => a - b)).toEqual([0, 1, 3, 4]);
  });

  it("does not expand for other modifiers", () => {
    expect(coveredZones([4], "smash")).toEqual([4]);
  });
});

describe("previewBet", () => {
  it("sums the PUBLIC distribution over the covered zones", () => {
    const preview = previewBet({ publicDist: { 4: 40, 5: 18, 3: 12 }, zones: [4, 5], zoneRating: ZONE_RATING });
    expect(preview.hitPct).toBe(58);
    expect(preview.width).toBe(2);
  });

  it("drops the damage multiplier when the bet gets wider", () => {
    const narrow = previewBet({ publicDist: { 4: 40 }, zones: [4], zoneRating: ZONE_RATING });
    const wide = previewBet({ publicDist: { 4: 40, 5: 18 }, zones: [4, 5], zoneRating: ZONE_RATING });
    expect(wide.damageMult).toBeLessThan(narrow.damageMult);
    expect(wide.hitPct).toBeGreaterThan(narrow.hitPct);
  });

  it("raises the damage multiplier for POWER and lowers it for pushHit", () => {
    const plain = previewBet({ publicDist: { 4: 40 }, zones: [4], zoneRating: ZONE_RATING });
    const smash = previewBet({ publicDist: { 4: 40 }, zones: [4], mod: "smash", zoneRating: ZONE_RATING });
    const push = previewBet({ publicDist: { 4: 40 }, zones: [4], mod: "pushHit", zoneRating: ZONE_RATING });
    expect(smash.damageMult).toBeGreaterThan(plain.damageMult);
    expect(push.damageMult).toBeLessThan(plain.damageMult);
  });

  it("warns about weak zones under the threshold and stays quiet otherwise", () => {
    const weak = previewBet({ publicDist: { 8: 30 }, zones: [8], zoneRating: ZONE_RATING });
    expect(weak.weakZones.map((entry) => entry.zone)).toEqual([8]);
    expect(zoneMultiplier(ZONE_RATING[8])).toBeLessThan(WEAK_ZONE_MULT);

    const strong = previewBet({ publicDist: { 4: 30 }, zones: [4], zoneRating: ZONE_RATING });
    expect(strong.weakZones).toEqual([]);
  });

  it("never reports a READ grade", () => {
    const preview = previewBet({ publicDist: { 4: 40 }, zones: [4], zoneRating: ZONE_RATING });
    expect(Object.keys(preview)).toEqual(["width", "covered", "hitPct", "damageMult", "weakZones"]);
  });

  it("clamps an empty bet instead of producing NaN", () => {
    const preview = previewBet({ publicDist: {}, zones: [], zoneRating: ZONE_RATING });
    expect(preview.hitPct).toBe(0);
    expect(Number.isFinite(preview.damageMult)).toBe(true);
  });
});
