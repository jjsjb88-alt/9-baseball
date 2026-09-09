import { CARDS, OUTCOMES, READ_NAMES, PITCHERS, SAVE_KEY } from './data.js';

// This engine is independent of the retired prototype. Every roll is seeded;
// UI, replay, and policy tests consume the exact same state transitions.
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const copy = value => JSON.parse(JSON.stringify(value));
const rng = s => { s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0; return s.seed / 4294967296; };
const normalize = weights => { const sum = weights.reduce((a,b)=>a+b,0); return weights.map(x=>x/sum); };
const sample = (s, distribution) => { let n = rng(s); return distribution.findIndex((p,i)=> (n-=p) <= 0 || i===distribution.length-1); };
const shuffle = (s, list) => { for(let i=list.length-1;i>0;i--){ const j=Math.floor(rng(s)*(i+1)); [list[i],list[j]]=[list[j],list[i]]; } return list; };

export function pitchModel(s) {
  const rows = s.balls >= 2 ? [1,1.3,1] : [1.1,.9,1.25];
  const base = [8,7,10,8,5,10,11,10,12,19].map((x,i)=>i===9 ? x * (s.balls===3 ? .45 : 1) : x*rows[Math.floor(i/3)]);
  const publicOdds = normalize(base);
  const trueWeights = [...publicOdds];
  let tellZone = null, mix = 0;
  if(s.match===0 && s.strikes===2){ tellZone=7; mix=.60; }
  if(s.match===1 && s.history.at(-1)?.outcome==='ball'){ tellZone=2; mix=.48; }
  if(s.match===2 && s.strikes===2){ tellZone=3; mix=.45; }
  if(tellZone!==null) trueWeights.forEach((_,i)=>{trueWeights[i]=publicOdds[i]*(1-mix)+(i===tellZone?mix:0);});
  if(s.match>0) for(const z of s.aims.slice(s.match===1?-3:-6)) trueWeights[z] *= s.match===1?.82:.72;
  return { publicOdds, trueOdds: normalize(trueWeights) };
}

function preparePitch(s) {
  s.pitchSeed = s.seed;
  const model = pitchModel(s);
  const actual = sample(s,model.trueOdds);
  const type = rng(s) < (s.match===0?.7:s.match===1?.4:.5) ? '직구' : s.match===1?'체인지업':'슬라이더';
  s.pitch = { ...model, actual, type, speed: Math.round((type==='직구'?145:128)+rng(s)*9) };
  s.phase = 'pitch';
  return s;
}
function draw(s, amount) {
  while(amount-- > 0 && s.hand.length<4){
    if(!s.draw.length) s.draw = shuffle(s,s.discard.splice(0));
    if(!s.draw.length) break;
    s.hand.push(s.draw.pop());
  }
}
function resetHand(s) { s.draw=shuffle(s,[...s.deck]); s.hand=[]; s.discard=[]; draw(s,4); }
export function newRun(seed = Date.now() >>> 0) {
  const s = { version:1,seed:seed>>>0,phase:'brief',match:0,inning:1,outs:0,balls:0,strikes:0,paPitches:0,
    score:0,bases:[false,false,false],focus:3,mastery:[1,3,4,7],contactBonus:0,powerBonus:0,focusBonus:0,
    deck:['drive','drive','drive','contact','contact','power','power','cover','cover','cut'],hand:[],draw:[],discard:[],
    history:[],aims:[],matches:[],rewards:[],last:null,pitch:null,pitchSeed:null,
    stats:{pitches:0,pa:0,hits:0,homeRuns:0,reads:0,runs:0},elapsedMs:0 };
  resetHand(s); return s;
}
export function startMatch(state) {
  if(state.phase!=='brief') return state;
  return preparePitch(copy(state));
}

// CQ controls contact only; PQ is rolled only after contact. Exact reads are
// advantageous, not guaranteed hits. Focus is a risk wager, not a free bonus.
export function contactRoll({read,card,mastered,wager,power,contactBonus=0,powerBonus=0}, random) {
  const precise = read==='exact'||read==='deep';
  const cqRead = {exact:26,deep:32,covered:13,near:3,wrong:-22,chase:-38}[read];
  const cqCard = {drive:8,contact:22,power:-16,cover:8,cut:12,basic:0}[card];
  const cq = clamp(55+cqRead+cqCard+(mastered?8:-10)+contactBonus-power*.1 + wager*(precise?5:-9)+(random()-.5)*16,8,96);
  if(random() > cq/100){
    if(card==='cut'&&random()<.65)return {outcome:'foul',cq,pq:0};
    return {outcome:'miss',cq,pq:0};
  }
  if(random()<.15) return {outcome:'foul',cq,pq:0};
  const pq = clamp(42+(precise?18:read==='covered'?-8:-14)+(mastered?8:-8)+powerBonus+
    ({drive:6,contact:-14,power:precise?28:-10,cover:-18,cut:-10,basic:0}[card])+wager*(precise?8:-4)+(random()-.5)*24,0,110);
  if(random()<.32)return {outcome:'out',cq,pq};
  if(pq>=80 && random()<.32)return {outcome:'homerun',cq,pq};
  if(pq>=67 && random()<.42)return {outcome:'double',cq,pq};
  if(pq>=75 && random()<.06)return {outcome:'triple',cq,pq};
  return {outcome:'single',cq,pq};
}

