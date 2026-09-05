import { describe, expect, it } from "vitest";
import {
  ACTS,
  MAX_OUTS,
  PITCHER_TRAITS,
  actWithTrait,
  rollRoutes,
  takeRoute,
  applyRunOutcome,
  createRun,
  currentAct,
  damageFor,
  runSummary,
  takeRewardAndAdvance,
} from "../src/game/showdown-run.js";

// 결정적 난수: 시드마다 다른 순열을 만들되 테스트가 흔들리지 않게 한다.
const seededRandom = (seed = 1) => {
  let state = (seed + 1) * 2654435761 % 4294967296;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

describe("run structure", () => {
  it("starts in the independent league with a full pitcher and three outs", () => {
    const run = createRun();
    const summary = runSummary(run);
    expect(summary.act).toBe(1);
    expect(summary.league).toBe("독립리그");
    expect(summary.hp).toBe(ACTS[0].hp);
    expect(summary.outsLeft).toBe(MAX_OUTS);
    expect(summary.status).toBe("playing");
  });

  it("counts every out against the whole run, not an inning", () => {
    let run = createRun();
    for (let i = 0; i < MAX_OUTS - 1; i += 1) {
      run = applyRunOutcome(run, { outcome: "out" }).run;
      expect(run.status).toBe("playing");
    }
    const last = applyRunOutcome(run, { outcome: "out" });
    expect(last.runOver).toBe(true);
    expect(last.run.status).toBe("defeat");
    expect(runSummary(last.run).outsLeft).toBe(0);
  });

  it("chips the pitcher with hits, cuts and scored runners", () => {
    expect(damageFor("single")).toBe(12);
    expect(damageFor("homerun")).toBe(30);
    expect(damageFor("foul")).toBe(1);
    expect(damageFor("out")).toBe(0);
    // 주자를 모아 터뜨리면 추가 타격이 붙는다.
    expect(damageFor("single", 2)).toBe(12 + 16);
  });

  it("clears the act when the pitcher drops and waits for a reward", () => {
    let run = createRun();
    run = { ...run, hp: 5 };
    const result = applyRunOutcome(run, { outcome: "single" });
    expect(result.actCleared).toBe(true);
    expect(result.runOver).toBe(false);
    expect(result.run.status).toBe("actClear");
    expect(result.run.actsCleared).toBe(1);
  });

  it("lets a cut finish the pitcher even on the last out", () => {
    const run = { ...createRun(), hp: 1, outs: MAX_OUTS - 1 };
    const result = applyRunOutcome(run, { outcome: "foul" });
    expect(result.run.status).toBe("actClear");
    expect(result.run.outs).toBe(MAX_OUTS - 1);
  });

  it("walks the acts up to the boss and ends in victory", () => {
    let run = createRun();
    ACTS.forEach((act, index) => {
      expect(currentAct(run).act).toBe(act.act);
      const result = applyRunOutcome({ ...run, hp: 1 }, { outcome: "single" });
      run = result.run;
      if (index < ACTS.length - 1) {
        expect(run.status).toBe("actClear");
        run = takeRewardAndAdvance(run, "card");
        expect(run.hp).toBe(ACTS[index + 1].hp);
      } else {
        expect(run.status).toBe("victory");
        expect(result.runOver).toBe(true);
      }
    });
    expect(run.actsCleared).toBe(ACTS.length);
  });

  it("heals exactly one out and never below zero", () => {
    const run = { ...createRun(), outs: 2, status: "actClear" };
    expect(takeRewardAndAdvance(run, "heal").outs).toBe(1);
    expect(takeRewardAndAdvance({ ...run, outs: 0 }, "heal").outs).toBe(0);
    expect(takeRewardAndAdvance(run, "card").outs).toBe(2);
  });

  it("ignores outcomes once the run is over", () => {
    const run = { ...createRun(), status: "defeat" };
    const result = applyRunOutcome(run, { outcome: "homerun" });
    expect(result.run).toBe(run);
    expect(result.damage).toBe(0);
    expect(takeRewardAndAdvance(run, "heal")).toBe(run);
  });

  it("keeps the acts ordered from independent league to the first division", () => {
    expect(ACTS.map((act) => act.league)).toEqual(["독립리그", "퓨처스리그", "1부리그"]);
    expect(ACTS.map((act) => act.tier)).toEqual(["일반 투수", "엘리트 투수", "보스 투수"]);
    expect(ACTS.map((act) => act.hp)).toEqual([...ACTS.map((act) => act.hp)].sort((a, b) => a - b));
    expect(ACTS.map((act) => act.aiStage)).toEqual(["ROOKIE", "ADAPTER", "FOX"]);
  });
});

describe("pitcher traits and routes", () => {
  it("shows the next pitcher's trait in every route option", () => {
    const run = { ...createRun(), status: "actClear" };
    const routes = rollRoutes(run, seededRandom());
    expect(routes).toHaveLength(2);
    routes.forEach((route) => {
      expect(PITCHER_TRAITS[route.trait]).toBeTruthy();
      expect(route.act.trait.tell.length).toBeGreaterThan(0);
      expect(route.act.pitcherName).toContain(PITCHER_TRAITS[route.trait].name);
    });
  });

  it("never offers the same stop or the same pitcher twice", () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const routes = rollRoutes({ ...createRun(), status: "actClear" }, seededRandom(seed));
      expect(routes[0].node).not.toBe(routes[1].node);
      expect(routes[0].trait).not.toBe(routes[1].trait);
    }
  });

  it("applies the trait to the pitcher the run actually faces", () => {
    const run = { ...createRun(), status: "actClear" };
    const powerRoute = { node: "train", trait: "power", act: actWithTrait(1, "power") };
    const next = takeRoute(run, powerRoute);
    expect(next.trait).toBe("power");
    expect(currentAct(next).stuff).toBe(ACTS[1].stuff + PITCHER_TRAITS.power.stuff);
    expect(currentAct(next).control).toBe(ACTS[1].control + PITCHER_TRAITS.power.control);
    expect(next.hp).toBe(currentAct(next).hp);
  });

  it("heals one out only on the rest stop", () => {
    const run = { ...createRun(), outs: 2, status: "actClear" };
    expect(takeRoute(run, { node: "rest", trait: "control" }).outs).toBe(1);
    expect(takeRoute(run, { node: "shop", trait: "control" }).outs).toBe(2);
    expect(takeRoute(run, { node: "train", trait: "control" }).outs).toBe(2);
  });

  it("ignores a route when the act is not cleared", () => {
    const run = createRun();
    expect(takeRoute(run, { node: "rest", trait: "power" })).toBe(run);
  });
});
