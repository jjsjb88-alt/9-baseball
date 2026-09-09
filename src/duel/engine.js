import {CARDS,REWARDS,SAVE_KEY,STAGES,LINEUP} from './cards.js';
const clone=s=>JSON.parse(JSON.stringify(s));
const card=(s,id)=>s.deck.find(c=>c.id===id);
export const currentBatter=s=>LINEUP[s.battle.batterIndex];
const playerName=id=>LINEUP.find(p=>p.id===id)?.name||'알 수 없는 선수';
function shuffle(s,a){for(let i=a.length-1;i>0;i--){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;const j=Math.floor(s.seed/4294967296*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function draw(s,n){const b=s.battle;while(n-->0&&b.hand.length<9){if(!b.draw.length)b.draw=shuffle(s,b.discard.splice(0));if(!b.draw.length)break;b.hand.push(b.draw.pop());}}
export function baseIntent(s){
  const b=s.battle,style=STAGES[s.stage].style;
  if(b.forced)return {kind:'fastball',name:'끌어낸 직구',need:2,detail:'승부구 끌어내기로 이번 타석의 의도를 고정했습니다.'};
  if(b.strikes===2)return {kind:'putaway',name:'투스트라이크 결정구',need:style==='closer'?5:4,detail:'2스트라이크에 몰렸습니다. 컨택 요구치 상승. 작전 카드는 더 쓸 수 없습니다.'};
  if(b.bases[0]&&(style==='sinker'||!b.bases[1]))return {kind:'sinker',name:'병살 유도 · 낮은 싱커',need:3,detail:'1루 주자를 노립니다. 컨택 미달 시 타자와 1루 주자가 함께 아웃됩니다.'};
  if(style==='deep'&&b.bases.some(Boolean))return {kind:'deep',name:'장타 봉쇄 · 외야 후퇴',need:2,detail:'주자가 있어 외야를 뒤로 보냈습니다. 장타를 단타로 줄입니다. 번트·진루는 막지 못합니다.'};
  if(b.bases[1]||b.bases[2])return {kind:'breaking',name:'득점권 · 바깥 변화구',need:3,detail:'득점권 주자가 생겨 변화구로 전환했습니다. 주자 수를 힘으로 바꾸거나 카운트를 거래하세요.'};
  return {kind:'fastball',name:'초구 승부 · 직구',need:2,detail:'주자가 없어 정면 승부합니다. 밀어치기의 컨택이 1 증가합니다.'};
}
export function createDuel(seed=Date.now()>>>0){
  const kinds=['strike','slug','setup','watch','calm','strike','rally','bunt','setup','scout','lure','strike'];
  return {version:3,seed:seed>>>0,phase:'map',stage:0,deck:kinds.map((kind,i)=>({id:`c${i}`,kind})),nextId:12,rewards:[],victories:0,battle:null,last:null,stats:{cards:0,pitches:0,runs:0,outs:0,appearances:0}};
}
export function startBattle(state){
  if(state.phase!=='map')return state;const s=clone(state);s.phase='battle';
  s.battle={turn:1,batterIndex:0,preparations:0,runSignal:false,results:[],outs:0,runs:0,strikes:0,aim:0,forced:false,bases:[null,null,null],hand:[],draw:shuffle(s,s.deck.map(c=>c.id)),discard:[],log:[],intent:null};
  if(s.stage===0){s.battle.hand=['c0','c1','c2','c3','c4'];s.battle.draw=s.battle.draw.filter(id=>!s.battle.hand.includes(id));}else draw(s,5);
  s.battle.intent=baseIntent(s);s.last={kind:'start',text:'1번 강한결 입장 · 준비 카드를 연계한 뒤 스윙 한 번으로 타석을 끝냅니다.',events:[],runs:0,outs:0};return s;
}
export function cardProblem(s,id){
  if(s.phase!=='battle')return s.phase==='between'?'타석이 끝났습니다. 다음 타자를 입장시키세요.':'진행 중인 승부가 아닙니다.';
  const c=card(s,id),b=s.battle;if(!c||!b.hand.includes(id))return '손패에 없는 카드입니다.';
  if(CARDS[c.kind].type==='skill'&&b.preparations>=2)return '이번 타석의 준비 2회를 모두 사용했습니다.';
  if(c.kind==='flow'&&!b.bases.some(Boolean))return '먼저 베이스에 주자가 필요합니다.';return null;
}

function home(s,id,events){
  s.battle.runs++;s.stats.runs++;events.push(playerName(id)+' 홈인 · +1점');
}
function advance(s,steps,events,leadOnly=false){
  const b=s.battle;
  for(let i=2;i>=0;i--){
    const id=b.bases[i];if(!id)continue;b.bases[i]=null;
    if(i+steps>=3)home(s,id,events);
    else {b.bases[i+steps]=id;events.push(playerName(id)+': '+(i+1)+'루 → '+(i+steps+1)+'루');}
    if(leadOnly)break;
  }
}
function finishPA(s,label){
  const b=s.battle;
  b.results.push({batterId:currentBatter(s).id,label,turn:b.turn});
  s.stats.appearances++;
  // A completed plate appearance is a persistent, engine-enforced gate, not an animation timer.
  s.phase='between';
}
export function advanceBatter(state){
  if(state.phase!=='between')return state;
  const s=clone(state),b=s.battle,index=(b.batterIndex+1)%LINEUP.length;
  if(b.bases.includes(LINEUP[index].id))return state;
  b.batterIndex=index;b.turn++;b.strikes=0;b.aim=0;b.forced=false;b.preparations=0;b.runSignal=false;
  s.phase='battle';draw(s,Math.max(0,5-b.hand.length));b.intent=baseIntent(s);
  s.last={kind:'entry',text:(index+1)+'번 '+currentBatter(s).name+' 타석 입장',events:['이전 타석 종료 확인 · 새로운 타자의 첫 공입니다.'],runs:0,outs:0};
  return s;
}
function finalize(s,before,kind,name,events){
  const b=s.battle;s.last={kind,text:name,events,runs:b.runs-before.runs,outs:b.outs-before.outs};b.log=[name,...events,...b.log].slice(0,12);s.stats.outs+=b.outs-before.outs;
  if(b.runs>=STAGES[s.stage].target){s.victories++;s.phase=s.stage===3?'won':'reward';}else if(b.outs>=3)s.phase='lost';if(s.phase==='battle')b.intent=baseIntent(s);return s;
}
export function battingResult(s,id){
  const c=card(s,id),b=s.battle,k=c.kind;
  if(k==='bunt'||k==='defend')return {kind:'sacrifice',outs:1,bases:0,label:b.outs===2?'3아웃 · 득점 무효':k==='bunt'?'희생 번트 · 전원 1베이스':'진루타 · 선두 주자 2베이스'};
  let contact=CARDS[k].contact+b.aim;if(k==='strike'&&b.intent.kind==='fastball')contact++;
  if(k==='rally')contact+=b.bases.filter(Boolean).length;if(k==='finisher')contact+=b.outs;
  if(contact<b.intent.need){const dp=b.intent.kind==='sinker'&&b.bases[0]&&b.outs<2;return {kind:'out',outs:dp?2:1,bases:0,contact,label:dp?'병살 · 타자와 1루 주자 아웃':'타자 아웃'};}
  let bases=k==='slug'?(b.aim>=3?4:2):k==='finisher'?(b.outs===2?3:2):1;if(b.intent.kind==='deep')bases=1;
  return {kind:'hit',outs:0,bases,contact,advance:k==='rally'?2:bases,label:['','단타','2루타','3루타','홈런'][bases]};
}

export function playCard(state,id){
  if(cardProblem(state,id))return state;
  const s=clone(state),b=s.battle,c=card(s,id),def=CARDS[c.kind],before={runs:b.runs,outs:b.outs},events=[];
  const result=def.type==='attack'?battingResult(s,id):null;
  b.hand.splice(b.hand.indexOf(id),1);b.discard.push(id);s.stats.cards++;
  let name=def.name,fx='skill';
  if(def.type==='skill'){
    b.preparations++;
    if(c.kind==='setup')b.aim+=2;
    if(c.kind==='scout'){b.aim++;draw(s,2);}
    if(c.kind==='watch')draw(s,3);
    if(c.kind==='lure'){b.forced=true;fx='lure';}
    if(c.kind==='flow'){b.runSignal=true;events.push('히트앤드런 사인 · 이번 타격 성공 시 기존 주자 추가 진루');}
    if(c.kind==='calm'){b.aim++;draw(s,1);}
    name+=' · 준비 '+b.preparations+'/2';
  }else{
    const batter=currentBatter(s);s.stats.pitches++;
    fx=result.kind==='hit'?'hit':'out';name=batter.name+' · '+def.name+' · '+result.label;
    if(result.kind==='out'){
      b.outs=Math.min(3,b.outs+result.outs);
      if(result.outs===2){events.push(playerName(b.bases[0])+'도 아웃 · 병살');b.bases[0]=null;}
    }else if(result.kind==='sacrifice'){
      b.outs++;
      if(b.outs<3)advance(s,c.kind==='bunt'?1:2,events,c.kind==='defend');
      else events.push('세 번째 아웃: 진루와 득점은 없습니다.');
    }else{
      advance(s,result.advance+(b.runSignal?1:0),events);
      if(result.bases===4)home(s,batter.id,events);
      else {b.bases[result.bases-1]=batter.id;events.push(batter.name+' → '+result.bases+'루');}
    }
    events.push(def.name+' 행동 카드는 버린 더미로 이동 · '+batter.name+' 타석 종료');
    finishPA(s,result.label);
  }
  return finalize(s,before,fx,name,events);
}
export function endTurn(state){
  if(state.phase!=='battle')return state;
  const s=clone(state),b=s.battle,before={runs:b.runs,outs:b.outs};
  s.stats.pitches++;b.strikes++;
  let name=currentBatter(s).name+' · 한 구 지켜보기 · 스트라이크 +1';
  if(b.strikes===3){b.outs++;name=currentBatter(s).name+' 루킹 삼진 · 타석 종료';finishPA(s,'루킹 삼진');}
  else draw(s,1);
  return finalize(s,before,'pitch',name,[]);
}
export function previewCard(s,id){const problem=cardProblem(s,id);if(problem)return {problem};const after=playCard(s,id),c=card(s,id);return {label:CARDS[c.kind].type==='attack'?battingResult(s,id).label:CARDS[c.kind].name,runs:after.last.runs,outs:after.last.outs,events:after.last.events,bases:after.battle.bases,contact:CARDS[c.kind].type==='attack'?battingResult(s,id).contact:null};}
export function chooseCard(state,kind){if(state.phase!=='reward'||(kind!=='skip'&&!REWARDS[state.stage].includes(kind)))return state;const s=clone(state);if(kind!=='skip')s.deck.push({id:`c${s.nextId++}`,kind});s.rewards.push(kind);s.stage++;s.phase='map';s.battle=null;s.last=null;return s;}
export function saveDuel(storage,s){storage.setItem(SAVE_KEY,JSON.stringify(s));}

export function readDuel(storage){
  const raw=storage.getItem(SAVE_KEY);if(!raw)return null;
  const s=JSON.parse(raw),int=(v,a,z)=>Number.isInteger(v)&&v>=a&&v<=z;
  const fail=()=>{throw new Error('선수·타석 저장 기록이 손상됐습니다.');};
  if(!s||s.version!==3||!int(s.seed,0,0xffffffff)||!int(s.stage,0,3)
    ||!['map','battle','between','reward','won','lost'].includes(s.phase)
    ||!Array.isArray(s.deck)||!int(s.deck.length,12,15)
    ||s.deck.some((c,i)=>!c||c.id!=='c'+i||!Object.hasOwn(CARDS,c.kind))
    ||s.nextId!==s.deck.length||!Array.isArray(s.rewards)||s.rewards.length!==s.stage
    ||!s.rewards.every((k,i)=>k==='skip'||REWARDS[i].includes(k))
    ||!s.stats||!['cards','pitches','runs','outs','appearances'].every(k=>int(s.stats[k],0,100000)))fail();
  if(s.victories!==(s.phase==='won'?4:s.phase==='reward'?s.stage+1:s.stage)
    ||s.phase==='won'&&s.stage!==3||s.phase==='reward'&&s.stage===3)fail();
  const b=s.battle;if(!b){if(s.phase!=='map')fail();return s;}
  if(!['hand','draw','discard'].every(k=>Array.isArray(b[k]))||!Array.isArray(b.bases)||b.bases.length!==3
    ||!int(b.outs,0,3)||!int(b.strikes,0,3)||!int(b.runs,0,100)||!int(b.aim,0,100)
    ||!int(b.turn,1,100000)||!int(b.batterIndex,0,8)||!int(b.preparations,0,2)
    ||typeof b.forced!=='boolean'||typeof b.runSignal!=='boolean'
    ||!Array.isArray(b.log)||!b.log.every(t=>typeof t==='string')
    ||!Array.isArray(b.results)||!b.results.every(r=>r&&LINEUP.some(p=>p.id===r.batterId)&&typeof r.label==='string'&&int(r.turn,1,100000)))fail();
  if(b.batterIndex!==(b.turn-1)%9)fail();
  const players=b.bases.filter(x=>x!==null),ids=[...b.hand,...b.draw,...b.discard];
  if(new Set(players).size!==players.length||!players.every(id=>LINEUP.some(p=>p.id===id))
    ||ids.length!==s.deck.length||new Set(ids).size!==ids.length||!ids.every(id=>s.deck.some(c=>c.id===id)))fail();
  if(b.hand.length>9||s.phase==='map'
    ||s.phase==='battle'&&(b.outs>=3||b.strikes>=3||b.runs>=STAGES[s.stage].target||players.includes(currentBatter(s).id))
    ||s.phase==='between'&&(b.outs>=3||b.runs>=STAGES[s.stage].target||b.results.at(-1)?.turn!==b.turn)
    ||s.phase==='lost'&&(b.outs!==3||b.runs>=STAGES[s.stage].target)
    ||['reward','won'].includes(s.phase)&&b.runs<STAGES[s.stage].target)fail();
  if(!s.last||!Array.isArray(s.last.events)||typeof s.last.text!=='string'||!s.last.events.every(t=>typeof t==='string'))fail();
  if(s.phase==='battle')b.intent=baseIntent(s);
  else if(!b.intent||typeof b.intent.name!=='string'||typeof b.intent.detail!=='string'||!int(b.intent.need,1,10))fail();
  return s;
}