export function advanceBases(bases, outcome) {
  const b = [...bases]; let runs=0;
  if(outcome==='walk'){
    if(b[0]){ if(b[1]){ if(b[2]) runs++; b[2]=true; } b[1]=true; } b[0]=true;
    return {bases:b,runs};
  }
  const distance = {single:1,double:2,triple:3,homerun:4}[outcome];
  if(!distance)return {bases:b,runs};
  const next=[false,false,false];
  for(let i=0;i<3;i++) if(b[i]){if(i+distance>=3)runs++;else next[i+distance]=true;}
  if(distance===4)runs++;else next[distance-1]=true;
  return {bases:next,runs};
}

export function commitPitch(state, {zone,cardIndex=null,wager=0,take=false}) {
  if(state.phase!=='pitch')return state;
  if(!take && (!Number.isInteger(zone)||zone<0||zone>8))return state;
  if(!Number.isInteger(wager)||wager<0||wager>2||wager>state.focus)return state;
  if(cardIndex!==null && (!Number.isInteger(cardIndex)||!state.hand[cardIndex]))return state;
  const s = copy(state), pitch=s.pitch;
  const card = take||cardIndex===null?'basic':s.hand[cardIndex];
  let read='take', resolved;
  if(take) resolved={outcome:pitch.actual===9?'ball':'strike',cq:0,pq:0};
  else {
    const distance = pitch.actual===9?99:Math.abs(zone%3-pitch.actual%3)+Math.abs(Math.floor(zone/3)-Math.floor(pitch.actual/3));
    read=pitch.actual===9?'chase':zone===pitch.actual?(pitch.trueOdds[zone]-pitch.publicOdds[zone]>.15?'deep':'exact'):
      card==='cover'&&Math.floor(zone/3)===Math.floor(pitch.actual/3)&&distance===1?'covered':distance===1?'near':'wrong';
    resolved=contactRoll({read,card,mastered:s.mastery.includes(pitch.actual),wager,power:PITCHERS[s.match].power,
      contactBonus:s.contactBonus,powerBonus:s.powerBonus},()=>rng(s));
    if(cardIndex!==null)s.discard.push(s.hand.splice(cardIndex,1)[0]);
    s.focus-=wager; s.aims=[...s.aims,zone].slice(-24);
  }
  let outcome=resolved.outcome;
  s.paPitches++; s.stats.pitches++;
  if(outcome==='ball') {s.balls++;if(s.balls===4)outcome='walk';}
  if(outcome==='strike'||outcome==='miss') {s.strikes++;if(s.strikes===3)outcome='strikeout';}
  if(outcome==='foul')s.strikes=Math.min(2,s.strikes+1);
  // A hard cap is explained in the rules; never produce an unbounded foul loop.
  if(s.paPitches>=12 && ['ball','strike','miss','foul'].includes(outcome))outcome='walk';
  const terminal=!['ball','strike','miss','foul'].includes(outcome);
  const moved=advanceBases(s.bases,outcome); s.bases=moved.bases; s.score+=moved.runs; s.stats.runs+=moved.runs;
  if(outcome==='out'||outcome==='strikeout')s.outs++;
  if(['single','double','triple','homerun'].includes(outcome))s.stats.hits++;
  if(outcome==='homerun')s.stats.homeRuns++;
  if(read==='exact'||read==='deep')s.stats.reads++;
  s.focus=Math.min(5,s.focus+(take||read==='exact'||read==='deep'?1:0));
  if(terminal){s.stats.pa++;s.balls=0;s.strikes=0;s.paPitches=0;draw(s,1);}
  const report={outcome,read,actual:pitch.actual,type:pitch.type,speed:pitch.speed,zone:take?null:zone,
    card,spent:take?0:wager,runs:moved.runs,terminal,cq:Math.round(resolved.cq),pq:Math.round(resolved.pq),
    balls:state.balls,strikes:state.strikes,match:s.match,inning:s.inning};
  s.history=[...s.history,report].slice(-80);s.last=report;s.pitch=null;s.phase='result';
  return s;
}

