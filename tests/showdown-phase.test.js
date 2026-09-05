import { describe, expect, it } from "vitest";
import {
  PHASE_INPUT_TARGET,
  UI_PHASES,
  phaseInputTarget,
  phaseInstruction,
  resolveUiPhase,
} from "../src/game/showdown-phase.js";

describe("resolveUiPhase", () => {
  it("reports AUTO whenever it is not the player's turn", () => {
    expect(resolveUiPhase({ isUserTurn: false, role: "batter", pitchPhase: "ready" })).toBe("AUTO");
    expect(resolveUiPhase({ isUserTurn: false, role: "pitcher", pitchPhase: "reveal" })).toBe("AUTO");
  });

  it("walks OBSERVE → READ → BET → REVEAL for the batter", () => {
    expect(resolveUiPhase({ isUserTurn: true, role: "batter", pitchPhase: "ready" })).toBe("OBSERVE");
    expect(resolveUiPhase({ isUserTurn: true, role: "batter", pitchPhase: "windup" })).toBe("OBSERVE");
    expect(resolveUiPhase({ isUserTurn: true, role: "batter", pitchPhase: "reveal", zoneChosen: false })).toBe("READ");
    expect(resolveUiPhase({ isUserTurn: true, role: "batter", pitchPhase: "reveal", zoneChosen: true })).toBe("BET");
    expect(resolveUiPhase({ isUserTurn: true, role: "batter", pitchPhase: "result" })).toBe("REVEAL");
  });

  it("keeps the pitcher on its own phase", () => {
    expect(resolveUiPhase({ isUserTurn: true, role: "pitcher", pitchPhase: "ready" })).toBe("PITCH");
  });
});

describe("phase labels and input targets", () => {
  it("never leaves the phase label empty", () => {
    UI_PHASES.forEach((phase) => {
      expect(phaseInstruction(phase).trim().length).toBeGreaterThan(0);
    });
    expect(phaseInstruction("SOMETHING_NEW").trim().length).toBeGreaterThan(0);
  });

  it("uses the caller's label for automatic at-bats so the screen is never silent", () => {
    expect(phaseInstruction("AUTO", "3번 타자 진행 중")).toBe("3번 타자 진행 중");
    expect(phaseInstruction("AUTO", "").length).toBeGreaterThan(0);
  });

  it("allows exactly one input region per phase", () => {
    UI_PHASES.forEach((phase) => {
      const target = phaseInputTarget(phase);
      expect(typeof target).toBe("string");
      expect(Object.values(PHASE_INPUT_TARGET).filter((value) => value === target).length).toBeGreaterThan(0);
    });
    expect(phaseInputTarget("OBSERVE")).toBe("history");
    expect(phaseInputTarget("READ")).toBe("hand");
    expect(phaseInputTarget("BET")).toBe("sheet");
    expect(phaseInputTarget("REVEAL")).toBe("none");
    expect(phaseInputTarget("AUTO")).toBe("none");
    expect(phaseInputTarget("UNKNOWN")).toBe("none");
  });

  it("keeps one target per phase - no phase opens two regions at once", () => {
    UI_PHASES.forEach((phase) => {
      expect(typeof PHASE_INPUT_TARGET[phase]).toBe("string");
    });
  });
});
