export const CORE_TEST_STORAGE_KEY = "9zone-core-test-results-v1";

const CORE_TEST_RESULT_KEYS = ["answers", "finalPlay", "note", "pitchesSeen", "timestamp", "version"];
const CORE_TEST_ANSWER_KEYS = ["choseLowProbability", "feltLikeRead", "plannedCounter", "powerDominant"];
const CORE_TEST_PITCH_KEYS = ["pitchId", "zone"];
const CORE_TEST_PITCH_IDS = new Set(["change", "curve", "fastball", "slider"]);

export const CORE_TEST_QUESTIONS = [
  { id: "choseLowProbability", text: "최고 확률이 아닌 존을 의도적으로 고른 순간이 있었나요?" },
  { id: "feltLikeRead", text: "적중했을 때 ‘운이 좋았다’보다 ‘읽었다’는 감정이 컸나요?" },
  { id: "plannedCounter", text: "실패했을 때 다음 공의 역심리를 생각하게 됐나요?" },
  { id: "powerDominant", text: "POWER만 반복하는 것이 가장 합리적인 전략처럼 느껴졌나요?" },
];

export function hasCompleteCoreTestAnswers(answers) {
  return CORE_TEST_QUESTIONS.every(({ id }) => typeof answers?.[id] === "boolean");
}

function hasExactKeys(value, expectedKeys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort();
  return keys.length === expectedKeys.length
    && keys.every((key, index) => key === expectedKeys[index]);
}

export function isValidCoreTestResult(result) {
  if (!hasExactKeys(result, CORE_TEST_RESULT_KEYS)) return false;
  if (result.version !== 1 || !hasExactKeys(result.answers, CORE_TEST_ANSWER_KEYS)) return false;
  if (!hasCompleteCoreTestAnswers(result.answers)) return false;
  if (typeof result.timestamp !== "string") return false;

  const timestamp = new Date(result.timestamp);
  if (Number.isNaN(timestamp.getTime()) || timestamp.toISOString() !== result.timestamp) return false;
  if (typeof result.note !== "string") return false;
  if (result.finalPlay !== null && typeof result.finalPlay !== "string") return false;
  if (!Array.isArray(result.pitchesSeen) || result.pitchesSeen.length === 0) return false;

  return result.pitchesSeen.every((pitch) => (
    hasExactKeys(pitch, CORE_TEST_PITCH_KEYS)
    && Number.isInteger(pitch.zone)
    && pitch.zone >= 0
    && pitch.zone <= 9
    && CORE_TEST_PITCH_IDS.has(pitch.pitchId)
  ));
}

export function parseCoreTestResults(serialized) {
  try {
    const parsed = JSON.parse(serialized || "[]");
    return Array.isArray(parsed) ? parsed.filter(isValidCoreTestResult) : [];
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
  if (!isValidCoreTestResult(result)) {
    throw new TypeError("Cannot store an invalid core-test result");
  }

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
      if (!isValidCoreTestResult(result)) {
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
    ? results.filter(isValidCoreTestResult)
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
