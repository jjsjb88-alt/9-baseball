export const CORE_TEST_STORAGE_KEY = "9zone-core-test-results-v1";

export const CORE_TEST_QUESTIONS = [
  { id: "choseLowProbability", text: "최고 확률이 아닌 존을 의도적으로 고른 순간이 있었나요?" },
  { id: "feltLikeRead", text: "적중했을 때 ‘운이 좋았다’보다 ‘읽었다’는 감정이 컸나요?" },
  { id: "plannedCounter", text: "실패했을 때 다음 공의 역심리를 생각하게 됐나요?" },
  { id: "powerDominant", text: "POWER만 반복하는 것이 가장 합리적인 전략처럼 느껴졌나요?" },
];

export function hasCompleteCoreTestAnswers(answers) {
  return CORE_TEST_QUESTIONS.every(({ id }) => typeof answers?.[id] === "boolean");
}

export function parseCoreTestResults(serialized) {
  try {
    const parsed = JSON.parse(serialized || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readCoreTestResults(storage) {
  try {
    return parseCoreTestResults(storage.getItem(CORE_TEST_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function createCoreTestResult({ answers, note, lastPlay, pitchHistory, now = () => new Date() }) {
  if (!hasCompleteCoreTestAnswers(answers)) {
    throw new TypeError("All core-test questions require a boolean answer");
  }

  return {
    version: 1,
    timestamp: now().toISOString(),
    answers: { ...answers },
    note: note.trim(),
    finalPlay: lastPlay?.text || null,
    pitchesSeen: pitchHistory.map(({ zone, pitchId }) => ({ zone, pitchId })),
  };
}

export function appendCoreTestResult(storage, result) {
  const previous = parseCoreTestResults(storage.getItem(CORE_TEST_STORAGE_KEY));
  const results = [...previous, result];
  storage.setItem(CORE_TEST_STORAGE_KEY, JSON.stringify(results));
  return results;
}

export function serializeCoreTestResults(storage) {
  const results = parseCoreTestResults(storage.getItem(CORE_TEST_STORAGE_KEY));
  return JSON.stringify(results, null, 2);
}
