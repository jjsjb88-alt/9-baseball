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
  battle:{label:'전투',title:'투수 상대',reward:'카드 한 장을 얻는다',risk:'아웃 카운트를 쓴다'},
  elite:{label:'강적',title:'강적 투수',reward:'희귀 카드 한 장을 얻는다',risk:'아웃 카운트를 크게 쓴다'},
  training:{label:'훈련',title:'훈련장',reward:'카드 한 장을 강화한다',risk:'한 칸을 쓴다'},
  locker:{label:'라커룸',title:'라커룸',reward:'약한 카드를 뺀다',risk:'한 칸을 쓴다'},
  shop:{label:'장비점',title:'장비점',reward:'장비 하나를 산다',risk:'모은 자금을 쓴다'},
  rest:{label:'휴식',title:'벤치 휴식',reward:'아웃 카운트를 되돌린다',risk:'보상을 받지 못한다'},
  boss:{label:'보스',title:'에이스 등판',reward:'막 보상을 받는다',risk:'한 번 지면 경기가 끝난다'},
};
export const nodeType=type=>NODE_TYPES[type]||{label:'미정',title:'미정 구역',reward:'보상 미정',risk:'위험 미정'};

export const MAP_CTA='이 경로로 간다';
export const MAP_EMPTY='칸을 고르면 무엇을 얻고 무엇을 지불하는지 먼저 보여준다.';
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
