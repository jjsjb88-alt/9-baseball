import {useEffect,useState} from 'react';

export const PHASES={
  steady:{label:'정상',note:'공이 아직 살아 있다'},
  shaky:{label:'흔들림',note:'제구가 흔들린다'},
  cornered:{label:'몰림',note:'구속이 떨어졌다'},
  pulled:{label:'강판',note:'마운드를 내려간다'},
};
export const PHASE_ORDER=['steady','shaky','cornered','pulled'];
/* 엔진(pitcher-hp.js)이 쓰는 이름을 UI 이름으로 받아준다. */
export const PHASE_ALIASES={steady:'steady',pressured:'shaky',critical:'cornered',defeated:'pulled'};
export const HP_MARKS=[.6,.3];

export const normalizePhase=phase=>PHASES[phase]?phase:PHASE_ALIASES[phase]||null;
export const phaseFor=(hp,maxHp)=>{
  const max=Number(maxHp)||0,cur=Math.max(0,Math.min(max,Number(hp)||0));
  if(max<=0||cur<=0)return 'pulled';
  const r=cur/max;
  return r>.6?'steady':r>.3?'shaky':'cornered';
};
export const phaseLabel=phase=>PHASES[normalizePhase(phase)]?.label||PHASES.steady.label;

export const VERDICTS={
  hit:'안타',single:'안타',double:'2루타',triple:'3루타',homer:'홈런',homeRun:'홈런',grandSlam:'만루 홈런',
  foul:'파울',hardFoul:'빗맞은 파울',whiff:'헛스윙',called:'루킹 스트라이크',calledStrike:'루킹 스트라이크',strikeout:'삼진',
  ball:'볼',walk:'볼넷',out:'범타 아웃',inPlayOut:'범타 아웃',sacrifice:'희생타',near:'한 칸 차이',nearMiss:'한 칸 차이',
};
export const RESULT_LABELS={choice:'내 선택',pitch:'실제 공',verdict:'야구 판정',hp:'투수 HP'};
export const RESULT_ORDER=['choice','pitch','verdict','hp'];

export const NODE_TYPES={
  battle:{label:'정규전',title:'선발 승부',reward:'카드 드래프트',risk:'3아웃 전에 투수 체력을 0으로 만든다'},
  elite:{label:'강적',title:'라이벌 원정',reward:'보상 후보가 더 넓어진다',risk:'더 높은 체력과 투수 능력치를 상대한다'},
  training:{label:'훈련',title:'타격 훈련',reward:'카드 한 장을 강화한다',risk:'즉시 카드 보상은 없다'},
  locker:{label:'정리',title:'라커룸',reward:'카드 한 장을 제거한다',risk:'덱을 얇게 만드는 선택이다'},
  shop:{label:'영입',title:'전력 보강',reward:'후보 중 카드 한 장을 추가한다',risk:'덱이 두꺼워질 수 있다'},
  rest:{label:'휴식',title:'컨디션 회복',reward:'다음 경기 타격 기술 +8',risk:'즉시 카드 보상은 없다'},
  boss:{label:'결정전',title:'에이스 결정전',reward:'다음 막으로 진출한다',risk:'패배하면 이번 런이 끝난다'},
};
export const nodeType=type=>NODE_TYPES[type]||{label:'미정',title:'미정 구역',reward:'보상 미정',risk:'위험 미정'};

export const MAP_CTA='이 원정으로 간다';
export const MAP_EMPTY='빛나는 노드를 골라 다음 원정을 스카우팅한다.';
export const MAP_DEAD_END='이후 갈래 없음';
export const MAP_HINT='어느 칸이든 미리 볼 수 있고, 닿는 칸만 갈 수 있다.';
export const MAP_LOCKED='아직 닿지 않는 칸이다. 미리 보기만 된다.';
export const MAP_NEXT_ACT='다음 막으로 이어진다';
export const actLabel=act=>`${act}막`;
export const actToggleLabel=(act,open)=>`${actLabel(act)} ${open?'접기':'펼치기'}`;
export const nodeSpeech=(parts,open)=>[
  parts.route?`${parts.route} ${parts.name}`:parts.name,
  parts.sub?`상대 ${parts.sub}`:null,
  `보상 ${parts.reward}`,`위험 ${parts.risk}`,
  open?'갈 수 있다':'아직 갈 수 없다',
].filter(Boolean).join('. ')+'.';

