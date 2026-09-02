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

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalizeJson(value[key])]),
  );
}

export function mergeCoreTestResultSets(resultSets) {
  const results = [];
  const fingerprints = new Set();
  let duplicates = 0;
  let skipped = 0;

  for (const resultSet of resultSets) {
    if (!Array.isArray(resultSet)) {
      skipped += 1;
      continue;
    }

    for (const result of resultSet) {
      if (!result || typeof result !== "object" || !hasCompleteCoreTestAnswers(result.answers)) {
        skipped += 1;
        continue;
      }

      const fingerprint = JSON.stringify(canonicalizeJson(result));
      if (fingerprints.has(fingerprint)) {
        duplicates += 1;
        continue;
      }

      fingerprints.add(fingerprint);
      results.push(result);
    }
  }

  results.sort((left, right) => String(left.timestamp || "").localeCompare(String(right.timestamp || "")));
  return { results, duplicates, skipped };
}

export function summarizeCoreTestResults(results) {
  const validResults = Array.isArray(results)
    ? results.filter((result) => hasCompleteCoreTestAnswers(result?.answers))
    : [];

  const questions = CORE_TEST_QUESTIONS.map(({ id, text }) => {
    const yes = validResults.filter((result) => result.answers[id] === true).length;
    const no = validResults.length - yes;
    const desiredAnswer = id === "powerDominant" ? false : true;
    const positive = desiredAnswer ? yes : no;

    return {
      id,
      text,
      yes,
      no,
      positive,
      positiveRate: validResults.length > 0 ? positive / validResults.length : null,
    };
  });

  return {
    total: validResults.length,
    target: 3,
    readyForReview: validResults.length >= 3,
    questions,
    notes: validResults.map((result) => result.note).filter(Boolean),
  };
}
