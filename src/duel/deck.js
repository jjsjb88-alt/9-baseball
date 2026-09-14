// Deck analysis shared by the engine, the reward screen and the save validator.
// Every relation restates an engine rule that already existed in v6 — see docs/DECK.md §1.
import {CARDS,ROLES,AXES,AXIS_NAMES,GROWTHS,cardPower,canUpgrade,rewardChoices,DECK_MIN,DECK_MAX,
  RELIC_OFFERS,READ_LEVELS,READ_THRESHOLDS,observeScore} from './cards.js';

const shapeOf=e=>CARDS[e?.kind]?.shape||null;
const WIDE=['row','column','cross','all'];

// from → to relations. `plus:true` means the relation only exists once the source card is upgraded.
export const SYNERGIES=[
  {from:'scout',plus:false,match:e=>shapeOf(e)==='row',why:'확인한 높이의 가로 3존은 곧 적중'},
  {from:'scout',plus:true,match:e=>shapeOf(e)==='column',why:'강화 관찰의 열 정보를 세로 3존이 받는다'},
  {from:'lure',plus:false,match:e=>shapeOf(e)==='point',why:'1존이 십자 5존으로 넓어진다'},
  {from:'setup',plus:false,match:e=>cardPower(e)>0,why:'집중은 장타 계열에서 값이 가장 크다'},
  {from:'flow',plus:false,match:e=>e?.kind==='rally',why:'기존 주자 2베이스 + 사인 1베이스'},
];
export const CONFLICTS=[
  {from:'lure',plus:false,match:e=>WIDE.includes(shapeOf(e)),why:'커버가 더 넓어져 파워가 그만큼 깎인다'},
  {from:'bunt',plus:false,match:e=>false,why:''},
];

export function deckProfile(deck){
  const entries=Array.isArray(deck)?deck.filter(e=>e&&CARDS[e.kind]):[];
  const axes=Object.fromEntries(AXES.map(([k])=>[k,0]));
  const roles=Object.fromEntries(ROLES.map(k=>[k,0]));
  const counts={};
  let prepare=0,swing=0,plus=0,power=0;
  for(const e of entries){
    const c=CARDS[e.kind];
    if(c.type==='skill')prepare++;else{swing++;power+=cardPower(e);}
    if(c.shape)axes[c.shape]++;
    if(c.role in roles)roles[c.role]++;
    if(e.plus)plus++;
    counts[e.kind]=(counts[e.kind]||0)+1;
  }
  const duplicates=Object.entries(counts).filter(([,n])=>n>1).map(([kind,n])=>({kind,n})).sort((a,b)=>b.n-a.n||a.kind.localeCompare(b.kind));
  return {total:entries.length,prepare,swing,plus,power,axes,roles,counts,duplicates,
    wide:axes.row+axes.column+axes.cross+axes.all,point:axes.point};
}

// Reads as "what is my deck missing", never as "press this". Order is severity, not importance.
export function diagnose(deck,growth){
  const p=deckProfile(deck),out=[],g=growth||{};
  const rowOnly=deck.filter(e=>e.kind==='scout'&&!e.plus).length;
  if(rowOnly>=2&&p.axes.row<=1)
    out.push({level:'warn',text:`관찰 ${rowOnly}장이 행 정보를 주는데, 그 정보를 쓰는 가로 3존 카드가 ${p.axes.row}장뿐입니다.`});
  if(p.wide>=6&&p.roles.장타===0)
    out.push({level:'warn',text:`넓은 범위 ${p.wide}장에 전용 장타 카드가 없습니다. 단타·주루 중심으로 득점할지, 장타 카드를 보완할지 비교하세요.`});
  if(p.prepare>p.swing)
    out.push({level:'warn',text:`준비 ${p.prepare}장 · 스윙 ${p.swing}장. 준비는 타석당 2회뿐이라 손패에 남기 쉽습니다. 스윙 비율을 비교하세요.`});
  if(g.patience>0&&p.wide>=5)
    out.push({level:'warn',text:`기다림 사용 중에는 커버가 1존으로 강제됩니다. 넓은 범위 ${p.wide}장의 범위가 그동안 무효가 됩니다.`});
  const eye=observeScore(deck),lv=eye>=READ_THRESHOLDS[1]?2:eye>=READ_THRESHOLDS[0]?1:0;
  if(lv<2)
    out.push({level:lv?'info':'warn',text:`관찰 점수 ${eye} · 읽기 ${READ_LEVELS[lv].name}. ${lv?`관찰 ${READ_THRESHOLDS[1]-eye}점을 더 모으면 정확한 확률이 보입니다.`:`관찰 ${READ_THRESHOLDS[0]-eye}점을 더 모으면 대략 구간이 보입니다.`} 유물 낡은 망원경도 한 단계를 올립니다.`});
  if(p.roles.진루===0)
    out.push({level:'info',text:'주자를 적극적으로 보낼 카드가 없습니다. 득점은 장타와 연속 안타에 의존합니다.'});
  const heavy=p.duplicates.find(d=>d.n>=4);
  if(heavy)out.push({level:'info',text:`${CARDS[heavy.kind].name} ${heavy.n}장. 손패가 단조로워지는 대신 노림이 안정됩니다.`});
  if(p.total<=DECK_MIN+1)out.push({level:'info',text:`덱 ${p.total}장. 얇은 덱은 핵심 카드가 자주 돌아옵니다.`});
  if(p.total>=DECK_MAX-1)out.push({level:'info',text:`덱 ${p.total}장. 두꺼운 덱은 원하는 카드를 뽑을 확률이 낮습니다.`});
  return out;
}

