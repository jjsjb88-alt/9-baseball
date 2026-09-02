import { describe, expect, it } from "vitest";
import {
  CORE_TEST_QUESTIONS,
  CORE_TEST_STORAGE_KEY,
  appendCoreTestResult,
  createCoreTestResult,
  hasCompleteCoreTestAnswers,
  isValidCoreTestResult,
  mergeCoreTestResultSets,
  readCoreTestResults,
  serializeCoreTestResults,
  summarizeCoreTestResults,
} from "../src/game/core-test-results.js";

const completeAnswers = Object.fromEntries(
  CORE_TEST_QUESTIONS.map(({ id }, index) => [id, index % 2 === 0]),
);

const exportedResult = (overrides = {}) => ({
  version: 1,
  timestamp: "2026-09-02T01:00:00.000Z",
  answers: completeAnswers,
  note: "",
  finalPlay: null,
  pitchesSeen: [{ zone: 7, pitchId: "fastball" }],
  ...overrides,
});

const memoryStorage = (initialValue = null) => {
  let value = initialValue;
  return {
    getItem: () => value,
    setItem: (_key, nextValue) => { value = nextValue; },
    value: () => value,
  };
};

describe("core-test results", () => {
  it("requires all four boolean answers while preserving false", () => {
    expect(hasCompleteCoreTestAnswers(completeAnswers)).toBe(true);
    expect(hasCompleteCoreTestAnswers({ ...completeAnswers, powerDominant: undefined })).toBe(false);
    expect(completeAnswers.feltLikeRead).toBe(false);
  });

  it("creates the exported result without leaking extra pitch fields", () => {
    const result = createCoreTestResult({
      answers: completeAnswers,
      note: "  다음 공을 노리고 싶었다  ",
      lastPlay: { text: "DEEP READ · 2루타", internal: true },
      pitchHistory: [{ zone: 7, pitchId: "fastball", hiddenIntent: 0.91 }],
      now: () => new Date("2026-09-02T01:02:03.000Z"),
    });

    expect(result).toEqual({
      version: 1,
      timestamp: "2026-09-02T01:02:03.000Z",
      answers: completeAnswers,
      note: "다음 공을 노리고 싶었다",
      finalPlay: "DEEP READ · 2루타",
      pitchesSeen: [{ zone: 7, pitchId: "fastball" }],
    });
  });

  it("accepts only complete version 1 exports as report input", () => {
    expect(isValidCoreTestResult(exportedResult())).toBe(true);
    expect(isValidCoreTestResult({ answers: completeAnswers })).toBe(false);
    expect(isValidCoreTestResult(exportedResult({ version: 2 }))).toBe(false);
    expect(isValidCoreTestResult(exportedResult({ timestamp: "September 2, 2026" }))).toBe(false);
    expect(isValidCoreTestResult(exportedResult({ note: null }))).toBe(false);
    expect(isValidCoreTestResult(exportedResult({ pitchesSeen: [{ zone: 10, pitchId: "fastball" }] }))).toBe(false);
    expect(isValidCoreTestResult(exportedResult({ hiddenIntent: 0.91 }))).toBe(false);
    expect(isValidCoreTestResult(exportedResult({
      answers: { ...completeAnswers, hiddenTell: true },
    }))).toBe(false);
    expect(isValidCoreTestResult(exportedResult({
      pitchesSeen: [{ zone: 7, pitchId: "fastball", trueDist: [0.1, 0.9] }],
    }))).toBe(false);
    expect(isValidCoreTestResult(exportedResult({
      pitchesSeen: [{ zone: 7, pitchId: "knuckleball" }],
    }))).toBe(false);
  });

  it("recovers from malformed storage and appends a valid result", () => {
    const storage = memoryStorage("{broken");
    expect(readCoreTestResults(storage)).toEqual([]);

    const result = { version: 1, answers: completeAnswers };
    expect(appendCoreTestResult(storage, result)).toEqual([result]);
    expect(JSON.parse(storage.value())).toEqual([result]);
    expect(JSON.parse(serializeCoreTestResults(storage))).toEqual([result]);
    expect(CORE_TEST_STORAGE_KEY).toBe("9zone-core-test-results-v1");
  });

  it("does not disguise an unavailable storage backend as an empty export", () => {
    const unavailableStorage = { getItem: () => { throw new Error("blocked"); } };
    expect(readCoreTestResults(unavailableStorage)).toEqual([]);
    expect(() => serializeCoreTestResults(unavailableStorage)).toThrow("blocked");
  });

  it("merges cumulative exports without double-counting the same response", () => {
    const first = exportedResult({ note: "첫 번째" });
    const reorderedFirst = {
      pitchesSeen: [{ pitchId: "fastball", zone: 7 }],
      finalPlay: null,
      note: "첫 번째",
      answers: {
        powerDominant: completeAnswers.powerDominant,
        plannedCounter: completeAnswers.plannedCounter,
        feltLikeRead: completeAnswers.feltLikeRead,
        choseLowProbability: completeAnswers.choseLowProbability,
      },
      timestamp: "2026-09-02T01:00:00.000Z",
      version: 1,
    };
    const second = exportedResult({ timestamp: "2026-09-02T02:00:00.000Z", note: "두 번째" });
    const malformed = { version: 1, answers: { choseLowProbability: true } };

    expect(mergeCoreTestResultSets([[first], [reorderedFirst, second, malformed], { broken: true }])).toEqual({
      results: [first, second],
      duplicates: 1,
      skipped: 2,
    });
  });

  it("summarizes the three human signals and treats rejecting POWER spam as positive", () => {
    const positiveAnswers = {
      choseLowProbability: true,
      feltLikeRead: true,
      plannedCounter: true,
      powerDominant: false,
    };
    const results = [
      exportedResult({ answers: positiveAnswers, note: "패턴을 찾았다" }),
      exportedResult({ timestamp: "2026-09-02T02:00:00.000Z", answers: positiveAnswers }),
      exportedResult({
        timestamp: "2026-09-02T03:00:00.000Z",
        answers: { ...positiveAnswers, feltLikeRead: false, powerDominant: true },
        note: "운처럼 느껴졌다",
      }),
    ];

    const summary = summarizeCoreTestResults(results);
    expect(summary).toMatchObject({ total: 3, target: 3, readyForReview: true });
    expect(summary.questions.find(({ id }) => id === "feltLikeRead")).toMatchObject({ yes: 2, no: 1, positive: 2 });
    expect(summary.questions.find(({ id }) => id === "powerDominant")).toMatchObject({ yes: 1, no: 2, positive: 2 });
    expect(summary.notes).toEqual(["패턴을 찾았다", "운처럼 느껴졌다"]);
  });
});
