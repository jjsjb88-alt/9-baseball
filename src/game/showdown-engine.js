const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// CORE TEST 02의 단일 타격 판정 엔진. 실제 플레이와 자동시뮬이 모두 이 함수를 쓴다.
// CQ는 "맞힐 수 있는가", PQ는 "맞혔을 때 얼마나 강한가"만 담당한다.
export function resolveShowdownContact({
  read = "MISREAD",
  mastered = true,
  modifier = null,
  covered = false,
  pitchPower = 60,
  // 정확히 읽은 공은 최소한 배트에 맞는다. 읽기 성공에서 나오는 헛스윙을 파울로 바꾼다.
  // 읽기와 타격의 분리는 유지된다 - 읽어도 빗맞고 아웃날 수 있다. 다만 "아무 일도 없음"은 없앤다.
  whiffBecomesFoul = false,
  // 커트를 반복해 무한정 버티지 못하게, 이 타석에서 이미 끊은 횟수가 상한을 넘으면 보호가 풀린다.
  cutsThisPa = 0,
  maxProtectedCuts = 3,
  variance = Math.random,
}) {
  const preciseRead = read === "DEEP_READ" || read === "READ";
  const readCQ = { DEEP_READ: 30, READ: 24, COVERED: 12, NEAR_READ: 9, MISREAD: -24, CHASE: -38 }[read] ?? -24;
  const masteryCQ = mastered ? 12 : -13;
  const modifierCQ = modifier === "smash" ? (preciseRead ? -18 : -30) : modifier === "contact" ? 18 : modifier === "cut" ? 4 : 0;
  const cq = clamp(50 + readCQ + masteryCQ + modifierCQ + (covered ? 8 : 0) + (variance() - 0.5) * 28 - pitchPower * 0.08, 0, 100);
  const missChance = clamp(0.64 - cq * 0.0062, 0.05, 0.68);

  if (variance() < missChance) {
    const protectedRead = whiffBecomesFoul && preciseRead && modifier !== "smash" && cutsThisPa < maxProtectedCuts;
    if (protectedRead) {
      return { outcome: "foul", cq, pq: 0, power: 0, whiffSaved: true };
    }
    if (modifier === "cut" && variance() < 0.62) {
      return { outcome: "foul", cq, pq: 0, power: 0 };
    }
    return { outcome: "swingMiss", cq, pq: 0, power: 0 };
  }

  const readPQ = read === "DEEP_READ" ? 24 : read === "READ" ? 16 : read === "COVERED" ? -10 : read === "NEAR_READ" ? -5 : -18;
  // POWER는 읽기 자체를 대신하지 않는다. 정확히 읽었을 때만 큰 PQ를 얻는다.
  const modifierPQ = modifier === "smash" && preciseRead ? 20 : modifier === "contact" ? -24 : 0;
  const pq = clamp(46 + readPQ + modifierPQ + (mastered ? 8 : -8) + (covered ? -18 : 0) + (variance() - 0.5) * 30, 0, 110);

  if (variance() < clamp(0.50 - cq * 0.003, 0.16, 0.48)) return { outcome: "out", cq, pq, power: pq / 100 };
  if (pq >= 82 && variance() < clamp((pq - 70) / 165, 0.03, 0.25)) return { outcome: "homerun", cq, pq, power: pq / 100 };
  if (pq >= 67 && variance() < 0.27) return { outcome: "double", cq, pq, power: pq / 100 };
  if (pq >= 88 && variance() < 0.05) return { outcome: "triple", cq, pq, power: pq / 100 };
  return { outcome: "single", cq, pq, power: pq / 100 };
}
