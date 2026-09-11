import {CARDS,REWARDS,SAVE_KEY,STAGES,LINEUP,BUILDS,ZONES,GROWTHS,growthCost,rewardChoices} from './cards.js';
const clone=s=>JSON.parse(JSON.stringify(s));
const card=(s,id)=>s.deck.find(c=>c.id===id);
const unit=(s,key)=>{s[key]=(Math.imul(s[key],1664525)+1013904223)>>>0;return s[key]/4294967296;};
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export const currentBatter=s=>LINEUP[s.battle.batterIndex];
const playerName=id=>LINEUP.find(p=>p.id===id)?.name||'선수';
function shuffle(s,a){for(let i=a.length-1;i>0;i--){const j=Math.floor(unit(s,'seed')*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function draw(s,n){const b=s.battle;while(n-->0&&b.hand.length<9){if(!b.draw.length)b.draw=shuffle(s,b.discard.splice(0));if(!b.draw.length)break;b.hand.push(b.draw.pop());}}

// PUBLIC is the actual sampling distribution. No false odds, no input-dependent reroll.
export function baseIntent(s){
  const b=s.battle,style=STAGES[s.stage].style;
  let weights=[5,6,10,7,8,15,5,7,12,25],name='바깥쪽 승부',detail='루키는 바깥쪽을 선호합니다. 2스트라이크에서는 몸쪽 비중이 높아집니다.';
  if(style==='sinker'){weights=[3,3,4,5,5,8,17,16,17,22];name='낮은 싱커';detail='낮은 공을 선호합니다. 높은 변화량이 타구 질을 낮추지만 존 적중 안타를 취소하지는 않습니다.';}
  if(style==='deep'){weights=[10,12,10,7,9,7,6,6,6,27];name='높은 공 · 외야 후퇴';detail='높은 공으로 뜬공을 유도합니다. 홈런 외 장타는 단타로 억제됩니다.';}
  if(b.strikes===2){weights=[11,5,6,18,5,6,13,5,6,25];name='몸쪽 승부구';detail='투스트라이크 몸쪽 경향. 존 밖 유인구도 섞습니다.';}
  if(style==='closer'&&b.history.some(h=>h.aimZone!=null)){
    const recent=b.history.filter(h=>h.aimZone!=null).slice(-3),col=recent.at(-1).aimZone%3;
    weights=[6,6,6,6,6,6,6,6,6,25];for(let z=0;z<9;z++)if(z%3===2-col)weights[z]+=10;
    name='이전 노림의 반대편';detail='마무리는 이전 스윙 위치의 반대 열을 선호합니다. 지금 고르는 존에는 반응하지 않습니다.';
  }
  if(b.balls===3){weights[9]*=.4;detail+=' 3볼에서는 스트라이크 비중이 높아집니다.';}
  const total=weights.reduce((a,x)=>a+x,0);
  return {kind:style==='sinker'?'sinker':style==='deep'?'deep':b.strikes===2?'putaway':'fastball',name,detail,probabilities:weights.map(x=>x/total)};
}
function dealPitch(s){
  const b=s.battle;b.intent=baseIntent(s);let r=unit(s,'pitchSeed'),zone=9;
  for(let i=0;i<10;i++){r-=b.intent.probabilities[i];if(r<0){zone=i;break;}}
  b.pending={zone,roll:unit(s,'pitchSeed'),powerRoll:unit(s,'pitchSeed')};
  b.scouted=false;b.revealed=null;
}
export function createDuel(seed=Date.now()>>>0,build='away'){
  if(!Object.hasOwn(BUILDS,build))build='away';
  return {version:6,seed:seed>>>0,pitchSeed:(seed^0x9e3779b9)>>>0,initialSeed:seed>>>0,build,phase:'map',stage:0,
    growth:{patience:0,relay:0,fortune:0},growthHistory:[],fortune:0,
    growthStats:{waitStrikes:0,patienceSwings:0,relayCreated:0,relayHits:0,fortuneEarned:0,fortuneUses:0},
    deck:BUILDS[build].cards.map((kind,i)=>({id:'c'+i,kind})),nextId:12,rewards:[],victories:0,battle:null,last:null,
    stats:{cards:0,pitches:0,runs:0,outs:0,appearances:0,hits:0,walks:0,fouls:0,whiffs:0,totalBases:0}};
}
export function startBattle(state){
  if(state.phase!=='map')return state;const s=clone(state);s.phase='battle';
  s.battle={turn:1,batterIndex:0,preparations:0,runSignal:false,results:[],history:[],outs:0,runs:0,strikes:0,balls:0,
    aim:0,aimZone:s.build==='pull'?3:s.build==='away'?5:4,expanded:false,patient:false,scouted:false,
    waitCharge:0,relayPending:0,relayActive:0,growthMode:'normal',
    bases:[null,null,null],hand:[],draw:shuffle(s,s.deck.map(c=>c.id)),discard:[],log:[],intent:null,pending:null,revealed:null};
  if(s.stage===0){s.battle.hand=['c0','c1','c2','c3','c4'];s.battle.draw=s.battle.draw.filter(id=>!s.battle.hand.includes(id));}else draw(s,5);
  dealPitch(s);s.last={kind:'start',text:'1번 강한결 입장 · 경향을 읽고 노릴 존과 스윙을 고르세요.',events:[],runs:0,outs:0};return s;
}
export function setAimZone(state,zone){
  if(state.phase!=='battle'||!Number.isInteger(zone)||zone<0||zone>8||state.battle.aimZone===zone)return state;
  const s=clone(state);s.battle.aimZone=zone;return s;
}
export function coverage(s,id='basic'){
  const def=id==='basic'?{shape:'point'}:CARDS[card(s,id)?.kind];if(!def||def.type==='skill')return [];
  const z=s.battle.aimZone,row=Math.floor(z/3),col=z%3;
  if(s.battle.growthMode==='patience'&&s.growth.patience&&s.battle.waitCharge>0&&def.shape!=='all')return [z];
  let zones=Array.from({length:9},(_,i)=>i).filter(i=>def.shape==='all'||def.shape==='row'&&Math.floor(i/3)===row
    ||def.shape==='column'&&i%3===col||def.shape==='cross'&&Math.abs(Math.floor(i/3)-row)+Math.abs(i%3-col)<=1||i===z);
  if(s.battle.expanded)zones=[...new Set(zones.flatMap(i=>[i,...Array.from({length:9},(_,j)=>j).filter(j=>Math.abs(Math.floor(i/3)-Math.floor(j/3))+Math.abs(i%3-j%3)===1)]))];
  return zones.sort((a,b)=>a-b);
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
export function publicProbabilities(s){
  const b=s.battle,p=b.intent.probabilities;
  if(!b.scouted||!b.pending)return [...p];
  const row=b.pending.zone===9?3:Math.floor(b.pending.zone/3);
  const visible=p.map((v,z)=>(z===9?3:Math.floor(z/3))===row?v:0),sum=visible.reduce((a,x)=>a+x,0);
  return visible.map(v=>v/sum);
}
export function pitchClue(s){
  if(!s.battle.scouted||!s.battle.pending)return null;
  return s.battle.pending.zone===9?'존 밖 볼 확인':['높은 공 확인','중간 높이 확인','낮은 공 확인'][Math.floor(s.battle.pending.zone/3)];
}
export function matchup(s,id='basic',zone=s.battle.aimZone){
  const b=s.battle,k=id==='basic'?'basic':card(s,id)?.kind;
  const base=BUILDS[s.build].stats,player=b.batterIndex;
  const hitter={technique:base.technique+[0,4,-2,2,-3,1,3,-1,0][player]+b.aim*8+b.relayActive*10,
    power:base.power+[0,-3,5,-1,4,0,-4,2,1][player]+b.aim*5,luck:base.luck};
  const pitcher=STAGES[s.stage].stats;
  const familiarity=BUILDS[s.build].zones.includes(zone)?12:0;
  const widthPenalty=Math.max(0,coverage(s,id).length-1)*7;
  const growthPower=b.growthMode==='patience'&&s.growth.patience?(12+12*s.growth.patience)*b.waitCharge:0;
  return {hitter,pitcher,familiarity,widthPenalty,growthPower,
    quality:hitter.technique+familiarity+(k==='strike'&&zone%3===2?12:0)-pitcher.movement,
    powerEdge:hitter.power+(CARDS[k]?.power||0)*18+familiarity-widthPenalty-pitcher.stuff+growthPower,
    luckEdge:hitter.luck-pitcher.command};
}
// Conditional hit types. Stats NEVER revoke a successful zone read.
export function hitProfile(s,id,zone){
  const k=id==='basic'?'basic':card(s,id).kind,m=matchup(s,id,zone);
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
  const b=s.battle,k=id==='basic'?'basic':card(s,id)?.kind,covered=coverage(s,id).includes(zone);
  if(zone===9)return {hit:0,foul:k==='defend'?.22:.08,out:0,whiff:k==='defend'?.78:.92,power:0,covered:false};
  if(k==='bunt')return {hit:0,foul:.30,out:0,whiff:0,sacrifice:.70,power:0,covered:true};
  if(!covered){const foul=clamp((k==='defend'?.42:.12)+(b.patient?.12:0),0,.65);return {hit:0,foul,out:0,whiff:1-foul,power:0,covered:false};}
  return {hit:1,foul:0,out:0,whiff:0,power:0,covered:true};
}
export function previewCard(s,id){
  const problem=cardProblem(s,id);if(problem)return {problem};
  if(id!=='basic'&&CARDS[card(s,id).kind].type==='skill')return {label:CARDS[card(s,id).kind].text};
  const odds=publicProbabilities(s).map((p,z)=>({p,o:swingOdds(s,id,z)}));
  const sum=key=>odds.reduce((v,{p,o})=>v+p*(o[key]||0),0);
  const hit=sum('hit'),types=hitProfile(s,id,s.battle.aimZone).map((t,i)=>({...t,p:hit?odds.reduce((v,{p,o},z)=>v+p*o.hit*hitProfile(s,id,z)[i].p,0)/hit:0}));
  const active=s.battle.relayActive;
  const growthText=s.battle.growthMode==='patience'?'기다림 '+s.battle.waitCharge+' 소비 · 한 존 · 파워 +'+matchup(s,id).growthPower:
    s.battle.growthMode==='fortune'?'비홈런 적중 시 행운 '+growthCost(s.growth.fortune)+' 소비 → 타자·기존 주자 추가 1베이스':'';
  return {label:id!=='basic'&&card(s,id).kind==='bunt'?'희생 작전 · 안타 보장 예외':'타격 범위 적중 = 안타 확정',coverage:coverage(s,id),hit,foul:sum('foul'),whiff:sum('whiff'),out:sum('out'),sacrifice:sum('sacrifice'),types,matchup:matchup(s,id),expectedBases:hit*types.reduce((v,t)=>v+t.p*t.bases,0),
    growthText:growthText+(active?' · 연결 사인: 기존 주자 추가 '+(active>=3?2:1)+'베이스':''),fortuneChance:s.battle.growthMode==='fortune'?hit*(1-types[0].p):0};
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
  if(b.runs>=STAGES[s.stage].target){s.victories++;s.phase=s.stage===3?'won':'reward';}else if(b.outs>=3)s.phase='lost';return s;
}
export function battingResult(s,id){
  const {zone,roll,powerRoll}=s.battle.pending,o=swingOdds(s,id,zone),k=id==='basic'?'basic':card(s,id).kind;
  let kind=roll<o.hit?'hit':roll<o.hit+o.foul?'foul':roll<o.hit+o.foul+(o.sacrifice||0)?'sacrifice':roll<o.hit+o.foul+(o.sacrifice||0)+o.out?'out':'whiff';
  let hitType=null;
  if(kind==='hit'){let q=powerRoll;const types=hitProfile(s,id,zone);hitType=types.at(-1);for(const t of types){q-=t.p;if(q<0){hitType=t;break;}}}
  return {kind,bases:hitType?.bases||0,zone,covered:o.covered,label:hitType?.label||{foul:k==='bunt'?'번트 파울':'파울',sacrifice:'희생 번트',out:'인플레이 아웃',whiff:'헛스윙'}[kind]};
}
function resolve(state,id){
  if(cardProblem(state,id||'basic'))return state;
  const s=clone(state),b=s.battle,before={runs:b.runs,outs:b.outs},events=[],growthEvents=[],pending=b.pending;
  const result=id?battingResult(s,id):{kind:pending.zone===9?'ball':'called',zone:pending.zone,label:pending.zone===9?'볼':'루킹 스트라이크'};
  const k=id==='basic'?'basic':id?card(s,id).kind:null;
  // Capture promises before consuming charges; reveal must show the coverage actually used.
  const usedCoverage=id?coverage(s,id):[],mode=b.growthMode;
  if(id&&id!=='basic'){b.hand.splice(b.hand.indexOf(id),1);b.discard.push(id);s.stats.cards++;}
  s.stats.pitches++;s.phase='pitch';
  const countBefore={balls:b.balls,strikes:b.strikes};
  if(result.kind==='hit'){
    const m=matchup(s,id,result.zone);events.push('존 적중 → 안타 확정 · 타격 '+m.hitter.technique+' vs 변화 '+m.pitcher.movement+' / 파워 '+m.hitter.power+' vs 구위 '+m.pitcher.stuff);
    s.stats.hits++;s.stats.totalBases+=result.bases;
    const fortunate=mode==='fortune'&&result.bases<4;
    if(fortunate){s.fortune-=growthCost(s.growth.fortune);s.growthStats.fortuneUses++;growthEvents.push('행운 해방 · 수비 혼선으로 타자·주자 추가 1베이스');}
    const relaySteps=b.relayActive?(b.relayActive>=3?2:1):0;
    if(relaySteps){s.growthStats.relayHits++;growthEvents.push('연결 사인 실현 · 기존 주자 추가 '+relaySteps+'베이스');}
    advance(s,Math.max(result.bases,k==='rally'?2:0)+(b.runSignal?1:0)+relaySteps+(fortunate?1:0),events);
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
  b.revealed={zone:pending.zone,label:result.label,kind:result.kind,coverage:usedCoverage,action:k||'take',growthEvents};
  b.history.push({zone:pending.zone,label:result.label,aimZone:id?b.aimZone:null,turn:b.turn,...countBefore});
  b.history=b.history.slice(-18);b.pending=null;b.scouted=false;if(id)b.expanded=false;
  events.unshift('실제 코스: '+(result.zone===9?'존 밖 볼':ZONES[result.zone]));
  if(s.phase==='pitch')events.push('같은 타자 · 다음 공에서 승부가 이어집니다.');
  return finalize(s,before,result.kind==='hit'?'hit':['out','sacrifice'].includes(result.kind)?'out':'pitch',currentBatter(s).name+' · '+result.label,events,growthEvents);
}
export function playCard(state,id){
  if(cardProblem(state,id))return state;
  if(id==='basic'||CARDS[card(state,id).kind].type==='attack')return resolve(state,id);
  const s=clone(state),b=s.battle,k=card(s,id).kind,before={runs:b.runs,outs:b.outs},events=[];
  b.hand.splice(b.hand.indexOf(id),1);b.discard.push(id);s.stats.cards++;b.preparations++;
  if(k==='setup')b.aim++;if(k==='watch')draw(s,2);
  if(k==='scout'){b.scouted=true;draw(s,1);events.push(pitchClue(s));}
  if(k==='lure')b.expanded=true;if(k==='flow')b.runSignal=true;
  if(k==='calm'){b.patient=true;draw(s,1);}
  return finalize(s,before,'skill',CARDS[k].name+' · 준비 '+b.preparations+'/2',events);
}
export const endTurn=state=>state.phase==='battle'?resolve(state,null):state;
export function advancePitch(state){
  if(state.phase!=='pitch')return state;const s=clone(state);s.phase='battle';draw(s,1);dealPitch(s);
  s.last={kind:'entry',text:currentBatter(s).name+' · 다음 공을 읽으세요.',events:[],runs:0,outs:0};return s;
}
export function advanceBatter(state){
  if(state.phase!=='between')return state;const s=clone(state),b=s.battle,index=(b.batterIndex+1)%9;
  if(b.bases.includes(LINEUP[index].id))return state;
  b.batterIndex=index;b.turn++;b.strikes=0;b.balls=0;b.aim=0;b.preparations=0;b.runSignal=false;b.expanded=false;b.patient=false;
  b.waitCharge=0;b.growthMode='normal';b.relayActive=b.relayPending;b.relayPending=0;
  s.phase='battle';draw(s,Math.max(0,5-b.hand.length));dealPitch(s);
  s.last={kind:'entry',text:(index+1)+'번 '+currentBatter(s).name+' 타석 입장',events:[],runs:0,outs:0};return s;
}
export function chooseCard(state,kind,growthKey){
  if(state.phase!=='reward'||(kind!=='skip'&&!rewardChoices(state.stage,growthKey).includes(kind))||!Object.hasOwn(GROWTHS,growthKey)||state.growth[growthKey]>=3)return state;
  const s=clone(state);if(kind!=='skip')s.deck.push({id:'c'+s.nextId++,kind});
  s.growth[growthKey]++;s.growthHistory.push(growthKey);s.rewards.push(kind);s.stage++;s.phase='map';s.battle=null;s.last=null;return s;
}
export function saveDuel(storage,s){storage.setItem(SAVE_KEY,JSON.stringify(s));}
export function readDuel(storage){
  const raw=storage.getItem(SAVE_KEY);if(!raw)return null;
  const s=JSON.parse(raw),int=(v,a,z)=>Number.isInteger(v)&&v>=a&&v<=z,fail=()=>{throw new Error('9존 저장 기록이 손상됐습니다.');};
  if(!s||s.version!==6||!Object.hasOwn(BUILDS,s.build)||!['seed','pitchSeed','initialSeed'].every(k=>int(s[k],0,0xffffffff))
    ||!int(s.stage,0,3)||!['map','battle','pitch','between','reward','won','lost'].includes(s.phase)
    ||!Array.isArray(s.deck)||!int(s.deck.length,12,15)||s.deck.some((c,i)=>!c||c.id!=='c'+i||!Object.hasOwn(CARDS,c.kind))
    ||s.nextId!==s.deck.length||!Array.isArray(s.rewards)||s.rewards.length!==s.stage||!s.rewards.every((k,i)=>k==='skip'||rewardChoices(i,s.growthHistory?.[i]).includes(k))
    ||!s.stats||!['cards','pitches','runs','outs','appearances','hits','walks','fouls','whiffs','totalBases'].every(k=>int(s.stats[k],0,100000)))fail();
  if(s.victories!==(s.phase==='won'?4:s.phase==='reward'?s.stage+1:s.stage)||s.phase==='won'&&s.stage!==3||s.phase==='reward'&&s.stage===3)fail();
  if(!s.growth||!Object.keys(GROWTHS).every(k=>int(s.growth[k],0,3))||!Array.isArray(s.growthHistory)||s.growthHistory.length!==s.stage
    ||!s.growthHistory.every(k=>Object.hasOwn(GROWTHS,k))||!Object.keys(GROWTHS).every(k=>s.growth[k]===s.growthHistory.filter(x=>x===k).length)
    ||!int(s.fortune,0,6)||!s.growthStats||!['waitStrikes','patienceSwings','relayCreated','relayHits','fortuneEarned','fortuneUses'].every(k=>int(s.growthStats[k],0,100000)))fail();
  const b=s.battle;if(!b){if(s.phase!=='map')fail();return s;}
  if(!['hand','draw','discard','results','history','log'].every(k=>Array.isArray(b[k]))||!Array.isArray(b.bases)||b.bases.length!==3
    ||!int(b.outs,0,3)||!int(b.strikes,0,3)||!int(b.balls,0,4)||!int(b.runs,0,100)||!int(b.aim,0,2)||!int(b.aimZone,0,8)
    ||!int(b.turn,1,100000)||!int(b.batterIndex,0,8)||b.batterIndex!==(b.turn-1)%9||!int(b.preparations,0,2)
    ||!int(b.waitCharge,0,2)||!int(b.relayPending,0,s.growth.relay)||!int(b.relayActive,0,s.growth.relay)||!['normal','patience','fortune'].includes(b.growthMode)
    ||b.growthMode==='patience'&&(!s.growth.patience||!b.waitCharge)||b.growthMode==='fortune'&&(!s.growth.fortune||s.fortune<growthCost(s.growth.fortune))
    ||!['runSignal','expanded','patient','scouted'].every(k=>typeof b[k]==='boolean')
    ||!b.log.every(t=>typeof t==='string')||!b.results.every(r=>r&&LINEUP.some(p=>p.id===r.batterId)&&typeof r.label==='string'&&int(r.turn,1,100000))
    ||!b.history.every(h=>h&&int(h.zone,0,9)&&typeof h.label==='string'&&(h.aimZone===null||int(h.aimZone,0,8))&&int(h.turn,1,b.turn)&&int(h.balls,0,3)&&int(h.strikes,0,2)))fail();
  const players=b.bases.filter(x=>x!==null),ids=[...b.hand,...b.draw,...b.discard];
  if(new Set(players).size!==players.length||!players.every(id=>LINEUP.some(p=>p.id===id))||ids.length!==s.deck.length||new Set(ids).size!==ids.length||!ids.every(id=>s.deck.some(c=>c.id===id))||b.hand.length>9)fail();
  if(!b.intent||!Array.isArray(b.intent.probabilities)||b.intent.probabilities.length!==10||!b.intent.probabilities.every(p=>Number.isFinite(p)&&p>=0&&p<=1)||Math.abs(b.intent.probabilities.reduce((a,x)=>a+x,0)-1)>1e-8)fail();
  if(s.phase==='battle'){if(!b.pending||!int(b.pending.zone,0,9)||!['roll','powerRoll'].every(k=>Number.isFinite(b.pending[k])&&b.pending[k]>=0&&b.pending[k]<1)||b.revealed!==null)fail();}
  else if(b.pending!==null||!b.revealed||!int(b.revealed.zone,0,9)||typeof b.revealed.label!=='string')fail();
  if(s.phase==='map'||['battle','pitch'].includes(s.phase)&&(b.outs>=3||b.strikes>=3||b.balls>=4||players.includes(currentBatter(s).id))
    ||['battle','pitch','between'].includes(s.phase)&&b.runs>=STAGES[s.stage].target
    ||s.phase==='between'&&(b.outs>=3||b.results.at(-1)?.turn!==b.turn)
    ||s.phase==='lost'&&(b.outs!==3||b.runs>=STAGES[s.stage].target)
    ||['reward','won'].includes(s.phase)&&b.runs<STAGES[s.stage].target)fail();
  if(!s.last||typeof s.last.text!=='string'||!Array.isArray(s.last.events)||!s.last.events.every(t=>typeof t==='string'))fail();
  return s;
}
