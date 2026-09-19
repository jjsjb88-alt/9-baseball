import {CARDS} from '../src/duel/cards.js';
import {createV10Duel,enterV10Node,setAimZone,previewV10Stack} from '../src/duel/engine.js';
import {PITCHER_DAMAGE} from '../src/duel/pitcher-hp.js';

const seedCount=Math.max(20,Number(process.argv[2]||80));
const candidates=[-1,0,1,2];

const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
const round=x=>Math.round(x*1000)/1000;
const pct=x=>Math.round(x*10000)/100;

function hitDamage(bases){
  if(bases>=4)return PITCHER_DAMAGE.homeRun;
  if(bases===3)return PITCHER_DAMAGE.triple;
  if(bases===2)return PITCHER_DAMAGE.double;
  return PITCHER_DAMAGE.single;
}
function expectedBaseDamage(p){
  const hit=(p.hit||0)*(p.types||[]).reduce((sum,t)=>sum+(t.p||0)*hitDamage(t.bases||1),0);
  return hit+(p.foul||0)*PITCHER_DAMAGE.foul+(p.whiff||0)*PITCHER_DAMAGE.whiff
    +(p.out||0)*PITCHER_DAMAGE.inPlayOut+(p.sacrifice||0)*PITCHER_DAMAGE.inPlayOut;
}
function firstBattle(seed){
  let s=createV10Duel(seed);
  const nodeIds=[...(s.runMap?.reachableIds||[]),'a1-entry'];
  const id=nodeIds.find(id=>{
    const n=s.runMap?.nodes?.find(x=>x.id===id);
    return n&&['battle','elite','boss'].includes(n.type);
  });
  if(!id)return null;
  s=enterV10Node(s,id);
  return s?.phase==='battle'?s:null;
}
function bestForKind(state,kind){
  const ids=(state.battle.hand||[]).filter(id=>state.deck.find(c=>c.id===id)?.kind===kind);
  let best=null;
  for(const id of ids){
    for(let zone=0;zone<9;zone++){
      const s=setAimZone(state,zone);
      const p=previewV10Stack(s,id,[]);
      if(p.problem)continue;
      const expectedHp=expectedBaseDamage(p)*(p.damageRate??1);
      const row={kind,id,zone,expectedHp,hit:p.hit||0,coverage:p.coverage?.length||0,hr:p.hr||0};
      if(!best||row.expectedHp>best.expectedHp+1e-9)best=row;
    }
  }
  return best;
}

const original=CARDS.place.power;
const results=[];
for(const power of candidates){
  CARDS.place.power=power;
  const wins={place:0,strike:0,tie:0};
  const placeHp=[],strikeHp=[],gaps=[];
  const samples=[];
  for(let seed=0;seed<seedCount;seed++){
    const s=firstBattle(seed);
    if(!s)continue;
    const place=bestForKind(s,'place'),strike=bestForKind(s,'strike');
    if(!place||!strike)continue;
    placeHp.push(place.expectedHp);strikeHp.push(strike.expectedHp);
    const gap=place.expectedHp-strike.expectedHp;gaps.push(gap);
    if(Math.abs(gap)<1e-9)wins.tie++;
    else if(gap>0)wins.place++;
    else wins.strike++;
    samples.push({seed,place,strike,gap});
  }
  const total=wins.place+wins.strike+wins.tie;
  results.push({
    placePower:power,
    states:total,
    wins,
    shares:{place:pct(wins.place/total),strike:pct(wins.strike/total),tie:pct(wins.tie/total)},
    avgBestExpectedHp:{place:round(mean(placeHp)),strike:round(mean(strikeHp)),gap:round(mean(gaps))},
    gapRange:{min:round(Math.min(...gaps)),max:round(Math.max(...gaps))},
    representative:{
      placeFavored:samples.filter(x=>x.gap>0).sort((a,b)=>b.gap-a.gap).slice(0,3),
      strikeFavored:samples.filter(x=>x.gap<0).sort((a,b)=>a.gap-b.gap).slice(0,3),
    },
  });
}
CARDS.place.power=0;
const precisionCandidates=[.35,.50,.65];
const precisionResults=[];
for(const bonus of precisionCandidates){
  const wins={place:0,strike:0,tie:0};
  const placeHp=[],strikeHp=[],gaps=[];
  for(let seed=0;seed<seedCount;seed++){
    const state=firstBattle(seed);
    if(!state)continue;
    const place=bestForKind(state,'place'),strike=bestForKind(state,'strike');
    if(!place||!strike)continue;
    // Precision applies only to successful MAIN-card contact. Whiff/foul chip damage is not amplified.
    let bestPrecise=null;
    const ids=(state.battle.hand||[]).filter(id=>state.deck.find(c=>c.id===id)?.kind==='place');
    for(const id of ids){
      for(let zone=0;zone<9;zone++){
        const ss=setAimZone(state,zone),p=previewV10Stack(ss,id,[]);
        if(p.problem)continue;
        const hitBase=(p.hit||0)*(p.types||[]).reduce((sum,t)=>sum+(t.p||0)*hitDamage(t.bases||1),0);
        const nonHit=(p.foul||0)*PITCHER_DAMAGE.foul+(p.whiff||0)*PITCHER_DAMAGE.whiff
          +(p.out||0)*PITCHER_DAMAGE.inPlayOut+(p.sacrifice||0)*PITCHER_DAMAGE.inPlayOut;
        const expectedHp=hitBase*(1+bonus)+nonHit;
        const row={kind:'place',id,zone,expectedHp,hit:p.hit||0,coverage:p.coverage?.length||0};
        if(!bestPrecise||row.expectedHp>bestPrecise.expectedHp+1e-9)bestPrecise=row;
      }
    }
    const gap=bestPrecise.expectedHp-strike.expectedHp;
    placeHp.push(bestPrecise.expectedHp);strikeHp.push(strike.expectedHp);gaps.push(gap);
    if(Math.abs(gap)<1e-9)wins.tie++;
    else if(gap>0)wins.place++;
    else wins.strike++;
  }
  const total=wins.place+wins.strike+wins.tie;
  precisionResults.push({
    placePower:0,
    precisionBonus:bonus,
    states:total,
    wins,
    shares:{place:pct(wins.place/total),strike:pct(wins.strike/total),tie:pct(wins.tie/total)},
    avgBestExpectedHp:{place:round(mean(placeHp)),strike:round(mean(strikeHp)),gap:round(mean(gaps))},
    gapRange:{min:round(Math.min(...gaps)),max:round(Math.max(...gaps))},
  });
}
CARDS.place.power=original;

console.log(JSON.stringify({
  seeds:seedCount,
  baseline:{placePower:original,strikePower:CARDS.strike.power,placeShape:CARDS.place.shape,strikeShape:CARDS.strike.shape},
  candidates:results,
  precisionCandidates:precisionResults,
},null,2));
