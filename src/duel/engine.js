import {CARDS,SAVE_KEY,STAGES,LINEUP,BUILDS,ZONES,GROWTHS,growthCost,rewardChoices,cardPower,cardText,DECK_MIN,DECK_MAX,
  ZONE_ORDER,WIDEN_EVERY,PUTAWAY_REACH,READ_THRESHOLDS,observeScore,RELICS,RELIC_OFFERS,DECKBUILDER_BUILD,FACILITY_ROUTES,ROUTE_CHOICES,routeChoice,canUpgrade} from './cards.js';
import {applyRewardToDeck,rewardProblem} from './deck.js';
const clone=s=>JSON.parse(JSON.stringify(s));
const card=(s,id)=>s.deck.find(c=>c.id===id);
const unit=(s,key)=>{s[key]=(Math.imul(s[key],1664525)+1013904223)>>>0;return s[key]/4294967296;};
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export const currentBatter=s=>LINEUP[s.battle.batterIndex];
const playerName=id=>LINEUP.find(p=>p.id===id)?.name||'선수';
function shuffle(s,a){for(let i=a.length-1;i>0;i--){const j=Math.floor(unit(s,'seed')*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function draw(s,n){const b=s.battle;while(n-->0&&b.hand.length<9){if(!b.draw.length)b.draw=shuffle(s,b.discard.splice(0));if(!b.draw.length)break;b.hand.push(b.draw.pop());}}

// PUBLIC is the actual sampling distribution. No false odds, no input-dependent reroll.
// V10 opponents advertise their actual pitch identity on the map; V9 keeps stage defaults.
const v10Opponent=s=>s?.version===10?s.v10?.opponent:null;
/* V10 주자·멘탈 (2026-09-26)
   - 주자 압박: 안타 직전 루상 주자 1명당 기본 피해 +10%.
   - 멘탈: 실점 1점당 흔들림 +1. 흔들림 단계마다 볼 비중 +35%, 1단계 이상이면 읽기 +1.
     득점 없이 끝난 타석마다 1단계 회복. 막이 오를수록 상한이 낮아 멘탈이 단단하다(1막 3 · 2막 2 · 3막 1). */
export const V10_RUNNER_PRESSURE=.10;
export const V10_MENTAL=Object.freeze({ballBoost:.35,capByAct:Object.freeze({1:3,2:2,3:1})});
export const v10MentalCap=s=>V10_MENTAL.capByAct[v10Opponent(s)?.act]??V10_MENTAL.capByAct[1];
export const v10Shaken=s=>s?.version===10&&Number.isInteger(s.battle?.shaken)?Math.max(0,Math.min(v10MentalCap(s),s.battle.shaken)):0;
export const BALL_BY_ACT=Object.freeze({1:.35,2:1,3:1});
const livePitchConfig=s=>{
  const base=STAGES[s.stage],opponent=v10Opponent(s);
  return {style:opponent?.style||base.style,zoneOpen:opponent?.zoneOpen??base.zoneOpen,zoneMax:opponent?.zoneMax??base.zoneMax};
};
// A pitcher's live zones. Opens narrow, widens every WIDEN_EVERY plate appearances, reaches wider at two strikes.
export const repertoireWidth=s=>{
  const cfg=livePitchConfig(s);
  return Math.min(cfg.zoneMax,cfg.zoneOpen+Math.floor((s.battle.turn-1)/WIDEN_EVERY));
};
export function repertoire(s){
  const cfg=livePitchConfig(s),count=Math.min(9,repertoireWidth(s)+(s.battle.strikes===2?PUTAWAY_REACH:0));
  return ZONE_ORDER[cfg.style].slice(0,count).sort((a,z)=>a-z);
}
// Information is earned. A lower level hides digits; it never shows a false number.
export function readLevel(s){
  const score=observeScore(s.deck);
  const base=score>=READ_THRESHOLDS[1]?2:score>=READ_THRESHOLDS[0]?1:0;
  const facilityScout=s.build===DECKBUILDER_BUILD&&s.stage>0&&s.facilities?.[s.stage-1]?.type==='scouting'?1:0;
  return Math.min(2,base+((s.relics||[]).includes('scope')?1:0)+facilityScout+(v10Shaken(s)?1:0));
}
export const activeRoute=s=>s?.build===DECKBUILDER_BUILD?routeChoice(s.stage,s.route):null;
export const battleTarget=s=>STAGES[s.stage].target+(activeRoute(s)?.targetDelta||0);
export const pitcherProfile=s=>{
  const base=STAGES[s.stage].stats,routeBonus=s.version===10?0:(activeRoute(s)?.statBonus||0),opponentBonus=v10Opponent(s)?.statBonus||0;
  const bonus=routeBonus+opponentBonus;
  return {stuff:base.stuff+bonus,movement:base.movement+bonus,command:base.command+bonus};
};
export function baseIntent(s){
  const b=s.battle,cfg=livePitchConfig(s),style=cfg.style;
  let weights=[5,6,10,7,8,15,5,7,12,25],name='바깥쪽 승부',detail='루키는 바깥쪽을 선호합니다. 2스트라이크에서는 몸쪽 비중이 높아집니다.';
  if(style==='sinker'){weights=[3,3,4,5,5,8,17,16,17,22];name='낮은 싱커';detail='낮은 공을 선호합니다. 높은 변화량이 타구 질을 낮추지만 존 적중 안타를 취소하지는 않습니다.';}
  if(style==='deep'){weights=[10,12,10,7,9,7,6,6,6,27];name='높은 공 · 외야 후퇴';detail='높은 공으로 뜬공을 유도합니다. 홈런 외 장타는 단타로 억제됩니다.';}
  if(b.strikes===2){weights=[11,5,6,18,5,6,13,5,6,25];name='몸쪽 승부구';detail='투스트라이크 몸쪽 경향. 존 밖 유인구도 섞습니다.';}
  if(style==='closer'&&b.history.some(h=>h.aimZone!=null)){
    const recent=b.history.filter(h=>h.aimZone!=null).slice(-3),col=recent.at(-1).aimZone%3;
    weights=[6,6,6,6,6,6,6,6,6,25];for(let z=0;z<9;z++)if(z%3===2-col)weights[z]+=10;
    name='이전 노림의 반대편';detail='마무리는 이전 스윙 위치의 반대 열을 선호합니다. 지금 고르는 존에는 반응하지 않습니다.';
  }
  /* V13: balls (pitches outside the nine cells) come in by act. Act 1 teaches reading, so the first
     pitchers rarely throw one; Act 2 and 3 keep their full ball rate (playtest 2026-09-25). */
  const act=v10Opponent(s)?.act;if(act)weights[9]*=BALL_BY_ACT[act]??1;
  // V10 멘탈: 실점으로 흔들린 투수는 볼이 늘어난다. 공개 확률은 그대로 실제 분포다.
  const shaken=v10Shaken(s);
  if(shaken){weights[9]*=1+V10_MENTAL.ballBoost*shaken;detail+=` 실점으로 흔들림 ${shaken}단계 · 볼이 늘어납니다.`;}
  if(b.balls===3){weights[9]*=.4;detail+=' 3볼에서는 스트라이크 비중이 높아집니다.';}
  // Zones outside the repertoire are not thrown at all. This is what makes the first pitcher readable.
  const live=repertoire(s),width=repertoireWidth(s);
  for(let z=0;z<9;z++)if(!live.includes(z))weights[z]=0;
  detail+=` 지금은 ${live.length}존만 씁니다`+(b.strikes===2&&live.length>width?` (2스트라이크로 ${live.length-width}존 확장)`:'')
    +(width<cfg.zoneMax?` · ${WIDEN_EVERY}타석마다 넓어집니다.`:' · 더 넓어지지 않습니다.');
  const total=weights.reduce((a,x)=>a+x,0);
  return {kind:style==='sinker'?'sinker':style==='deep'?'deep':b.strikes===2?'putaway':'fastball',name,detail,
    repertoire:live,width,maxWidth:cfg.zoneMax,probabilities:weights.map(x=>x/total)};
}
function dealPitch(s){
  const b=s.battle;b.intent=baseIntent(s);let r=unit(s,'pitchSeed'),zone=9;
  for(let i=0;i<10;i++){r-=b.intent.probabilities[i];if(r<0){zone=i;break;}}
  b.pending={zone,roll:unit(s,'pitchSeed'),powerRoll:unit(s,'pitchSeed')};
  b.scouted=false;b.scoutPlus=false;b.revealed=null;
}
export function createDuel(seed=Date.now()>>>0,build='away'){
  if(!Object.hasOwn(BUILDS,build))build=DECKBUILDER_BUILD;
  const baseDeck=BUILDS[build].cards;
  return {version:9,seed:seed>>>0,pitchSeed:(seed^0x9e3779b9)>>>0,initialSeed:seed>>>0,build,phase:'map',stage:0,
    growth:{patience:0,relay:0,fortune:0},growthHistory:[],fortune:0,relics:[],
    growthStats:{waitStrikes:0,patienceSwings:0,relayCreated:0,relayHits:0,fortuneEarned:0,fortuneUses:0},
    deck:baseDeck.map((kind,i)=>({id:'c'+i,kind})),nextId:baseDeck.length,rewards:[],facilities:[],route:null,routeHistory:[],victories:0,battle:null,last:null,
    stats:{cards:0,pitches:0,runs:0,outs:0,appearances:0,hits:0,walks:0,fouls:0,whiffs:0,totalBases:0}};
}
export function chooseRoute(state,routeId){
  if(state.build!==DECKBUILDER_BUILD||state.phase!=='map'||!routeChoice(state.stage,routeId)||state.route===routeId)return state;
  const s=clone(state);s.route=routeId;s.last=null;return s;
}
export function startBattle(state){
  if(state.phase!=='map'||state.build===DECKBUILDER_BUILD&&!routeChoice(state.stage,state.route))return state;const s=clone(state);s.phase='battle';
  s.battle={turn:1,batterIndex:0,preparations:0,runSignal:false,results:[],history:[],outs:0,runs:0,strikes:0,balls:0,
    aim:0,aimZone:s.build==='pull'?3:s.build==='away'?5:4,expanded:false,patient:false,scouted:false,
    expandedPlus:false,scoutPlus:false,runSignalPlus:false,
    waitCharge:0,relayPending:0,relayActive:0,growthMode:'normal',
    bases:[null,null,null],hand:[],draw:shuffle(s,s.deck.map(c=>c.id)),discard:[],log:[],intent:null,pending:null,revealed:null};
  // The opening aim must sit inside the pitcher's repertoire, or the batter starts pointed at a zone never thrown.
  const live=repertoire(s);
  if(!live.includes(s.battle.aimZone))
    s.battle.aimZone=live.reduce((best,z)=>Math.abs(z-s.battle.aimZone)<Math.abs(best-s.battle.aimZone)?z:best,live[0]);
  // The fixed opening hand only holds while those cards are still in the deck. 1막의 모든 노드가
  // stage 0이라 라커룸에서 c0을 빼면 그 뒤 전투가 덱에 없는 id를 손패에 얹고 화면이 죽었다.
  if(s.stage===0){
    const opening=['c0','c1','c2','c3','c4'].filter(id=>s.deck.some(c=>c.id===id));
    s.battle.hand=opening;s.battle.draw=s.battle.draw.filter(id=>!opening.includes(id));
    if(opening.length<5)draw(s,5-opening.length);
  }else draw(s,5);
  dealPitch(s);s.last={kind:'start',text:'1번 강한결 입장 · 경향을 읽고 노릴 존과 스윙을 고르세요.',events:[],runs:0,outs:0};return s;
}
export function setAimZone(state,zone){
  if(state.phase!=='battle'||!Number.isInteger(zone)||zone<0||zone>8||state.battle.aimZone===zone)return state;
  const s=clone(state);s.battle.aimZone=zone;return s;
}
export function coverageAt(s,id='basic',aimZone=s.battle.aimZone){
  const def=id==='basic'?{shape:'point'}:CARDS[card(s,id)?.kind];if(!def||def.type==='skill')return [];
  const z=aimZone,row=Math.floor(z/3),col=z%3;
  if(s.battle.growthMode==='patience'&&s.growth.patience&&s.battle.waitCharge>0&&def.shape!=='all')return [z];
  let zones=Array.from({length:9},(_,i)=>i).filter(i=>def.shape==='all'||def.shape==='row'&&Math.floor(i/3)===row
    ||def.shape==='column'&&i%3===col||def.shape==='cross'&&Math.abs(Math.floor(i/3)-row)+Math.abs(i%3-col)<=1||i===z);
  if(s.battle.expanded)zones=[...new Set(zones.flatMap(i=>[i,...Array.from({length:9},(_,j)=>j).filter(j=>Math.abs(Math.floor(i/3)-Math.floor(j/3))+Math.abs(i%3-j%3)===1)]))];
  return zones.sort((a,b)=>a-b);
}
export const coverage=(s,id='basic')=>coverageAt(s,id,s.battle.aimZone);

export const V10_SWING_STACK_MAX=4;
export const V10_SWING_DAMAGE_RATES=Object.freeze([1,.80,.65,.50]);
export function v10SwingDamageRate(cardCount=1){
  const n=Math.max(1,Math.min(V10_SWING_STACK_MAX,Number(cardCount)||1));
  return V10_SWING_DAMAGE_RATES[n-1];
}
export const V11_STACK_CONNECT_BONUS=.07;
export function v11StackZonesConnect(a,b){
  if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||a>8||b<0||b>8)return false;
  const ar=Math.floor(a/3),ac=a%3,br=Math.floor(b/3),bc=b%3;
  return Math.abs(ar-br)<=1&&Math.abs(ac-bc)<=1;
}
export function v11StackPlan(s,primaryId,supports=[]){
  const cardCount=1+(Array.isArray(supports)?supports.length:0),baseDamageRate=v10SwingDamageRate(cardCount);
  const mainAim=s?.battle?.aimZone;
  const steps=[{order:1,id:primaryId,kind:primaryId==='basic'?'basic':card(s,primaryId)?.kind||null,aimZone:mainAim,main:true},
    ...(supports||[]).map((x,i)=>({order:i+2,id:x.id,kind:card(s,x.id)?.kind||null,aimZone:x.aimZone,main:false}))];
  const links=steps.slice(1).map((step,i)=>({
    fromOrder:i+1,toOrder:i+2,fromZone:steps[i].aimZone,toZone:step.aimZone,
    connected:v11StackZonesConnect(steps[i].aimZone,step.aimZone),
  }));
  const connectCount=links.filter(x=>x.connected).length,connectBonus=connectCount*V11_STACK_CONNECT_BONUS;
  const orderedDamageRate=Math.min(1,baseDamageRate+connectBonus);
  const damageRate=v10RelicDamageRate(s?.relics||[],cardCount,orderedDamageRate);
  return {steps,links,cardCount,connectCount,baseDamageRate,connectBonus,orderedDamageRate,damageRate,perfect:links.length>0&&connectCount===links.length};
}
export function stackSupportProblem(s,primaryId,supports=[]){
  if(!Array.isArray(supports)||!supports.length)return null;
  if(s?.version!==10)return '카드 겹치기는 MAIN RUN에서만 사용할 수 있습니다.';
  if(s.phase!=='battle')return '지금은 카드를 겹칠 수 없습니다.';
  if(primaryId==='basic')return 'BASIC SWING에는 카드를 겹칠 수 없습니다. 공격 카드를 메인으로 고르세요.';
  if(cardProblem(s,primaryId))return cardProblem(s,primaryId);
  const primary=card(s,primaryId);
  if(primary?.kind==='bunt')return '희생 번트에는 다른 카드를 겹칠 수 없습니다.';
  if(s.battle.growthMode==='patience')return '기다린 한 공은 한 존 승부라 카드를 겹칠 수 없습니다.';
  if(supports.length>V10_SWING_STACK_MAX-1)return '한 번의 스윙에는 최대 '+V10_SWING_STACK_MAX+'장까지 겹칠 수 있습니다.';
  const seen=new Set([primaryId]);
  for(const support of supports){
    if(!support?.id||!Number.isInteger(support.aimZone)||support.aimZone<0||support.aimZone>8)return '겹친 카드마다 노릴 존을 고르세요.';
    if(seen.has(support.id))return '같은 카드를 두 번 겹칠 수 없습니다.';
    seen.add(support.id);
    const entry=card(s,support.id);
    if(!entry||!s.battle.hand.includes(support.id))return '겹칠 카드가 손패에 없습니다.';
    if(CARDS[entry.kind]?.type!=='attack')return '스윙 카드만 겹칠 수 있습니다.';
    if(entry.kind==='bunt')return '희생 번트는 겹치기 카드로 사용할 수 없습니다.';
  }
  return null;
}
export function assistProblem(s,primaryId,assistId,assistZone){
  return assistId?stackSupportProblem(s,primaryId,[{id:assistId,aimZone:assistZone}]):null;
}
export function stackCoverage(s,primaryId,supports=[]){
  const main=coverage(s,primaryId);
  if(!supports?.length||stackSupportProblem(s,primaryId,supports))return main;
  const extra=supports.flatMap(x=>coverageAt(s,x.id,x.aimZone));
  return [...new Set([...main,...extra])].sort((a,b)=>a-b);
}
export function comboCoverage(s,primaryId,assistId=null,assistZone=s.battle.aimZone){
  return stackCoverage(s,primaryId,assistId?[{id:assistId,aimZone:assistZone}]:[]);
}
export function cardProblem(s,id){
  if(s.phase!=='battle')return '먼저 투구 결과를 확인하고 다음 공/타자를 진행하세요.';
  if(id==='basic')return null;const c=card(s,id),b=s.battle;
  if(!c||!b.hand.includes(id))return '손패에 없는 카드입니다.';
  if(CARDS[c.kind].type==='skill'&&b.preparations>=2)return '이번 타석의 준비 2회를 모두 사용했습니다.';
  if(c.kind==='flow'&&!b.bases.some(Boolean))return '먼저 베이스에 주자가 필요합니다.';
  if(c.kind==='bunt'&&b.growthMode!=='normal')return '희생 작전에는 강화 스윙을 적용할 수 없습니다. 성장 사용을 해제하세요.';
  return null;
}
export function growthProblem(s,mode){
  if(s.phase!=='battle')return '투구 또는 타석 결과를 먼저 확인하세요.';
  if(mode==='normal')return null;
  if(mode==='patience')return !s.growth.patience?'기다림 성장을 먼저 획득하세요.':s.battle.waitCharge<1?'지켜본 스트라이크로 기다림을 쌓으세요.':null;
  if(mode==='fortune')return !s.growth.fortune?'행운 성장을 먼저 획득하세요.':s.fortune<growthCost(s.growth.fortune)?'행운이 부족합니다.':null;
  return '알 수 없는 성장 행동입니다.';
}
export function setGrowthMode(state,mode){
  if(growthProblem(state,mode)||state.battle.growthMode===mode)return state;
  const s=clone(state);s.battle.growthMode=mode;return s;
}
// Only deliberate scouting exposes which row/column contains this already-dealt pitch.
export function knownPitchZones(s){
  const b=s.battle;
  if(!b?.scouted||!b.pending)return Array.from({length:10},(_,z)=>z);
  const zone=b.pending.zone;
  if(zone===9)return [9];
  return Array.from({length:9},(_,z)=>z).filter(z=>Math.floor(z/3)===Math.floor(zone/3)&&(!b.scoutPlus||z%3===zone%3));
}
export function publicProbabilities(s){
  const b=s.battle,p=b.intent.probabilities;
  if(!b.scouted||!b.pending)return [...p];
  const known=knownPitchZones(s);
  const visible=p.map((v,z)=>known.includes(z)?v:0),sum=visible.reduce((a,x)=>a+x,0);
  return visible.map(v=>v/sum);
}
export function pitchClue(s){
  const b=s.battle;if(!b.scouted||!b.pending)return null;
  if(b.pending.zone===9)return '존 밖 볼 확인';
  const row=['높은 공','중간 높이','낮은 공'][Math.floor(b.pending.zone/3)];
  // Upgraded scout also names the column, the only way a `column` card can be handed information.
  return b.scoutPlus?row+' · '+['몸쪽','가운데','바깥'][b.pending.zone%3]+' 확인':row+' 확인';
}
export function matchup(s,id='basic',zone=s.battle.aimZone,coverageSize=null){
  const b=s.battle,k=id==='basic'?'basic':card(s,id)?.kind;
  const base=BUILDS[s.build].stats,player=b.batterIndex,v10Technique=s.version===10?(s.v10?.activeBattleBonus?.technique||0):0;
  const hitter={technique:base.technique+[0,4,-2,2,-3,1,3,-1,0][player]+b.aim*8+b.relayActive*10+v10Technique,
    power:base.power+[0,-3,5,-1,4,0,-4,2,1][player]+b.aim*5,luck:base.luck};
  const pitcher=pitcherProfile(s);
  const familiarity=BUILDS[s.build].zones.includes(zone)?12:0;
  const widthPenalty=Math.max(0,(coverageSize??coverage(s,id).length)-1)*7;
  const growthPower=b.growthMode==='patience'&&s.growth.patience?(12+12*s.growth.patience)*b.waitCharge:0;
  return {hitter,pitcher,familiarity,widthPenalty,growthPower,
    quality:hitter.technique+familiarity+(k==='strike'&&zone%3===2?12:0)-pitcher.movement,
    powerEdge:hitter.power+(id==='basic'?0:cardPower(card(s,id)))*18+familiarity-widthPenalty-pitcher.stuff+growthPower,
    luckEdge:hitter.luck-pitcher.command};
}
// Conditional hit types. Stats NEVER revoke a successful zone read.
export function hitProfile(s,id,zone,coverageSize=null){
  const k=id==='basic'?'basic':card(s,id).kind,m=matchup(s,id,zone,coverageSize);
  const limited=(k==='basic'||k==='defend')&&!m.growthPower;
  let hr=limited?0:clamp(.025+m.powerEdge*.006,0,(k==='slug'||m.growthPower>0)?.65:.12);
  let double=limited?0:clamp(.14+m.powerEdge*.005,.02,Math.min(.38,.95-hr));
  if(s.battle.intent.kind==='deep')double=0;
  const singles=1-hr-double;
  const bloop=singles*clamp(.18+m.luckEdge*.003-Math.max(0,m.quality)*.003,.04,.35);
  const ground=(singles-bloop)*clamp(.52-m.quality*.006,.12,.78);
  return [{label:'홈런',bases:4,p:hr},{label:'외야를 가르는 2루타',bases:2,p:double},
    {label:'바가지 안타 · 행운의 단타',bases:1,p:bloop},{label:'땅볼 안타',bases:1,p:ground},
    {label:'중전안타',bases:1,p:singles-bloop-ground}];
}
// Shared outcome distribution for preview and resolution; never reads hidden random rolls.
export function swingOdds(s,id,zone){
  const b=s.battle,k=id==='basic'?'basic':card(s,id)?.kind,covered=coverage(s,id).includes(zone),plus=!!card(s,id)?.plus;
  if(zone===9){const foul=k==='defend'?(plus?.34:.22):.08;return {hit:0,foul,out:0,whiff:1-foul,power:0,covered:false};}
  if(k==='bunt')return {hit:0,foul:plus?.15:.30,out:0,whiff:0,sacrifice:plus?.85:.70,power:0,covered:true};
  if(!covered){const foul=clamp((k==='defend'?(plus?.54:.42):.12)+(b.patient?.12:0),0,.66);return {hit:0,foul,out:0,whiff:1-foul,power:0,covered:false};}
  return {hit:1,foul:0,out:0,whiff:0,power:0,covered:true};
}
export function previewCard(s,id,probabilities=publicProbabilities(s)){
  const problem=cardProblem(s,id);if(problem)return {problem};
  if(id!=='basic'&&CARDS[card(s,id).kind].type==='skill')return {label:cardText(card(s,id).kind,card(s,id).plus)};
  const odds=probabilities.map((p,z)=>({p,o:swingOdds(s,id,z)}));
  const sum=key=>odds.reduce((v,{p,o})=>v+p*(o[key]||0),0);
  const hit=sum('hit'),types=hitProfile(s,id,s.battle.aimZone).map((t,i)=>({...t,p:hit?odds.reduce((v,{p,o},z)=>v+p*o.hit*hitProfile(s,id,z)[i].p,0)/hit:0}));
  const active=s.battle.relayActive;
  const growthText=s.battle.growthMode==='patience'?'기다림 '+s.battle.waitCharge+' 소비 · 한 존 · 파워 +'+matchup(s,id).growthPower:
    s.battle.growthMode==='fortune'?'비홈런 적중 시 행운 '+growthCost(s.growth.fortune)+' 소비 → 타자·기존 주자 추가 1베이스':'';
  return {label:id!=='basic'&&card(s,id).kind==='bunt'?'희생 작전 · 안타 보장 예외':'타격 범위 적중 = 안타 확정',coverage:coverage(s,id),hit,foul:sum('foul'),whiff:sum('whiff'),out:sum('out'),sacrifice:sum('sacrifice'),types,matchup:matchup(s,id),expectedBases:hit*types.reduce((v,t)=>v+t.p*t.bases,0),
    growthText:growthText+(active?' · 연결 사인: 기존 주자 추가 '+(active>=3?2:1)+'베이스':''),fortuneChance:s.battle.growthMode==='fortune'?hit*(1-types[0].p):0};
}

export function previewV10Stack(s,id,supports=[],probabilities=publicProbabilities(s)){
  if(!supports?.length){
    const solo=previewCard(s,id,probabilities),stackPlan=v11StackPlan(s,id,[]),precisionPressure=id==='basic'?0:(CARDS[card(s,id)?.kind]?.pressure||0);
    return {...solo,cardCount:1,damageRate:stackPlan.damageRate,stackPlan,connectCount:0,connectBonus:0,precisionPressure,
      baseStackDamageRate:1,orderedStackDamageRate:1,primaryCoverage:solo.coverage||[],supportCoverages:[]};
  }
  const problem=cardProblem(s,id)||stackSupportProblem(s,id,supports);if(problem)return {problem};
  const base=previewCard(s,id,probabilities),main=coverage(s,id);
  const supportCoverages=supports.map(x=>({id:x.id,kind:card(s,x.id).kind,aimZone:x.aimZone,coverage:coverageAt(s,x.id,x.aimZone)}));
  const combined=[...new Set([...main,...supportCoverages.flatMap(x=>x.coverage)])].sort((a,b)=>a-b),mass=new Map();
  let hit=0,foul=0,whiff=0,out=0;
  probabilities.forEach((p,z)=>{
    if(z!==9&&main.includes(z)){
      hit+=p;
      for(const t of hitProfile(s,id,z,combined.length))mass.set(t.label,(mass.get(t.label)||0)+p*t.p);
    }else if(z!==9&&supportCoverages.some(x=>x.coverage.includes(z))){
      hit+=p;mass.set('겹친 카드 단타',(mass.get('겹친 카드 단타')||0)+p);
    }else{
      const o=swingOdds(s,id,z);foul+=p*(o.foul||0);whiff+=p*(o.whiff||0);out+=p*(o.out||0);
    }
  });
  const basesFor=label=>label.includes('홈런')?4:label.includes('2루타')?2:1;
  const types=[...mass].map(([label,m])=>({label,bases:basesFor(label),p:hit?m/hit:0}));
  const hr=types.find(t=>t.bases===4)?.p||0,stackPlan=v11StackPlan(s,id,supports),cardCount=stackPlan.cardCount,damageRate=stackPlan.damageRate,
    precisionPressure=CARDS[card(s,id)?.kind]?.pressure||0;
  return {...base,label:'스윙 스택 · '+cardCount+'장 · CONNECT '+stackPlan.connectCount+'/'+Math.max(0,cardCount-1),coverage:combined,primaryCoverage:main,supportCoverages,
    supports:supportCoverages.map(({coverage,...x})=>x),cardCount,damageRate,stackPlan,connectCount:stackPlan.connectCount,connectBonus:stackPlan.connectBonus,precisionPressure,
    baseStackDamageRate:stackPlan.baseDamageRate,orderedStackDamageRate:stackPlan.orderedDamageRate,hit,foul,whiff,out,sacrifice:0,types,
    matchup:matchup(s,id,s.battle.aimZone,combined.length),expectedBases:hit*types.reduce((v,t)=>v+t.p*t.bases,0),
    fortuneChance:s.battle.growthMode==='fortune'?hit*(1-hr):0};
}
export function previewV10Combo(s,id,assistId,assistZone,probabilities=publicProbabilities(s)){
  return previewV10Stack(s,id,assistId?[{id:assistId,aimZone:assistZone}]:[],probabilities);
}
function home(s,id,events){s.battle.runs++;s.stats.runs++;events.push(playerName(id)+' 홈인 · +1점');}
function advance(s,steps,events){
  const b=s.battle;for(let i=2;i>=0;i--){const id=b.bases[i];if(!id)continue;b.bases[i]=null;
    if(i+steps>=3)home(s,id,events);else {b.bases[i+steps]=id;events.push(playerName(id)+': '+(i+1)+'루 → '+(i+steps+1)+'루');}}
}
function walk(s,events){
  const b=s.battle;
  if(b.bases[0]){if(b.bases[1]){if(b.bases[2])home(s,b.bases[2],events);b.bases[2]=b.bases[1];}b.bases[1]=b.bases[0];}
  b.bases[0]=currentBatter(s).id;s.stats.walks++;events.push(currentBatter(s).name+' 볼넷 · 1루');
}
function finishPA(s,label){const b=s.battle;b.results.push({batterId:currentBatter(s).id,label,turn:b.turn});s.stats.appearances++;s.phase='between';}
function finalize(s,before,kind,name,events,growthEvents=[]){
  const b=s.battle;s.last={kind,text:name,events,growthEvents,runs:b.runs-before.runs,outs:b.outs-before.outs};
  b.log=[name,...events,...b.log].slice(0,12);s.stats.outs+=b.outs-before.outs;
  // V10 is a pitcher-HP duel. Runs still matter as baseball feedback, but can never
  // short-circuit the fight or increment the legacy V9 victory/route counters.
  if(s.version===10){
    if(b.outs>=3)s.phase='lost';
    return s;
  }
  if(b.runs>=battleTarget(s)){
    s.victories++;
    if(s.build===DECKBUILDER_BUILD)s.routeHistory.push(s.route);
    s.phase=s.stage===3?'won':'reward';
  }else if(b.outs>=3)s.phase='lost';
  return s;
}
export function battingResult(s,id,opts={}){
  const {zone,roll,powerRoll}=s.battle.pending,o=swingOdds(s,id,zone),k=id==='basic'?'basic':card(s,id).kind;
  let kind=roll<o.hit?'hit':roll<o.hit+o.foul?'foul':roll<o.hit+o.foul+(o.sacrifice||0)?'sacrifice':roll<o.hit+o.foul+(o.sacrifice||0)+o.out?'out':'whiff';
  let hitType=null;
  if(kind==='hit'){let q=powerRoll;const types=hitProfile(s,id,zone,opts.coverageSize);hitType=types.at(-1);for(const t of types){q-=t.p;if(q<0){hitType=t;break;}}}
  return {kind,bases:hitType?.bases||0,zone,covered:o.covered,label:hitType?.label||{foul:k==='bunt'?'번트 파울':'파울',sacrifice:'희생 번트',out:'인플레이 아웃',whiff:'헛스윙'}[kind]};
}
function resolve(state,id,supports=[]){
  if(cardProblem(state,id||'basic')||stackSupportProblem(state,id||'basic',supports))return state;
  const s=clone(state),b=s.battle,before={runs:b.runs,outs:b.outs},events=[],growthEvents=[],pending=b.pending,mode=b.growthMode;
  const mainCoverage=id?coverage(s,id):[];
  const supportItems=(supports||[]).map(x=>({id:x.id,aimZone:x.aimZone,entry:card(s,x.id),coverage:coverageAt(s,x.id,x.aimZone)}));
  const supportCoverage=supportItems.flatMap(x=>x.coverage);
  const usedCoverage=id?[...new Set([...mainCoverage,...supportCoverage])].sort((a,b)=>a-b):[];
  const supportHit=pending.zone!==9&&!mainCoverage.includes(pending.zone)?supportItems.find(x=>x.coverage.includes(pending.zone)):null;
  let result;
  if(!id)result={kind:pending.zone===9?'ball':'called',zone:pending.zone,label:pending.zone===9?'볼':'루킹 스트라이크'};
  else if(supportHit)result={kind:'hit',bases:1,zone:pending.zone,covered:true,label:'겹친 카드 단타',assistOnly:true,supportId:supportHit.id};
  else result=battingResult(s,id,{coverageSize:usedCoverage.length});
  const k=id==='basic'?'basic':id?card(s,id).kind:null;
  if(id&&id!=='basic'){b.hand.splice(b.hand.indexOf(id),1);b.discard.push(id);s.stats.cards++;}
  for(const support of supportItems){b.hand.splice(b.hand.indexOf(support.id),1);b.discard.push(support.id);s.stats.cards++;}
  s.stats.pitches++;s.phase='pitch';
  const countBefore={balls:b.balls,strikes:b.strikes};
  if(result.kind==='hit'){
    if(result.assistOnly){const saver=supportItems.find(x=>x.id===result.supportId);events.push('겹친 카드 적중 → 단타 확정 · '+CARDS[saver?.entry?.kind]?.name+'이 메인 스윙의 빈 곳을 막았습니다.');}
    else {const m=matchup(s,id,result.zone,usedCoverage.length);events.push('존 적중 → 안타 확정 · 타격 '+m.hitter.technique+' vs 변화 '+m.pitcher.movement+' / 파워 '+m.hitter.power+' vs 구위 '+m.pitcher.stuff);}
    s.stats.hits++;s.stats.totalBases+=result.bases;
    const fortunate=mode==='fortune'&&result.bases<4;
    if(fortunate){s.fortune-=growthCost(s.growth.fortune);s.growthStats.fortuneUses++;growthEvents.push('행운 해방 · 수비 혼선으로 타자·주자 추가 1베이스');}
    const relaySteps=b.relayActive?(b.relayActive>=3?2:1):0;
    if(relaySteps){s.growthStats.relayHits++;growthEvents.push('연결 사인 실현 · 기존 주자 추가 '+relaySteps+'베이스');}
    advance(s,(result.assistOnly?result.bases:Math.max(result.bases,k==='rally'?2:0))+(b.runSignal?(b.runSignalPlus?2:1):0)+relaySteps+(fortunate?1:0),events);
    const destination=result.bases+(fortunate?1:0);
    if(destination>=4)home(s,currentBatter(s).id,events);else b.bases[destination-1]=currentBatter(s).id;
    if(s.growth.fortune&&!fortunate&&['땅볼 안타','바가지 안타 · 행운의 단타'].includes(result.label)){
      const gain=(result.label.startsWith('바가지')?2:1)+(s.growth.fortune>=3?1:0),earned=Math.min(6-s.fortune,gain);
      s.fortune+=earned;s.growthStats.fortuneEarned+=earned;if(earned)growthEvents.push('약한 안타에서 행운 +'+earned+' · '+s.fortune+'/6');
    }
    finishPA(s,result.label);
  }else if(result.kind==='out'||result.kind==='sacrifice'){
    const dp=result.kind==='out'&&b.intent.kind==='sinker'&&result.zone>=6&&b.bases[0]&&b.outs<2;
    b.outs+=dp?2:1;if(dp){events.push(playerName(b.bases[0])+' 병살 아웃');b.bases[0]=null;result.label='병살 아웃';}
    if(result.kind==='sacrifice'&&b.outs<3){
      const moved=b.bases.some(Boolean);advance(s,1,events);
      if(moved&&s.growth.relay){b.relayPending=s.growth.relay;s.growthStats.relayCreated++;growthEvents.push('희생의 약속 · 다음 타자에게 연결 사인');}
    }
    finishPA(s,result.label);
  }else if(result.kind==='ball'){
    b.balls++;if(b.balls===4){walk(s,events);result.label='볼넷';finishPA(s,result.label);}
  }else{
    if(result.kind==='foul')s.stats.fouls++;if(result.kind==='whiff')s.stats.whiffs++;
    if(result.kind!=='foul'||b.strikes<2||k==='bunt')b.strikes++;
    if(b.strikes===3){b.outs++;result.label=result.kind==='called'?'루킹 삼진':result.kind==='foul'?'번트 파울 삼진':'헛스윙 삼진';finishPA(s,result.label);}
    if(result.kind==='called'&&s.growth.patience&&b.strikes<3){b.waitCharge++;s.growthStats.waitStrikes++;growthEvents.push('지켜본 스트라이크 · 기다림 '+b.waitCharge+'/2');}
  }
  if(id&&mode==='patience'){growthEvents.unshift('기다린 한 공 · '+b.waitCharge+'중첩 사용');b.waitCharge=0;s.growthStats.patienceSwings++;}
  if(id&&!(mode==='fortune'&&result.kind!=='hit'))b.growthMode='normal';
  const firstSupport=supportItems[0]||null,stackPlan=id?v11StackPlan(s,id,supports):null;
  b.revealed={zone:pending.zone,label:result.label,kind:result.kind,coverage:usedCoverage,primaryCoverage:mainCoverage,
    supportCoverages:supportItems.map(x=>({id:x.id,kind:x.entry.kind,aimZone:x.aimZone,coverage:x.coverage})),
    supportKinds:supportItems.map(x=>x.entry.kind),supportZones:supportItems.map(x=>x.aimZone),stackCardCount:id?1+supportItems.length:0,
    stackConnectCount:stackPlan?.connectCount||0,stackConnectBonus:stackPlan?.connectBonus||0,
    stackBaseDamageRate:stackPlan?.baseDamageRate??1,stackOrderedDamageRate:stackPlan?.orderedDamageRate??1,
    stackLinks:stackPlan?.links||[],stackSteps:stackPlan?.steps||[],
    assistCoverage:firstSupport?.coverage||[],assistZone:firstSupport?.aimZone??null,assistKind:firstSupport?.entry?.kind||null,
    assistOnly:!!result.assistOnly,aimZone:id?b.aimZone:null,action:k||'take',ballsBefore:countBefore.balls,strikesBefore:countBefore.strikes,growthEvents};
  b.history.push({zone:pending.zone,label:result.label,aimZone:id?b.aimZone:null,turn:b.turn,...countBefore});
  b.history=b.history.slice(-18);b.pending=null;b.scouted=false;b.scoutPlus=false;
  // Upgraded 코스 조정 survives the swing and lasts the rest of the plate appearance.
  if(id&&!b.expandedPlus)b.expanded=false;
  events.unshift('실제 코스: '+(result.zone===9?'존 밖 볼':ZONES[result.zone]));
  if(s.phase==='pitch')events.push('같은 타자 · 다음 공에서 승부가 이어집니다.');
  return finalize(s,before,result.kind==='hit'?'hit':['out','sacrifice'].includes(result.kind)?'out':'pitch',currentBatter(s).name+' · '+result.label,events,growthEvents);
}
export function playCard(state,id,opts={}){
  if(cardProblem(state,id))return state;
  if(id==='basic'||CARDS[card(state,id).kind].type==='attack'){
    const supports=Array.isArray(opts.supports)?opts.supports:(opts.assist?[opts.assist]:[]);
    return resolve(state,id,supports);
  }
  const s=clone(state),entry=card(s,id),k=entry.kind,plus=!!entry.plus,b=s.battle,before={runs:b.runs,outs:b.outs},events=[];
  b.hand.splice(b.hand.indexOf(id),1);b.discard.push(id);s.stats.cards++;b.preparations++;
  if(k==='setup')b.aim=Math.min(4,b.aim+(plus?2:1));if(k==='watch')draw(s,plus?3:2);
  if(k==='scout'){b.scouted=true;if(plus)b.scoutPlus=true;draw(s,1);events.push(pitchClue(s));}
  if(k==='lure'){b.expanded=true;if(plus)b.expandedPlus=true;}
  if(k==='flow'){b.runSignal=true;if(plus)b.runSignalPlus=true;}
  if(k==='calm'){b.patient=true;draw(s,plus?2:1);}
  return finalize(s,before,'skill',CARDS[k].name+(plus?'+':'')+' · 준비 '+b.preparations+'/2',events);
}
export const endTurn=state=>state.phase==='battle'?resolve(state,null):state;
export function advancePitch(state){
  if(state.phase!=='pitch')return state;const s=clone(state);s.phase='battle';draw(s,1);dealPitch(s);
  s.last={kind:'entry',text:currentBatter(s).name+' · 다음 공을 읽으세요.',events:[],runs:0,outs:0};return s;
}
export function advanceBatter(state){
  if(state.phase!=='between')return state;const s=clone(state),b=s.battle,index=(b.batterIndex+1)%9,widthBefore=repertoireWidth(s);
  if(b.bases.includes(LINEUP[index].id))return state;
  b.batterIndex=index;b.turn++;b.strikes=0;b.balls=0;b.aim=0;b.preparations=0;b.runSignal=false;b.expanded=false;b.patient=false;
  b.expandedPlus=false;b.scoutPlus=false;b.runSignalPlus=false;
  b.waitCharge=0;b.growthMode='normal';b.relayActive=b.relayPending;b.relayPending=0;
  s.phase='battle';draw(s,Math.max(0,5-b.hand.length));dealPitch(s);
  const widthAfter=repertoireWidth(s),entry=(index+1)+'번 '+currentBatter(s).name+' 타석 입장',events=[];
  if(widthAfter>widthBefore){
    const opened=ZONE_ORDER[livePitchConfig(s).style].slice(widthBefore,widthAfter).map(z=>ZONES[z]).join(' · ');
    events.push('투수 레퍼토리 확장 · '+widthBefore+'→'+widthAfter+'존 · '+opened+' 추가');
  }
  s.last={kind:events.length?'repertoire':'entry',text:entry,events,runs:0,outs:0};
  b.log=[entry,...events,...b.log].slice(0,12);return s;
}
// One reward = one growth rank + one deck action. Adding, removing, upgrading and skipping compete.
export function chooseReward(state,action,growthKey=null){
  const deckbuilder=state.build===DECKBUILDER_BUILD;
  if(state.phase!=='reward'||(!deckbuilder&&(!Object.hasOwn(GROWTHS,growthKey)||state.growth[growthKey]>=3)))return state;
  if(rewardProblem(state.deck,action,state.stage,growthKey,state.relics,state.build,state.route))return state;
  const s=clone(state),moved=applyRewardToDeck(s.deck,action,s.nextId);
  s.deck=moved.deck;s.nextId=moved.nextId;
  if(action.type==='relic')s.relics=[...s.relics,action.kind];
  if(deckbuilder)s.growthHistory.push(null);
  else{s.growth[growthKey]++;s.growthHistory.push(growthKey);}
  s.rewards.push(['add','relic'].includes(action.type)?{type:action.type,kind:action.kind}
    :action.type==='skip'?{type:'skip'}:{type:action.type,id:action.id});
  s.stage++;s.route=null;s.phase=deckbuilder?'facility':'map';s.battle=null;s.last=null;return s;
}
export function facilityProblem(state,action){
  if(state.build!==DECKBUILDER_BUILD||state.phase!=='facility')return '시설 선택 단계가 아닙니다.';
  const route=FACILITY_ROUTES[state.stage-1]||[];
  if(!action||!route.includes(action.type))return '이번 이동 경로의 시설이 아닙니다.';
  if(action.type==='scouting')return null;
  if(action.type==='training'){
    const target=state.deck.find(c=>c.id===action.id);
    if(!target)return '강화할 카드를 선택하세요.';
    if(!canUpgrade(target))return '이 카드는 더 강화할 수 없습니다.';
    return null;
  }
  if(action.type==='release'){
    if(state.deck.length<=DECK_MIN)return '더 이상 카드를 줄일 수 없습니다.';
    if(!state.deck.some(c=>c.id===action.id))return '제거할 카드를 선택하세요.';
    return null;
  }
  if(action.type==='equipment'){
    const offers=RELIC_OFFERS[state.stage-1]||[];
    if(!offers.includes(action.kind))return '이번 장비실의 물건이 아닙니다.';
    if(state.relics.includes(action.kind))return '이미 가진 장비입니다.';
    return null;
  }
  return '알 수 없는 시설 선택입니다.';
}
export function chooseFacility(state,action){
  if(facilityProblem(state,action))return state;
  const s=clone(state);
  if(action.type==='training'){
    const kind=s.deck.find(c=>c.id===action.id).kind;
    s.deck=applyRewardToDeck(s.deck,{type:'upgrade',id:action.id},s.nextId).deck;
    s.facilities.push({type:'training',id:action.id,kind});
  }else if(action.type==='release'){
    const kind=s.deck.find(c=>c.id===action.id).kind;
    s.deck=applyRewardToDeck(s.deck,{type:'remove',id:action.id},s.nextId).deck;
    s.facilities.push({type:'release',id:action.id,kind});
  }else if(action.type==='equipment'){
    s.relics=[...s.relics,action.kind];
    s.facilities.push({type:'equipment',kind:action.kind});
  }else s.facilities.push({type:'scouting'});
  s.phase='map';s.last=null;return s;
}
export function saveDuel(storage,s){storage.setItem(SAVE_KEY,JSON.stringify(s));}
export function readDuel(storage){
  const raw=storage.getItem(SAVE_KEY);if(!raw)return null;
  const s=JSON.parse(raw),int=(v,a,z)=>Number.isInteger(v)&&v>=a&&v<=z,fail=()=>{throw new Error('9존 저장 기록이 손상됐습니다.');};
  const baseSize=BUILDS[s?.build]?.cards?.length||0;
  const adds=Array.isArray(s?.rewards)?s.rewards.filter(r=>r?.type==='add').length:0;
  const facilityHistory=Array.isArray(s?.facilities)?s.facilities:[];
  const drops=(Array.isArray(s?.rewards)?s.rewards.filter(r=>r?.type==='remove').length:0)+facilityHistory.filter(r=>r?.type==='release').length;
  const ups=(Array.isArray(s?.rewards)?s.rewards.filter(r=>r?.type==='upgrade').length:0)+facilityHistory.filter(r=>r?.type==='training').length;
  // v7 deck ids stay unique but no longer stay contiguous — removal makes c0..cN impossible to hold.
  if(!s||s.version!==9||!Object.hasOwn(BUILDS,s.build)||!['seed','pitchSeed','initialSeed'].every(k=>int(s[k],0,0xffffffff))
    ||!Array.isArray(s.relics)||s.relics.some(k=>!Object.hasOwn(RELICS,k))||new Set(s.relics).size!==s.relics.length
    ||!int(s.stage,0,3)||!['map','facility','battle','pitch','between','reward','won','lost'].includes(s.phase)
    ||!Array.isArray(s.deck)||!int(s.deck.length,DECK_MIN,DECK_MAX)
    ||s.deck.some(c=>!c||typeof c.id!=='string'||!/^c\d+$/.test(c.id)||!Object.hasOwn(CARDS,c.kind)||!['boolean','undefined'].includes(typeof c.plus))
    ||new Set(s.deck.map(c=>c.id)).size!==s.deck.length
    ||!Array.isArray(s.rewards)||s.rewards.length!==s.stage
    ||!Array.isArray(s.facilities)||!Array.isArray(s.routeHistory)
    ||(s.build===DECKBUILDER_BUILD
      ?s.routeHistory.length!==s.victories||!s.routeHistory.every((id,i)=>!!routeChoice(i,id))
        ||(s.route!==null&&!routeChoice(s.stage,s.route))
        ||(s.phase==='facility'&&s.route!==null)
        ||(['battle','pitch','between','reward','lost','won'].includes(s.phase)&&!routeChoice(s.stage,s.route))
      :s.route!==null||s.routeHistory.length!==0)
    ||(s.build===DECKBUILDER_BUILD
      ?s.facilities.length!==(s.phase==='facility'?Math.max(0,s.stage-1):s.stage)
      :s.facilities.length!==0)
    ||!s.facilities.every((r,i)=>r&&FACILITY_ROUTES[i]?.includes(r.type)
      &&(r.type!=='training'||typeof r.id==='string'&&Object.hasOwn(CARDS,r.kind))
      &&(r.type!=='release'||typeof r.id==='string'&&Object.hasOwn(CARDS,r.kind))
      &&(r.type!=='equipment'||(RELIC_OFFERS[i]||[]).includes(r.kind)))
    ||!s.rewards.every((r,i)=>r&&['add','remove','upgrade','relic','skip'].includes(r.type)
      &&(s.build!==DECKBUILDER_BUILD||['add','skip'].includes(r.type))
      &&(r.type!=='add'||rewardChoices(i,s.growthHistory?.[i],s.build,s.routeHistory?.[i]).includes(r.kind))
      &&(r.type!=='relic'||(RELIC_OFFERS[i]||[]).includes(r.kind))
      &&(!['remove','upgrade'].includes(r.type)||typeof r.id==='string'))
    ||s.relics.length!==s.rewards.filter(r=>r.type==='relic').length+s.facilities.filter(r=>r.type==='equipment').length
    ||!s.relics.every(k=>s.rewards.some(r=>r.type==='relic'&&r.kind===k)||s.facilities.some(r=>r.type==='equipment'&&r.kind===k))
    ||s.nextId!==baseSize+adds||s.deck.length!==baseSize+adds-drops||s.deck.filter(c=>c.plus).length>ups
    ||s.deck.some(c=>Number(c.id.slice(1))>=s.nextId)
    ||!s.stats||!['cards','pitches','runs','outs','appearances','hits','walks','fouls','whiffs','totalBases'].every(k=>int(s.stats[k],0,100000)))fail();
  if(s.victories!==(s.phase==='won'?4:s.phase==='reward'?s.stage+1:s.stage)||s.phase==='won'&&s.stage!==3||s.phase==='reward'&&s.stage===3)fail();
  if(!s.growth||!Object.keys(GROWTHS).every(k=>int(s.growth[k],0,3))||!Array.isArray(s.growthHistory)||s.growthHistory.length!==s.stage
    ||!s.growthHistory.every(k=>s.build===DECKBUILDER_BUILD?k===null:Object.hasOwn(GROWTHS,k))
    ||!Object.keys(GROWTHS).every(k=>s.growth[k]===s.growthHistory.filter(x=>x===k).length)
    ||!int(s.fortune,0,6)||!s.growthStats||!['waitStrikes','patienceSwings','relayCreated','relayHits','fortuneEarned','fortuneUses'].every(k=>int(s.growthStats[k],0,100000)))fail();
  const b=s.battle;if(!b){if(!['map','facility'].includes(s.phase))fail();return s;}
  if(!['hand','draw','discard','results','history','log'].every(k=>Array.isArray(b[k]))||!Array.isArray(b.bases)||b.bases.length!==3
    ||!int(b.outs,0,3)||!int(b.strikes,0,3)||!int(b.balls,0,4)||!int(b.runs,0,100)||!int(b.aim,0,4)||!int(b.aimZone,0,8)
    ||!int(b.turn,1,100000)||!int(b.batterIndex,0,8)||b.batterIndex!==(b.turn-1)%9||!int(b.preparations,0,2)
    ||!int(b.waitCharge,0,2)||!int(b.relayPending,0,s.growth.relay)||!int(b.relayActive,0,s.growth.relay)||!['normal','patience','fortune'].includes(b.growthMode)
    ||b.growthMode==='patience'&&(!s.growth.patience||!b.waitCharge)||b.growthMode==='fortune'&&(!s.growth.fortune||s.fortune<growthCost(s.growth.fortune))
    ||!['runSignal','expanded','patient','scouted','expandedPlus','scoutPlus','runSignalPlus'].every(k=>typeof b[k]==='boolean')
    ||!b.log.every(t=>typeof t==='string')||!b.results.every(r=>r&&LINEUP.some(p=>p.id===r.batterId)&&typeof r.label==='string'&&int(r.turn,1,100000))
    ||!b.history.every(h=>h&&int(h.zone,0,9)&&typeof h.label==='string'&&(h.aimZone===null||int(h.aimZone,0,8))&&int(h.turn,1,b.turn)&&int(h.balls,0,3)&&int(h.strikes,0,2)))fail();
  const players=b.bases.filter(x=>x!==null),ids=[...b.hand,...b.draw,...b.discard];
  if(new Set(players).size!==players.length||!players.every(id=>LINEUP.some(p=>p.id===id))||ids.length!==s.deck.length||new Set(ids).size!==ids.length||!ids.every(id=>s.deck.some(c=>c.id===id))||b.hand.length>9)fail();
  if(!b.intent||!Array.isArray(b.intent.probabilities)||b.intent.probabilities.length!==10||!b.intent.probabilities.every(p=>Number.isFinite(p)&&p>=0&&p<=1)||Math.abs(b.intent.probabilities.reduce((a,x)=>a+x,0)-1)>1e-8)fail();
  if(s.phase==='battle'){if(!b.pending||!int(b.pending.zone,0,9)||!['roll','powerRoll'].every(k=>Number.isFinite(b.pending[k])&&b.pending[k]>=0&&b.pending[k]<1)||b.revealed!==null)fail();}
  else if(b.pending!==null||!b.revealed||!int(b.revealed.zone,0,9)||typeof b.revealed.label!=='string')fail();
  if(s.phase==='map'||['battle','pitch'].includes(s.phase)&&(b.outs>=3||b.strikes>=3||b.balls>=4||players.includes(currentBatter(s).id))
    ||['battle','pitch','between'].includes(s.phase)&&b.runs>=battleTarget(s)
    ||s.phase==='between'&&(b.outs>=3||b.results.at(-1)?.turn!==b.turn)
    ||s.phase==='lost'&&(b.outs!==3||b.runs>=battleTarget(s))
    ||['reward','won'].includes(s.phase)&&b.runs<battleTarget(s))fail();
  if(!s.last||typeof s.last.text!=='string'||!Array.isArray(s.last.events)||!s.last.events.every(t=>typeof t==='string'))fail();
  return s;
}


// ---- V10 additive run contract -------------------------------------------------
// V9 remains untouched above. V10 UI must use these entry points so score-target
// transitions cannot bypass pitcher HP or the deterministic run map.
import {createPitcherHp,applyPitcherOutcome,pitcherSelector,damageForOutcome} from './pitcher-hp.js';
import {createRunMap,selectRunNode,completeRunNode,getRunNode,isCombatNode,runMapSelector} from './run-map.js';
import {V10_SAVE_KEY as V10_STORAGE_KEY,saveV10State,readV10State} from './v10-storage.js';
import {V10_RELICS,v10RelicOffers,v10RelicDamagePlan,v10RelicDamageRate} from './v10-relics.js';

const V10_UTILITY_PHASES=new Set(['training','locker','shop','rest']);
const v10StageForNode=node=>node?.type==='boss'?Math.min(3,node.act):Math.min(2,Math.max(0,(node?.act||1)-1));
const v10HpForNode=node=>node?.opponent?.maxHp||(({battle:72,elite:92,boss:120}[node?.type]||72)+Math.max(0,(node?.act||1)-1)*12);
const v10RouteForNode=node=>{
  const stage=v10StageForNode(node),choices=ROUTE_CHOICES[stage]||[];
  return choices[node?.type==='battle'?0:Math.max(0,choices.length-1)]||null;
};
const currentV10Node=s=>getRunNode(s.runMap,s.v10?.nodeId);
const v10RewardPool=s=>{
  const node=currentV10Node(s),tier=node?.opponent?.rewardTier||1;
  return rewardChoices(s.stage,null,DECKBUILDER_BUILD,s.route).slice(0,tier>=2?4:3);
};
const v10ShopPool=s=>{
  const node=currentV10Node(s),stage=v10StageForNode(node),route=(ROUTE_CHOICES[stage]||[])[0];
  const pool=[...new Set(rewardChoices(stage,null,DECKBUILDER_BUILD,route?.id||null))];
  if(!pool.length)return [];
  const offset=(node?.seed||0)%pool.length;
  return [...pool.slice(offset),...pool.slice(0,offset)].slice(0,3);
};
const v10RelicPool=s=>{
  const node=currentV10Node(s);
  return v10RelicOffers({seed:s.initialSeed,act:node?.act||1,nodeSeed:node?.seed||0,owned:s.relics||[]});
};
const v10BasesForReveal=r=>{
  if(r?.kind!=='hit')return 0;
  if(Number.isInteger(r.bases))return r.bases;
  const label=String(r.label||'');
  return label.includes('홈런')?4:label.includes('3루타')?3:label.includes('2루타')?2:1;
};
const v10ZoneLabel=zone=>zone===9?'존 밖':ZONES[zone]||'코스 미확인';
const v10ChoiceLabel=choice=>choice==='take'?'한 구 지켜보기':choice==='basic'?'기본 스윙':CARDS[choice]?.name||String(choice||'');
const v10EndedPA=r=>['hit','out','sacrifice'].includes(r?.kind)||r?.label==='볼넷';

export function createV10Duel(seed=Date.now()>>>0){
  const s=createDuel(seed,DECKBUILDER_BUILD);
  s.version=10;s.phase='map';s.stage=0;s.route=null;s.routeHistory=[];s.victories=0;s.battle=null;s.last=null;
  s.runMap=createRunMap(seed);s.pitcher=null;s.rewards=[];s.facilities=[];
  s.v10={nodeId:null,opponent:null,lastCombat:null,rewardChoices:[],runComplete:false,
    nextBattleBonus:null,activeBattleBonus:null,utilityHistory:[]};
  return s;
}

export function v10NodeProblem(state,nodeId){
  if(state?.version!==10)return 'V10 런이 아닙니다.';
  if(state.phase!=='map')return '지금은 지도에서 이동할 수 없습니다.';
  const node=getRunNode(state.runMap,nodeId);
  if(!node)return '지도에 없는 칸입니다.';
  if(state.runMap.completedNodeIds.includes(nodeId))return '이미 지나온 칸입니다.';
  if(!state.runMap.reachableIds?.includes(nodeId))return '아직 닿지 않는 칸입니다.';
  if(isCombatNode(node)&&!v10RouteForNode(node))return '상대 정보를 불러오지 못했습니다.';
  return null;
}

export function enterV10Node(state,nodeId){
  if(state?.version!==10||state.phase!=='map')return state;
  const selected=selectRunNode(state.runMap,nodeId);if(selected.error)return state;
  const s=clone(state);s.runMap=selected.map;
  const node=getRunNode(s.runMap,nodeId);if(!node)return state;
  const activeBattleBonus=isCombatNode(node)&&s.v10?.nextBattleBonus?clone(s.v10.nextBattleBonus):null;
  s.v10={...s.v10,nodeId,opponent:isCombatNode(node)?clone(node.opponent):null,lastCombat:null,rewardChoices:[],
    activeBattleBonus,nextBattleBonus:isCombatNode(node)?null:s.v10?.nextBattleBonus||null};
  if(!isCombatNode(node)){
    s.phase=node.type;s.pitcher=null;s.battle=null;s.route=null;s.last=null;return s;
  }
  const stage=v10StageForNode(node),route=v10RouteForNode(node);if(!route)return state;
  s.stage=stage;s.route=route.id;s.phase='map';s.battle=null;
  const started=startBattle(s);
  started.pitcher=createPitcherHp({
    name:node.opponent?.name||route.name,maxHp:v10HpForNode(node),seed:(node.seed^started.initialSeed)>>>0,style:node.opponent?.style||STAGES[stage].style,
  });
  started.v10={...started.v10,nodeId:node.id,opponent:clone(node.opponent),lastCombat:null,rewardChoices:[]};
  return started;
}

export function v10UtilityOptions(state){
  if(state?.version!==10||!V10_UTILITY_PHASES.has(state.phase))return [];
  if(state.phase==='training')return state.deck.filter(canUpgrade).map(c=>({type:'upgrade',id:c.id,kind:c.kind,name:CARDS[c.kind].name}));
  if(state.phase==='locker')return state.deck.length<=DECK_MIN?[]:state.deck.map(c=>({type:'remove',id:c.id,kind:c.kind,name:CARDS[c.kind].name}));
  if(state.phase==='shop'){
    const relics=v10RelicPool(state).map(relic=>({type:'relic',relic,name:`RELIC · ${V10_RELICS[relic].name} / ${V10_RELICS[relic].text}`}));
    const cards=state.deck.length>=DECK_MAX?[]:v10ShopPool(state).map(kind=>({type:'add',kind,name:CARDS[kind].name}));
    return [...cards,...relics];
  }
  if(state.phase==='rest')return [{type:'rest',technique:8,name:'컨디션 회복'}];
  return [];
}

function v10UtilityProblem(state,action){
  if(!action||action.type==='skip')return null;
  const options=v10UtilityOptions(state);
  if(state.phase==='training')return options.some(o=>o.type==='upgrade'&&o.id===action.id)?null:'강화할 수 없는 카드입니다.';
  if(state.phase==='locker')return options.some(o=>o.type==='remove'&&o.id===action.id)?null:'정리할 수 없는 카드입니다.';
  if(state.phase==='shop'){
    if(action.type==='add')return options.some(o=>o.type==='add'&&o.kind===action.kind)?null:'이번 상점의 카드가 아닙니다.';
    if(action.type==='relic')return options.some(o=>o.type==='relic'&&o.relic===action.relic)?null:'이번 상점의 유물이 아닙니다.';
    return '카드 또는 유물 하나를 선택하세요.';
  }
  if(state.phase==='rest')return action.type==='rest'?null:'휴식 효과를 선택할 수 없습니다.';
  return '알 수 없는 경로 행동입니다.';
}

export function completeV10UtilityNode(state,action={type:'skip'}){
  if(state?.version!==10||!V10_UTILITY_PHASES.has(state.phase)||v10UtilityProblem(state,action))return state;
  const s=clone(state),nodeId=s.runMap.currentNodeId,kind=s.phase;
  if(action.type==='upgrade')s.deck=applyRewardToDeck(s.deck,{type:'upgrade',id:action.id},s.nextId).deck;
  else if(action.type==='remove')s.deck=applyRewardToDeck(s.deck,{type:'remove',id:action.id},s.nextId).deck;
  else if(action.type==='add'){
    const moved=applyRewardToDeck(s.deck,{type:'add',kind:action.kind},s.nextId);s.deck=moved.deck;s.nextId=moved.nextId;
  }else if(action.type==='relic'){
    if(!s.relics.includes(action.relic))s.relics.push(action.relic);
  }else if(action.type==='rest')s.v10.nextBattleBonus={technique:8,source:'rest'};
  s.v10.utilityHistory=[...(s.v10.utilityHistory||[]),{nodeId,kind,action:clone(action)}];
  s.runMap=completeRunNode(s.runMap);
  s.phase='map';s.v10={...s.v10,nodeId:null,opponent:null,activeBattleBonus:null};s.last=null;return s;
}

export function playV10Action(state,action){
  if(state?.version!==10||state.phase!=='battle'||!state.pitcher||state.pitcher.hp<=0||!action)return state;
  const beforePitches=state.stats.pitches;
  const choice=action.type==='take'?'take':action.type==='card'
    ?(action.id==='basic'?'basic':card(state,action.id)?.kind||String(action.id||'')):'';
  if(!choice)return state;
  const supports=Array.isArray(action.supports)?action.supports:(action.assistId?[{id:action.assistId,aimZone:action.assistZone}]:[]);
  let next=action.type==='take'?endTurn(state):action.type==='card'?playCard(state,action.id,{supports}):state;
  if(next===state)return state;
  if(next.stats.pitches===beforePitches){
    if(['reward','won'].includes(next.phase)&&next.pitcher?.hp>0)next.phase='battle';
    return next;
  }
  const r=next.battle?.revealed;if(!r)return next;
  const stackCardCount=action.type==='card'?(r.stackCardCount||1):1;
  const stackDamageRate=action.type==='card'?(r.stackOrderedDamageRate??v10SwingDamageRate(stackCardCount)):1;
  const outcome={kind:r.kind,label:r.label,bases:v10BasesForReveal(r),zone:r.zone,aimZone:r.aimZone,
    covered:Array.isArray(r.coverage)&&r.coverage.includes(r.zone)};
  const pitchInPA=Math.max(1,(next.battle?.history||[]).filter(h=>h.turn===next.battle.turn).length);
  const relicPlan=v10RelicDamagePlan({relics:next.relics||[],outcome,cardCount:stackCardCount,damageRate:stackDamageRate,pitchInPA});
  const precisionRate=action.type==='card'&&r.kind==='hit'&&!r.assistOnly&&Array.isArray(r.primaryCoverage)&&r.primaryCoverage.includes(r.zone)
    ?(CARDS[choice]?.pressure||0):0;
  const pressureBase=precisionRate?damageForOutcome(outcome,next.pitcher.foulStreak||0).damage:0;
  const precisionBonus=precisionRate?Math.max(0,Math.round(pressureBase*relicPlan.damageRate*precisionRate)):0;
  // 주자 압박: 공 던지기 전 루상 주자 수 기준. 안타일 때만.
  const runnersBefore=(state.battle?.bases||[]).filter(Boolean).length;
  const runnerRate=r.kind==='hit'?runnersBefore*V10_RUNNER_PRESSURE:0;
  const runnerBonus=runnerRate?Math.max(0,Math.round(damageForOutcome(outcome,0).damage*relicPlan.damageRate*runnerRate)):0;
  const applied=applyPitcherOutcome(next.pitcher,outcome,{pitchId:next.stats.pitches,damageMultiplier:relicPlan.damageRate,
    damageBonus:relicPlan.damageBonus+precisionBonus+runnerBonus});
  // 멘탈: 타석이 끝날 때만 갱신. 실점이면 흔들림 누적, 무실점이면 1단계 회복.
  const runsScored=Math.max(0,(next.battle?.runs||0)-(state.battle?.runs||0));
  const shakenBefore=v10Shaken(state),paEnded=(next.battle?.results?.length||0)>(state.battle?.results?.length||0);
  let shakenAfter=shakenBefore;
  if(next.battle&&paEnded){
    shakenAfter=runsScored?Math.min(v10MentalCap(next),shakenBefore+runsScored):Math.max(0,shakenBefore-1);
    next.battle.shaken=shakenAfter;
  }
  next.pitcher=applied.pitcher;
  const supportNames=(r.supportKinds||[]).map(k=>CARDS[k]?.name||k);
  const supportAims=(r.supportZones||[]).map(v10ZoneLabel);
  next.v10={...next.v10,lastCombat:{
    choice,choiceLabel:[v10ChoiceLabel(choice),...supportNames].join(' + '),aimZone:r.aimZone,aimLabel:[v10ZoneLabel(r.aimZone),...supportAims].join(' + '),
    actualPitch:r.zone,pitchLabel:v10ZoneLabel(r.zone),pitchName:next.battle?.intent?.name||'',
    verdict:r.label,damage:applied.result.damage,baseDamage:applied.result.baseDamage,damageRate:relicPlan.damageRate,
    baseStackDamageRate:r.stackBaseDamageRate??v10SwingDamageRate(stackCardCount),orderedStackDamageRate:stackDamageRate,
    connectCount:r.stackConnectCount||0,connectBonus:r.stackConnectBonus||0,stackLinks:r.stackLinks||[],stackSteps:r.stackSteps||[],
    relicBonus:relicPlan.damageBonus,precisionRate,precisionBonus,totalDamageBonus:relicPlan.damageBonus+precisionBonus+runnerBonus,
    runnersBefore,runnerRate,runnerBonus,runsScored,shakenBefore,shakenAfter,
    relicEvents:relicPlan.events,cardCount:stackCardCount,hpAfter:applied.result.hpAfter,
  }};
  const pressureEvents=[
    ...(precisionBonus?['정타 노림 · 정확 적중 +'+precisionBonus+' HP']:[]),
    ...(runnerBonus?['주자 '+runnersBefore+'명 압박 · +'+Math.round(runnerRate*100)+'% · +'+runnerBonus+' HP']:[]),
    ...(shakenAfter>shakenBefore?['투수 흔들림 '+shakenAfter+'/'+v10MentalCap(next)+' · 볼 증가 · 읽기 +1']
      :shakenAfter<shakenBefore?['투수 안정 · 흔들림 '+shakenAfter+'/'+v10MentalCap(next)]
      :runsScored&&shakenAfter===v10MentalCap(next)&&v10MentalCap(next)<3?['노련한 투수 · 흔들림 상한 '+shakenAfter+'단계']:[]),
  ];
  if((relicPlan.events.length||pressureEvents.length)&&next.last?.events)
    next.last.events=[...pressureEvents,...relicPlan.events.map(e=>'유물 · '+e),...next.last.events];
  if(next.pitcher.hp<=0){
    const node=currentV10Node(next),finalBoss=node?.type==='boss'&&node.act===3;
    const events=[...(next.last?.events||[]),next.pitcher.name+' HP 0 · 강판'];
    next.last={...(next.last||{kind:'pitch',text:'투수 강판',runs:0,outs:0}),events};
    if(finalBoss){
      next.runMap=completeRunNode(next.runMap);
      next.phase='won';next.v10={...next.v10,rewardChoices:[],runComplete:true,activeBattleBonus:null};
    }else{
      next.phase='reward';next.v10.rewardChoices=v10RewardPool(next);
    }
  }else if(['reward','won'].includes(next.phase)){
    next.phase=next.battle.outs>=3?'lost':v10EndedPA(r)?'between':'pitch';
  }
  return next;
}

export function advanceV10Pitch(state){
  if(state?.version!==10||state.phase!=='pitch'||!state.pitcher||state.pitcher.hp<=0)return state;
  return advancePitch(state);
}

export function advanceV10Batter(state){
  if(state?.version!==10||state.phase!=='between'||!state.pitcher||state.pitcher.hp<=0)return state;
  return advanceBatter(state);
}

export function claimV10Reward(state,action){
  if(state?.version!==10||state.phase!=='reward'||state.pitcher?.hp!==0||!action)return state;
  const pool=state.v10?.rewardChoices||[];
  if(action.type==='add'&&!pool.includes(action.kind))return state;
  if(!['add','skip'].includes(action.type))return state;
  const s=clone(state);
  if(action.type==='add'){
    const moved=applyRewardToDeck(s.deck,{type:'add',kind:action.kind},s.nextId);
    s.deck=moved.deck;s.nextId=moved.nextId;
  }
  s.rewards.push({nodeId:s.runMap.currentNodeId,type:action.type,...(action.type==='add'?{kind:action.kind}:{})});
  s.runMap=completeRunNode(s.runMap);
  const here=getRunNode(s.runMap,s.runMap.currentNodeId);
  const finished=here?.type==='boss'&&here.act===3&&s.runMap.reachableIds.length===0;
  s.phase=finished?'won':'map';s.battle=null;s.pitcher=null;s.route=null;s.last=null;
  s.v10={...s.v10,nodeId:null,opponent:null,lastCombat:null,rewardChoices:[],runComplete:finished,activeBattleBonus:null};
  return s;
}

export const v10RewardOptions=state=>state?.version===10?[...(state.v10?.rewardChoices||[])]:[];
export const selectV10Pitcher=state=>state?.version===10?pitcherSelector(state.pitcher):null;
export const selectV10Combat=state=>state?.version===10&&state.v10?.lastCombat?{...state.v10.lastCombat}:null;
export const selectV10Map=state=>state?.version===10?runMapSelector(state.runMap):null;

export const V10_SAVE_KEY=V10_STORAGE_KEY;
export function saveV10Duel(storage,state){saveV10State(storage,state);}
// 이 수정 이전에 오염된 저장은 손패에 덱에 없는 id를 들고 있다. 불러올 때 버린다.
export function v10NormalizeHand(state){
  const hand=state?.battle?.hand;if(!Array.isArray(hand)||!Array.isArray(state.deck))return state;
  const ids=new Set(state.deck.map(c=>c.id)),kept=hand.filter(id=>ids.has(id));
  return kept.length===hand.length?state:{...state,battle:{...state.battle,hand:kept}};
}
export function readV10Duel(storage){return v10NormalizeHand(readV10State(storage));}
