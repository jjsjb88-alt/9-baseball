import { describe, expect, it } from "vitest";
import {
  CORE_TEST_QUESTIONS,
  CORE_TEST_STORAGE_KEY,
  appendCoreTestResult,
  createCoreTestResult,
  hasCompleteCoreTestAnswers,
  readCoreTestResults,
  serializeCoreTestResults,
} from "../src/game/core-test-results.js";

const completeAnswers = Object.fromEntries(
  CORE_TEST_QUESTIONS.map(({ id }, index) => [id, index % 2 === 0]),
);

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
});
