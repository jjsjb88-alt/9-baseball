// BET 미리보기 전용 순수 모듈.
// 화면(바텀시트)과 실제 판정이 "무엇을 커버했는가"를 같은 함수로 계산한다.
// 미리보기용 근사식을 따로 두면 화면 숫자와 판정이 갈라지므로 금지한다.

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// 두 zone 사이 그리드 거리. 존 밖(9)은 항상 멀다.
export function zoneDistance(a, b) {
  if (a === b) return 0;
  if (a === 9 || b === 9) return 2.5;
  const ca = a % 3, ra = Math.floor(a / 3);
  const cb = b % 3, rb = Math.floor(b / 3);
  return Math.hypot(ca - cb, ra - rb);
}

export const ADJACENT_DISTANCE = 1.5;

// 폭·수식어가 실제로 커버하는 존 목록. userGuess의 적중 판정과 미리보기가 이 함수를 공유한다.
export function coveredZones(zones, mod = null) {
  const base = zones.map(Number).filter((z) => Number.isInteger(z));
  if (mod !== "pushHit") return [...new Set(base)];
  const expanded = base.flatMap((z) => [
    z,
    ...[0, 1, 2, 3, 4, 5, 6, 7, 8].filter((other) => zoneDistance(z, other) <= ADJACENT_DISTANCE),
  ]);
  return [...new Set(expanded)];
}

// 판정에서 쓰는 장타 배율과 같은 값이다. 한 곳에서만 정의한다.
export const WIDE_HR_MULT = 0.55;   // 존 2장 = 넓게 커버
export const PUSH_HR_MULT = 0.72;   // 밀어치기
export const SMASH_HR_MULT = 1.35;  // 강타
export const ZONE_MULT_BASELINE = 65; // zoneRating 65를 배율 1.0으로 본다
export const WEAK_ZONE_MULT = 0.9;    // 이 아래면 약점 존 경고

export function zoneMultiplier(rating) {
  return clamp(Number(rating ?? ZONE_MULT_BASELINE) / ZONE_MULT_BASELINE, 0.3, 2);
}

// 폭 배율: 넓게 커버할수록 타구가 죽는다.
export function widthMultiplier({ zoneCount, mod }) {
  return (zoneCount >= 2 ? WIDE_HR_MULT : 1) * (mod === "pushHit" ? PUSH_HR_MULT : 1) * (mod === "smash" ? SMASH_HR_MULT : 1);
}

// 바텀시트에 띄우는 세 숫자. 전부 정직한 값만 쓴다.
//   적중 예상 % = PUBLIC 분포에서 커버 영역 합 (조건부 확률은 알려주지 않는다)
//   데미지 배율 = 폭 배율 × 존 배율 (확정값)
//   약점 경고   = 존 배율 0.9 미만이 커버에 포함될 때
// READ 등급(DEEP READ 여부)은 정답 노출이므로 절대 계산하지 않는다.
export function previewBet({ publicDist = {}, zones = [], mod = null, styleHrMult = 1, zoneRating = [] }) {
  const picked = zones.map(Number).filter((z) => Number.isInteger(z));
  const covered = coveredZones(picked, mod);
  const hitPct = clamp(
    covered.reduce((sum, zone) => sum + (Number(publicDist[zone]) || 0), 0),
    0,
    100,
  );
  const weights = covered.map((zone) => Number(publicDist[zone]) || 0);
  const weightTotal = weights.reduce((a, b) => a + b, 0);
  const zoneMults = covered.map((zone) => zoneMultiplier(zoneRating[zone]));
  const zoneMult = weightTotal > 0
    ? zoneMults.reduce((sum, mult, i) => sum + mult * weights[i], 0) / weightTotal
    : zoneMults.reduce((sum, mult) => sum + mult, 0) / (zoneMults.length || 1);
  const damageMult = widthMultiplier({ zoneCount: picked.length, mod }) * styleHrMult * (zoneMult || 1);
  const weakZones = covered
    .map((zone) => ({ zone, mult: zoneMultiplier(zoneRating[zone]) }))
    .filter((entry) => entry.mult < WEAK_ZONE_MULT)
    .sort((a, b) => a.mult - b.mult);
  return {
    width: picked.length,
    covered,
    hitPct: Math.round(hitPct),
    damageMult: Math.round(damageMult * 100) / 100,
    weakZones,
  };
}
