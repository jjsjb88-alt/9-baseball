// 런(1회 플레이) 구조.
// 이닝은 없다. 아웃 3개가 곧 목숨이고, 그 안에서 세 투수의 체력을 깎아 내려간다.
//   1막 독립리그  — 일반 투수
//   2막 퓨처스리그 — 엘리트 투수
//   3막 1부리그   — 보스 투수
// 막을 깰 때마다 보상 하나를 고른다: 카드 한 장 또는 아웃 1개 회복.

export const MAX_OUTS = 3;

export const ACTS = [
  {
    act: 1,
    league: "독립리그",
    tier: "일반 투수",
    pitcherName: "무명 좌완",
    hp: 50,
    aiStage: "ROOKIE",
    control: 62,
    stuff: 52,
    intro: "구속도 제구도 평범하다. 습관이 그대로 드러난다.",
  },
  {
    act: 2,
    league: "퓨처스리그",
    tier: "엘리트 투수",
    pitcherName: "1지명 유망주",
    hp: 80,
    aiStage: "ADAPTER",
    control: 74,
    stuff: 66,
    intro: "내가 노린 코스를 기억한다. 같은 수는 두 번 통하지 않는다.",
  },
  {
    act: 3,
    league: "1부리그",
    tier: "보스 투수",
    pitcherName: "리그 에이스",
    hp: 115,
    aiStage: "FOX",
    control: 85,
    stuff: 80,
    intro: "읽히는 것을 알고 역이용한다. 한 번의 오독이 런을 끝낸다.",
  },
];

// 결과가 투수 체력을 얼마나 깎는가. 커트(파울)도 조금씩 깎인다 — 끈질기게 물고 늘어지는 것도 공격이다.
export const HP_DAMAGE = {
  homerun: 30,
  triple: 22,
  double: 18,
  single: 12,
  walk: 6,
  ball: 2,
  foul: 1,
  out: 0,
  strike: 0,
  swingMiss: 0,
};

// 주자가 홈을 밟으면 추가 타격. 주자를 모아서 한 번에 터뜨리는 선택에 값을 준다.
export const RUN_SCORED_DAMAGE = 8;

export const OUT_OUTCOMES = new Set(["out", "strikeout"]);

export function actAt(index) {
  return ACTS[Math.max(0, Math.min(ACTS.length - 1, index))];
}

export function createRun() {
  return {
    actIndex: 0,
    hp: ACTS[0].hp,
    outs: 0,
    damageDealt: 0,
    actsCleared: 0,
    // "playing" | "actClear" | "victory" | "defeat"
    status: "playing",
  };
}

export function currentAct(run) {
  return actAt(run.actIndex);
}

export function damageFor(outcome, runsScored = 0) {
  return (HP_DAMAGE[outcome] ?? 0) + Math.max(0, runsScored) * RUN_SCORED_DAMAGE;
}

// 한 결과를 런에 적용한다. 화면과 시뮬레이터가 같은 함수를 쓴다.
export function applyRunOutcome(run, { outcome, runsScored = 0, strikeoutEndsPa = false }) {
  if (run.status !== "playing") return { run, damage: 0, actCleared: false, runOver: false };

  const damage = damageFor(outcome, runsScored);
  const isOut = OUT_OUTCOMES.has(outcome) || strikeoutEndsPa;
  const hp = Math.max(0, run.hp - damage);
  const outs = Math.min(MAX_OUTS, run.outs + (isOut ? 1 : 0));

  const next = { ...run, hp, outs, damageDealt: run.damageDealt + damage };

  // 투수를 먼저 눕혔으면 그 타석의 아웃보다 격파가 우선한다.
  if (hp <= 0) {
    const lastAct = run.actIndex >= ACTS.length - 1;
    next.actsCleared = run.actsCleared + 1;
    next.status = lastAct ? "victory" : "actClear";
    return { run: next, damage, actCleared: true, runOver: lastAct };
  }

  if (outs >= MAX_OUTS) {
    next.status = "defeat";
    return { run: next, damage, actCleared: false, runOver: true };
  }

  return { run: next, damage, actCleared: false, runOver: false };
}

export const REWARDS = ["card", "heal"];

// 막 보상을 고르고 다음 막으로 넘어간다. "heal"은 아웃 1개를 되돌린다.
export function takeRewardAndAdvance(run, reward) {
  if (run.status !== "actClear") return run;
  const outs = reward === "heal" ? Math.max(0, run.outs - 1) : run.outs;
  const actIndex = Math.min(ACTS.length - 1, run.actIndex + 1);
  return { ...run, actIndex, hp: ACTS[actIndex].hp, outs, status: "playing" };
}

export function runSummary(run) {
  const act = currentAct(run);
  return {
    act: act.act,
    league: act.league,
    tier: act.tier,
    pitcherName: act.pitcherName,
    hp: run.hp,
    maxHp: act.hp,
    hpPercent: act.hp > 0 ? (run.hp / act.hp) * 100 : 0,
    outsLeft: Math.max(0, MAX_OUTS - run.outs),
    status: run.status,
  };
}
