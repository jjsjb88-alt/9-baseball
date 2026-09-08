// Run progression consumes outcomes from showdown-engine; it never rolls contact.
export const RUN_SAVE_KEY = '9zone-run-v1';
export const RUN_STAGES = [
  { name: '첫 번째 조명', pitcher: 'THE ROOKIE', ai: 'ROOKIE', target: 3, power: 48, hint: '첫 공보다 두 스트라이크 이후의 반복을 기억하세요.' },
  { name: '다시 만난 신인', pitcher: 'ROOKIE · REMATCH', ai: 'ROOKIE', target: 4, power: 55, hint: '앞 경기의 관찰 기록이 남아 있습니다. 읽은 코스에 더 크게 걸어 보세요.' },
  { name: '상대도 기억한다', pitcher: 'THE ADAPTER', ai: 'ADAPTER', target: 4, power: 60, hint: '같은 곳을 계속 노리면 상대도 배웁니다. 최근 선택을 되돌아보세요.' },
  { name: '습관의 대가', pitcher: 'ADAPTER · REMATCH', ai: 'ADAPTER', target: 5, power: 64, hint: '익숙한 코스와 새로운 코스. 손패를 어디에 쓸지 결정하세요.' },
  { name: '여우의 초대', pitcher: 'THE FOX', ai: 'FOX', target: 5, power: 68, hint: '긴 기억을 가진 상대입니다. 공개 확률과 당신의 습관을 함께 살피세요.' },
  { name: '마지막 한 수', pitcher: 'FOX · FINAL', ai: 'FOX', target: 6, power: 72, hint: '최종전은 목표를 넘어야 우승합니다. 남은 타석과 필요한 루를 확인하세요.' },
];
export const RUN_PA_PER_STAGE = 8;
export const RUN_START_ZONES = [1, 3, 4, 7];
export const RUN_ZONE_NAMES = ['좌상', '중상', '우상', '좌중', '정중', '우중', '좌하', '중하', '우하'];
const values = { walk: 1, single: 1, double: 2, triple: 3, homerun: 4 };
const validCard = c => c && (c.tier == null || [1,2,3].includes(c.tier)) && (c.kind === 'zone'
  ? Number.isInteger(c.zone) && c.zone >= 0 && c.zone <= 8 && ['normal','contact','power'].includes(c.style)
  : c.kind === 'mod' ? ['smash','pushHit','cut'].includes(c.mod) : c.kind === 'tactic' && ['compress','hide'].includes(c.type));

export function createRun(deck, now = Date.now()) {
  return { version: 1, startedAt: now, elapsedMs: 0, stage: 0, status: 'intro', lives: 3,
    pa: 0, points: 0, balls: 0, strikes: 0, paPitches: 0, deck,
    pitches: 0, hits: 0, walks: 0, homeRuns: 0, reads: 0, deepReads: 0, totalPoints: 0,
    lastOutcome: null, results: [], rewards: [], history: [], aims: [] };
}

export function enterRunStage(run) {
  if (run.status !== 'intro') return run;
  return { ...run, status: 'playing' };
}

export function recordRunPitch(run, outcome, { read = null, zone = 9, pitchId = 'fastball' } = {}) {
  if (run.status !== 'playing') return run;
  let balls = run.balls, strikes = run.strikes, final = null;
  if (outcome === 'ball') { balls += 1; if (balls === 4) final = 'walk'; }
  else if (outcome === 'strike' || outcome === 'swingMiss') { strikes += 1; if (strikes === 3) final = 'strikeout'; }
  else if (outcome === 'foul') strikes = Math.min(2, strikes + 1);
  else if (outcome === 'out' || Object.hasOwn(values, outcome)) final = outcome;
  else throw new Error(`Unknown run outcome: ${outcome}`);
  // A prolonged PA is a visible walk award, never a silent simulated out.
  if (!final && run.paPitches + 1 >= 12) final = 'walk';
  const points = run.points + (values[final] || 0);
  return { ...run, balls: final ? 0 : balls, strikes: final ? 0 : strikes,
    paPitches: final ? 0 : run.paPitches + 1, pa: run.pa + (final ? 1 : 0),
    points, totalPoints: run.totalPoints + (values[final] || 0),
    pitches: run.pitches + 1, hits: run.hits + (['single', 'double', 'triple', 'homerun'].includes(final) ? 1 : 0),
    walks: run.walks + (final === 'walk' ? 1 : 0), homeRuns: run.homeRuns + (final === 'homerun' ? 1 : 0),
    reads: run.reads + (['READ', 'DEEP_READ'].includes(read) ? 1 : 0), deepReads: run.deepReads + (read === 'DEEP_READ' ? 1 : 0),
    lastOutcome: final || outcome, status: final ? 'atbat' : 'playing',
    history: [...run.history, { zone, pitchId, balls: run.balls, strikes: run.strikes, stage: run.stage }].slice(-48) };
}