/* 엔진 노드가 들고 오는 상세를 화면 문구로 정리한다. 없으면 타입 기본값으로 떨어진다. */
export function nodeDetail(node,type){
  const opponent=node?.opponent,utility=node?.utility;
  const hp=Number.isFinite(opponent?.maxHp)?`HP ${opponent.maxHp}`:null;
  return {
    route:node?.routeLabel||null,
    badge:opponent?[opponent.name,hp].filter(Boolean).join(' · '):utility?.effect||null,
    facing:node?.preview||(opponent?[opponent.name,opponent.archetype,hp].filter(Boolean).join(' · '):null),
    why:opponent?.threat||utility?.detail||null,
    reward:node?.reward||type.reward,
    risk:node?.risk||type.risk,
  };
}

const plain=value=>value==null||value===''?null:String(value);
export const choiceText=choice=>{
  if(choice==null)return '선택 없음';
  if(typeof choice!=='object')return String(choice);
  return [plain(choice.card||choice.name||choice.label),plain(choice.zone)].filter(Boolean).join(' · ')||'선택 없음';
};
export const pitchText=pitch=>{
  if(pitch==null)return '공 미확인';
  if(typeof pitch!=='object')return String(pitch);
  return [plain(pitch.type||pitch.name||pitch.label),plain(pitch.zone)].filter(Boolean).join(' · ')||'공 미확인';
};
export const verdictText=verdict=>{
  if(verdict==null)return '판정 없음';
  const key=typeof verdict==='object'?verdict.kind||verdict.key:verdict;
  return VERDICTS[key]||plain(typeof verdict==='object'?verdict.label:verdict)||'판정 없음';
};
export const hpChangeText=(hpAfter,damage)=>{
  const after=Math.max(0,Number(hpAfter)||0),hit=Math.max(0,Number(damage)||0);
  return hit>0?`${after+hit} → ${after} (-${hit})`:`${after} 유지`;
};

export function useReducedMotion(){
  const [reduced,setReduced]=useState(false);
  useEffect(()=>{
    const query=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    if(!query)return;
    setReduced(!!query.matches);
    const sync=event=>setReduced(!!event.matches);
    query.addEventListener?.('change',sync);
    return ()=>query.removeEventListener?.('change',sync);
  },[]);
  return reduced;
}

/* 막이 어려워지는 걸 말로만 하지 않는다. 그 막 노드가 들고 온 상대 수치에서 직접 읽어
   1막 대비 무엇이 늘었는지 적는다. 엔진을 import하지 않고 props만 본다. */
export function actStats(items){
  const foes=(items||[]).map(node=>node?.opponent).filter(Boolean);
  if(!foes.length)return null;
  const hp=foes.map(foe=>foe.maxHp).filter(Number.isFinite);
  /* 코스 폭은 상한 9에서 잘리므로 최대치로 재면 막 차이가 안 보인다. 타석이 열릴 때
     실제로 마주하는 시작 코스 수의 하한으로 잰다. */
  const zone=foes.map(foe=>foe.zoneOpen).filter(Number.isFinite);
  if(!hp.length)return null;
  return {fights:foes.length,hpMin:Math.min(...hp),hpMax:Math.max(...hp),zoneOpen:zone.length?Math.min(...zone):null,
    step:foes.find(foe=>foe.escalation)?.escalation||null};
}
export function actDelta(stats,base){
  if(!stats||!base)return null;
  const parts=[];
  /* 엔진이 단계값을 주면 그걸 쓴다. 관측값으로 빼면 아키타입 뽑기 운이 섞여 막마다 숫자가 흔들린다. */
  const step=stats.step,baseStep=base.step;
  if(step&&baseStep){
    if(step.hp>baseStep.hp)parts.push(`상대 HP +${step.hp-baseStep.hp}`);
    if(step.zone>baseStep.zone)parts.push(`쓰는 코스 +${step.zone-baseStep.zone}`);
    if(step.stat>baseStep.stat)parts.push(`투수 기본기 +${step.stat-baseStep.stat}`);
  }else{
    const hp=stats.hpMin-base.hpMin;
    if(hp>0)parts.push(`상대 HP +${hp}`);
    if(stats.zoneOpen!=null&&base.zoneOpen!=null&&stats.zoneOpen>base.zoneOpen)parts.push(`시작 코스 +${stats.zoneOpen-base.zoneOpen}`);
  }
  return parts.join(' · ')||null;
}
export const actNote=stats=>stats?.step?.note||null;
export const actRange=stats=>stats?`HP ${stats.hpMin}~${stats.hpMax}`:null;