export function applyRewardToDeck(deck,action,nextId){
  const base=Array.isArray(deck)?deck.slice():[];
  if(!action||action.type==='skip')return {deck:base,nextId};
  if(action.type==='add')return {deck:[...base,{id:'c'+nextId,kind:action.kind}],nextId:nextId+1};
  if(action.type==='remove')return {deck:base.filter(c=>c.id!==action.id),nextId};
  if(action.type==='upgrade')return {deck:base.map(c=>c.id===action.id?{...c,plus:true}:c),nextId};
  return {deck:base,nextId};
}

// One rule set for the engine, the UI's disabled states and readDuel. Returns null when the action is legal.
export function rewardProblem(deck,action,stage,growthKey,relics){
  if(!action||!action.type)return '보상 행동을 선택하세요.';
  const entries=Array.isArray(deck)?deck:[];
  if(action.type==='skip')return null;
  if(action.type==='relic'){
    if(!(RELIC_OFFERS[stage]||[]).includes(action.kind))return '이번 보상의 유물이 아닙니다.';
    if((relics||[]).includes(action.kind))return '이미 가진 유물입니다.';
    return null;
  }
  if(action.type==='add'){
    if(!rewardChoices(stage,growthKey).includes(action.kind))return '이번 보상의 후보가 아닙니다.';
    if(entries.length>=DECK_MAX)return `덱은 ${DECK_MAX}장을 넘을 수 없습니다. 먼저 카드를 제거하세요.`;
    return null;
  }
  const target=entries.find(c=>c.id===action.id);
  if(action.type==='remove'){
    if(!target)return '덱에 없는 카드입니다.';
    if(entries.length<=DECK_MIN)return `덱은 ${DECK_MIN}장 아래로 내려갈 수 없습니다.`;
    return null;
  }
  if(action.type==='upgrade'){
    if(!target)return '덱에 없는 카드입니다.';
    if(!canUpgrade(target))return target.plus?'이미 강화한 카드입니다.':'강화할 수 없는 카드입니다.';
    return null;
  }
  return '알 수 없는 보상 행동입니다.';
}

// Before/after for the reward screen. Only changed rows are returned, so nothing reads as noise.
export function profileDelta(before,after){
  const a=deckProfile(before),b=deckProfile(after),rows=[];
  const push=(label,x,y)=>{if(x!==y)rows.push({label,from:x,to:y,delta:y-x});};
  push('덱 장수',a.total,b.total);
  push('스윙',a.swing,b.swing);
  push('준비',a.prepare,b.prepare);
  for(const [key,name] of AXES)push(name,a.axes[key],b.axes[key]);
  for(const role of ROLES)push(role,a.roles[role],b.roles[role]);
  push('강화',a.plus,b.plus);
  push('파워 합',a.power,b.power);
  return rows;
}

// What the hand should say about a card while another one is picked up.
export function relationsFor(source,entries){
  const out=new Map();
  if(!source)return out;
  const add=(entry,kind,why)=>{if(entry.id!==source.id&&!out.has(entry.id))out.set(entry.id,{kind,why});};
  for(const rule of SYNERGIES){
    if(rule.from!==source.kind||(rule.plus&&!source.plus))continue;
    for(const e of entries)if(rule.match(e))add(e,'synergy',rule.why);
  }
  for(const rule of CONFLICTS){
    if(rule.from!==source.kind||(rule.plus&&!source.plus))continue;
    for(const e of entries)if(rule.match(e))add(e,'conflict',rule.why);
  }
  return out;
}

// Growth-driven conflicts depend on live battle state, not on the deck alone.
export function growthConflict(entry,growthMode){
  if(growthMode!=='patience')return null;
  const shape=shapeOf(entry);
  if(!shape||shape==='point'||shape==='all')return null;
  return `기다림 사용 중에는 커버가 1존으로 강제돼 ${AXIS_NAMES[shape]} 범위가 무효입니다.`;
}