export function rewardOptions(s) {
  const unmastered=[6,8,0,2,5].find(z=>!s.mastery.includes(z));
  return [
    unmastered!==undefined?{id:'mastery',zone:unmastered,title:'새로운 핫존',text:'새 코스를 숙련존으로. 그곳의 접촉과 타구 질이 좋아집니다.',tag:'코스 확장'}:
      {id:'power',title:'스윙 궤도',text:'모든 타격의 타구 질 +4.',tag:'타격 훈련'},
    {id:'contact',title:'배트 컨트롤',text:'모든 타격의 접촉 품질 +3. 강화는 런 동안 유지됩니다.',tag:'안정성'},
    {id:'focus',title:'차분한 호흡',text:'즉시 집중을 5로. 다음 이닝부터 시작 집중 +1 (최대 5).',tag:'승부 자원'},
  ];
}
export function nextPitch(state) {
  if(state.phase!=='result')return state;
  const s=copy(state);
  if(s.last.terminal&&s.outs===9){
    const won=s.score>=PITCHERS[s.match].target;
    s.matches.push({match:s.match,score:s.score,won});
    if(!won||s.match===2){s.phase='finished';s.won=won;return s;}
    s.phase='bench';s.nextMatch=true;return s;
  }
  if(s.last.terminal && s.outs>0 && s.outs%3===0 && ['out','strikeout'].includes(s.last.outcome)){
    s.phase='bench';s.nextMatch=false;return s;
  }
  return preparePitch(s);
}
export function chooseReward(state,id) {
  if(state.phase!=='bench')return state;
  const option=rewardOptions(state).find(o=>o.id===id);if(!option)return state;
  const s=copy(state);
  if(id==='mastery')s.mastery.push(option.zone);
  if(id==='contact')s.contactBonus+=3;
  if(id==='power')s.powerBonus+=4;
  if(id==='focus')s.focusBonus=Math.min(2,s.focusBonus+1);
  s.focus=id==='focus'?5:Math.min(5,3+s.focusBonus);s.rewards.push(option.title);
  s.bases=[false,false,false];resetHand(s);
  if(s.nextMatch){s.match++;s.inning=1;s.outs=0;s.score=0;s.phase='brief';s.last=null;s.nextMatch=false;return s;}
  s.inning++; return preparePitch(s);
}

export function serializeRun(state) {
  // Do not write hidden pitch distributions or the unrevealed actual zone.
  const s=copy(state); delete s.pitch; return JSON.stringify(s);
}
export function readRun(storage) {
  const raw=storage.getItem(SAVE_KEY);if(!raw)return null;
  const s=JSON.parse(raw);
  const nonneg=['outs','balls','strikes','paPitches','focus','score','elapsedMs','contactBonus','powerBonus','focusBonus'];
  if(!s||s.version!==1||!Number.isInteger(s.seed)||s.seed<0||s.seed>0xffffffff||!Number.isInteger(s.match)||!PITCHERS[s.match]||!['brief','pitch','result','bench','finished'].includes(s.phase)
    ||!nonneg.every(k=>Number.isFinite(s[k])&&s[k]>=0)||s.outs>9||s.balls>3||s.strikes>2||s.focus>5
    ||!Number.isInteger(s.inning)||s.inning<1||s.inning>3
    ||!['hand','deck','draw','discard'].every(k=>Array.isArray(s[k])&&s[k].every(c=>Object.hasOwn(CARDS,c)))
    ||s.hand.length>4||s.deck.length!==10||s.deck.length!==s.hand.length+s.draw.length+s.discard.length
    ||!Array.isArray(s.mastery)||!s.mastery.every(z=>Number.isInteger(z)&&z>=0&&z<=8)
    ||!Array.isArray(s.history)||!Array.isArray(s.aims)||!Array.isArray(s.matches)||!Array.isArray(s.rewards)
    ||!s.stats||!['pitches','pa','hits','homeRuns','reads','runs'].every(k=>Number.isFinite(s.stats[k])&&s.stats[k]>=0)
    ||(s.phase==='result'&&!s.last))throw new Error('저장 데이터를 읽을 수 없습니다.');
  const validReport = h => h && Object.hasOwn(OUTCOMES,h.outcome) && Object.hasOwn(READ_NAMES,h.read)
    && Number.isInteger(h.actual)&&h.actual>=0&&h.actual<=9
    && Number.isInteger(h.match)&&!!PITCHERS[h.match]&&['직구','체인지업','슬라이더'].includes(h.type)
    && Number.isFinite(h.speed)&&typeof h.terminal==='boolean'
    && [h.balls,h.strikes,h.runs].every(n=>Number.isInteger(n)&&n>=0);
  const allCards=[...s.hand,...s.draw,...s.discard].sort().join(',');
  if(!['outs','balls','strikes','paPitches','focus','score'].every(k=>Number.isInteger(s[k]))||s.paPitches>11
    ||!Array.isArray(s.bases)||s.bases.length!==3||!s.bases.every(x=>typeof x==='boolean')
    ||s.history.length>80||!s.history.every(validReport)||(s.last&&!validReport(s.last))
    ||!s.aims.every(z=>Number.isInteger(z)&&z>=0&&z<=8)
    ||!s.rewards.every(r=>typeof r==='string')||s.rewards.length>8
    ||!s.matches.every(m=>m&&Number.isInteger(m.match)&&PITCHERS[m.match]&&Number.isInteger(m.score)&&m.score>=0&&typeof m.won==='boolean')
    ||s.deck.slice().sort().join(',')!==allCards
    ||(s.phase==='finished'&&typeof s.won!=='boolean'))throw new Error('저장 기록의 주자·카드·투구 정보가 손상됐습니다.');
  if(s.phase==='pitch'){
    if(!Number.isInteger(s.pitchSeed))throw new Error('투구 체크포인트가 손상됐습니다.');
    const next=preparePitch({...s,seed:s.pitchSeed});s.pitch=next.pitch;
  }else s.pitch=null;
  return s;
}