export function continueRun(run) {
  if (run.status !== 'atbat') return run;
  if (run.pa < RUN_PA_PER_STAGE) return { ...run, status: 'playing' };
  const cleared = run.points >= RUN_STAGES[run.stage].target;
  const lives = run.lives - (cleared ? 0 : 1);
  const final = run.stage === RUN_STAGES.length - 1;
  return { ...run, lives, status: lives <= 0 || (final && !cleared) ? 'lost' : final ? 'won' : 'reward',
    results: [...run.results, { stage: run.stage, points: run.points, cleared }] };
}

export function runRewardOptions(run) {
  const zones = new Set(run.deck.filter(c => c.kind === 'zone').map(c => c.zone));
  const nextZone = [6, 8, 0, 2, 5].find(z => !zones.has(z));
  const upgrade = run.deck.find(c => c.kind === 'zone' && (c.tier || 1) < 3);
  return [
    ...(nextZone === undefined ? [] : [{ id: 'zone', title: `${RUN_ZONE_NAMES[nextZone]} 숙련`, detail: '새 숙련존 카드 1장. 덱은 두꺼워지지만 노릴 수 있는 코스가 늘어납니다.', zone: nextZone }]),
    ...(upgrade ? [{ id: 'upgrade', title: `${RUN_ZONE_NAMES[upgrade.zone]} 카드 강화`, detail: '기존 카드 1장 강화. 그 카드로 스윙할 때 CQ +3 / PQ +2. 최대 3등급.', index: run.deck.indexOf(upgrade) }] : []),
    { id: 'recover', title: run.lives < 3 ? '클럽하우스에서 회복' : '집중 훈련', detail: run.lives < 3 ? '도전 기회 1 회복. 최대 3.' : '다음 라운드 시작 집중 +3. 덱은 그대로 유지합니다.' },
  ];
}

export function chooseRunReward(run, id) {
  if (run.status !== 'reward') return run;
  const choice = runRewardOptions(run).find(c => c.id === id);
  if (!choice) return run;
  const deck = run.deck.map(c => ({ ...c }));
  if (id === 'zone') deck.push({ kind: 'zone', zone: choice.zone, style: 'normal', mastered: true });
  if (id === 'upgrade') deck[choice.index].tier = (deck[choice.index].tier || 1) + 1;
  return { ...run, stage: run.stage + 1, status: 'intro', pa: 0, points: 0, deck,
    lives: id === 'recover' ? Math.min(3, run.lives + 1) : run.lives,
    startFocus: id === 'recover' && run.lives === 3 ? 3 : 0,
    rewards: [...run.rewards, choice.title], checkpoint: null };
}

export function readSavedRun(storage) {
  const raw = storage.getItem(RUN_SAVE_KEY);
  if (!raw) return null;
  const r = JSON.parse(raw);
  if (r?.version !== 1 || !Number.isInteger(r.stage) || !RUN_STAGES[r.stage]
    || !['intro', 'playing', 'atbat', 'reward', 'won', 'lost'].includes(r.status)
    || !Number.isInteger(r.pa) || r.pa < 0 || r.pa > RUN_PA_PER_STAGE
    || !Number.isInteger(r.lives) || r.lives < 0 || r.lives > 3
    || !Number.isInteger(r.balls) || r.balls < 0 || r.balls > 3
    || !Number.isInteger(r.strikes) || r.strikes < 0 || r.strikes > 2
    || !Array.isArray(r.deck) || !r.deck.length || r.deck.length > 30
    || !r.deck.every(validCard)
    || !Number.isInteger(r.paPitches) || r.paPitches < 0 || r.paPitches > 11
    || !['history', 'aims', 'results', 'rewards'].every(k => Array.isArray(r[k]))
    || !['elapsedMs','points','pitches','hits','walks','homeRuns','reads','deepReads','totalPoints'].every(k => Number.isFinite(r[k]) && r[k] >= 0)) {
    throw new Error('저장된 런 형식을 읽을 수 없습니다.');
  }
  if (!r.history.every(p=>p && Number.isInteger(p.zone) && p.zone>=0 && p.zone<=9 && ['fastball','slider','curve','change'].includes(p.pitchId))
    || !r.aims.every(z=>Number.isInteger(z) && z>=0 && z<=8)
    || !r.rewards.every(x=>typeof x==='string')
    || !r.results.every(x=>x && RUN_STAGES[x.stage] && Number.isFinite(x.points) && typeof x.cleared==='boolean')
    || (r.checkpoint && (!['hand','deck','discard'].every(k=>Array.isArray(r.checkpoint[k]) && r.checkpoint[k].every(validCard))
      || !Number.isFinite(r.checkpoint.focus) || r.checkpoint.focus<0
      || r.checkpoint.hand.length+r.checkpoint.deck.length+r.checkpoint.discard.length !== r.deck.length))) {
    throw new Error('저장된 런의 카드 또는 투구 기록이 손상됐습니다.');
  }
  return r;
}
