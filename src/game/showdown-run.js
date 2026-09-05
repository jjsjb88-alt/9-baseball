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
    trait: null, // 지금 상대의 특성. 1막은 특성 없이 시작한다.
    // "playing" | "actClear" | "victory" | "defeat"
    status: "playing",
  };
}

export function currentAct(run) {
  return actWithTrait(run.actIndex, run.trait);
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

// ===== 투수 특성 =====
// 다음 상대가 어떤 투수인지 경로 선택 화면에서 미리 드러난다. 고르는 순간 각오가 정해진다.
export const PITCHER_TRAITS = {
  control: { id: "control", name: "제구파", tell: "존 구석만 집요하게 노린다", control: 10, stuff: -8, waste: 0, hp: 0 },
  power: { id: "power", name: "파워형", tell: "구위로 찍어누른다", control: -8, stuff: 14, waste: 0, hp: 0 },
  deceive: { id: "deceive", name: "기만형", tell: "유인구가 유난히 많다", control: -4, stuff: -2, waste: 14, hp: -6 },
  grinder: { id: "grinder", name: "완급형", tell: "맞춰 잡고 오래 버틴다", control: 4, stuff: 2, waste: 0, hp: 16 },
};
export const TRAIT_IDS = Object.keys(PITCHER_TRAITS);

// 특성이 붙은 막. 화면과 시뮬레이터가 이 함수 하나로 실제 상대 수치를 얻는다.
export function actWithTrait(index, traitId) {
  const act = actAt(index);
  const trait = PITCHER_TRAITS[traitId];
  if (!trait) return { ...act, trait: null };
  return {
    ...act,
    trait,
    pitcherName: `${trait.name} ${act.pitcherName}`,
    control: Math.max(20, act.control + trait.control),
    stuff: Math.max(20, act.stuff + trait.stuff),
    wasteBias: trait.waste,
    hp: Math.max(20, act.hp + trait.hp),
  };
}

// ===== 경로 =====
// 막을 깰 때마다 두 갈래 중 하나를 고른다. 각 갈래에는 들를 곳 하나와 다음 상대가 붙어 있다.
export const ROUTE_NODES = {
  train: { id: "train", name: "훈련소", detail: "카드 3장 중 1장" },
  rest: { id: "rest", name: "휴식처", detail: "아웃 1개 회복" },
  shop: { id: "shop", name: "상점", detail: "집중으로 카드 사고 덱 다듬기" },
};
export const ROUTE_NODE_IDS = Object.keys(ROUTE_NODES);

// 두 갈래는 서로 다른 들를 곳과 서로 다른 투수 특성을 갖는다 - 선택이 성립하려면 달라야 한다.
export function rollRoutes(run, random = Math.random) {
  const nextIndex = Math.min(ACTS.length - 1, run.actIndex + 1);
  const pick = (pool) => pool[Math.floor(random() * pool.length) % pool.length];
  const firstNode = pick(ROUTE_NODE_IDS);
  const secondNode = pick(ROUTE_NODE_IDS.filter((id) => id !== firstNode));
  const firstTrait = pick(TRAIT_IDS);
  const secondTrait = pick(TRAIT_IDS.filter((id) => id !== firstTrait));
  return [
    { node: firstNode, trait: firstTrait, act: actWithTrait(nextIndex, firstTrait) },
    { node: secondNode, trait: secondTrait, act: actWithTrait(nextIndex, secondTrait) },
  ];
}

// 고른 갈래로 넘어간다. 들를 곳의 효과(휴식)는 여기서 바로 적용하고, 카드·상점은 화면이 처리한다.
export function takeRoute(run, route) {
  if (run.status !== "actClear" || !route) return run;
  const outs = route.node === "rest" ? Math.max(0, run.outs - 1) : run.outs;
  const actIndex = Math.min(ACTS.length - 1, run.actIndex + 1);
  const act = actWithTrait(actIndex, route.trait);
  return { ...run, actIndex, trait: route.trait, hp: act.hp, outs, status: "playing" };
}

// 옛 보상 화면 경로. 런 시뮬레이터가 아직 쓴다(카드·상점 가치는 봇이 모델링하지 못한다).
export function takeRewardAndAdvance(run, reward) {
  if (run.status !== "actClear") return run;
  const outs = reward === "heal" ? Math.max(0, run.outs - 1) : run.outs;
  const actIndex = Math.min(ACTS.length - 1, run.actIndex + 1);
  return { ...run, actIndex, trait: null, hp: ACTS[actIndex].hp, outs, status: "playing" };
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
