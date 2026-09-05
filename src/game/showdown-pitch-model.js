const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function normalizeDistribution(dist) {
  const total = Object.values(dist).reduce((sum, value) => sum + Math.max(0, value), 0) || 1;
  return Object.fromEntries(
    Object.entries(dist).map(([zone, value]) => [zone, (Math.max(0, value) * 100) / total]),
  );
}

// 목표 존과 제구를 PUBLIC MODEL의 착탄 분포로 바꾼다.
export function computeDistribution(targetZone, control, pitchControlMod) {
  if (targetZone === 9) return { 9: 100 };

  const accuracy = clamp(control * pitchControlMod, 5, 65);
  const dist = { [targetZone]: accuracy };
  const missTotal = 100 - accuracy;
  dist[9] = missTotal * 0.25;

  const row = Math.floor(targetZone / 3);
  const col = targetZone % 3;
  const adjacent = [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ]
    .filter(([nextRow, nextCol]) => nextRow >= 0 && nextRow < 3 && nextCol >= 0 && nextCol < 3)
    .map(([nextRow, nextCol]) => nextRow * 3 + nextCol);
  const each = (missTotal * 0.75) / adjacent.length;
  adjacent.forEach((zone) => {
    dist[zone] = (dist[zone] || 0) + each;
  });
  return dist;
}

// 기만형 투수는 존 밖으로 더 자주 뺀다. 분포에 그 성향을 얹고 다시 정규화한다.
export function applyWasteBias(dist, bias = 0) {
  if (!bias) return dist;
  const next = { ...dist, 9: Math.max(0, (dist[9] || 0) + bias) };
  return normalizeDistribution(next);
}

// 실제 게임의 ROOKIE tell과 ADAPTER/FOX 역이용을 한곳에서 관리한다.
export function buildTrueIntent(publicIntent, { strikes, aiStage, recentAims = [] }) {
  const trueIntent = { ...publicIntent };
  if (strikes >= 2) {
    trueIntent[7] = (trueIntent[7] || 0) + (aiStage === "ROOKIE" ? 45 : aiStage === "ADAPTER" ? 25 : 10);
  }
  if (aiStage !== "ROOKIE") {
    const window = recentAims.slice(aiStage === "FOX" ? -8 : -4);
    window.forEach((zone) => {
      trueIntent[zone] = Math.max(1, (trueIntent[zone] || 0) * (aiStage === "FOX" ? 0.55 : 0.75));
    });
  }
  return normalizeDistribution(trueIntent);
}

export function sampleDistribution(dist, random = Math.random) {
  let roll = random() * 100;
  for (const [zone, weight] of Object.entries(dist)) {
    roll -= weight;
    if (roll <= 0) return Number(zone);
  }
  return Number(Object.keys(dist).at(-1) ?? 9);
}
