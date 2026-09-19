import {
  V10_SWING_DAMAGE_RATES,V11_STACK_CONNECT_BONUS,
  createV10Duel,enterV10Node,setAimZone,previewV10Stack,v11StackPlan,
} from '../src/duel/engine.js';
import {CARDS} from '../src/duel/cards.js';
import {PITCHER_DAMAGE} from '../src/duel/pitcher-hp.js';
import {v10RelicDamageRate} from '../src/duel/v10-relics.js';

const seedCount=Math.max(10,Number(process.argv[2]||80));
const samplesPerCount=Math.max(40,Number(process.argv[3]||140));
const CARD_TAX=1.5;

const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
const pct=x=>Math.round(x*10000)/100;
const round=x=>Math.round(x*1000)/1000;
const inc=(obj,key,n=1)=>obj[key]=(obj[key]||0)+n;

function rng(seed){
  let x=(seed>>>0)||0x9e3779b9;
  return ()=>{
    x^=x<<13;x^=x>>>17;x^=x<<5;
    return (x>>>0)/4294967296;
  };
}
const pick=(r,arr)=>arr[Math.floor(r()*arr.length)];
function shuffled(r,arr){
  const out=[...arr];
  for(let i=out.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
  return out;
}
function hitDamage(bases){
  if(bases>=4)return PITCHER_DAMAGE.homeRun;
  if(bases===3)return PITCHER_DAMAGE.triple;
  if(bases===2)return PITCHER_DAMAGE.double;
  return PITCHER_DAMAGE.single;
}
function expectedBaseDamage(p){
  const hit=p.hit*(p.types||[]).reduce((sum,t)=>sum+(t.p||0)*hitDamage(t.bases||1),0);
  return hit+(p.foul||0)*PITCHER_DAMAGE.foul+(p.whiff||0)*PITCHER_DAMAGE.whiff
    +(p.out||0)*PITCHER_DAMAGE.inPlayOut+(p.sacrifice||0)*PITCHER_DAMAGE.inPlayOut;
}
function summarizeCandidate(state,primary,supports){
  const p=previewV10Stack(state,primary.id,supports);
  if(p.problem)return null;
  const base=expectedBaseDamage(p),hp=base*(p.damageRate??1);
  const kinds=[primary,...supports.map(x=>state.deck.find(c=>c.id===x.id))].filter(Boolean).map(x=>x.kind);
  return {
    cardCount:p.cardCount||1,
    connectCount:p.connectCount||0,
    baseRate:p.baseStackDamageRate??1,
    damageRate:p.damageRate??1,
    hit:p.hit||0,
    coverage:p.coverage?.length||0,
    expectedBase:base,
    expectedHp:hp,
    perCard:hp/(p.cardCount||1),
    practical:hp-CARD_TAX*((p.cardCount||1)-1),
    signature:kinds.join(' > '),
  };
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
function routeSpace(count){
  if(count===1)return {paths:9,connectDistribution:{0:9},perfect:1,avgConnect:0,avgRate:1};
  const dist={};let paths=0,totalConnect=0,totalRate=0,perfect=0;
  const walk=(zones,depth)=>{
    if(depth===count){
      const fake={battle:{aimZone:zones[0]},relics:[],deck:[]};
      const supports=zones.slice(1).map((aimZone,i)=>({id:'x'+i,aimZone}));
      // Connectivity does not inspect card data. Use the public helper directly by recreating links.
      let connect=0;
      for(let i=1;i<zones.length;i++){
        const a=zones[i-1],b=zones[i];
        const ar=Math.floor(a/3),ac=a%3,br=Math.floor(b/3),bc=b%3;
        if(Math.abs(ar-br)<=1&&Math.abs(ac-bc)<=1)connect++;
      }
      const rate=V10_SWING_DAMAGE_RATES[count-1]+connect*V11_STACK_CONNECT_BONUS;
      inc(dist,String(connect));paths++;totalConnect+=connect;totalRate+=rate;
      if(connect===count-1)perfect++;
      return;
    }
    for(let z=0;z<9;z++)walk([...zones,z],depth+1);
  };
  walk([],0);
  return {
    paths,
    connectDistribution:dist,
    perfectShare:pct(perfect/paths),
    avgConnect:round(totalConnect/paths),
    avgRate:pct(totalRate/paths),
    perfectRate:pct(V10_SWING_DAMAGE_RATES[count-1]+(count-1)*V11_STACK_CONNECT_BONUS),
  };
}

const aggregate=Object.fromEntries([1,2,3,4].map(n=>[n,{samples:[],eligibleStates:0}]));
const policyUsage={pressure:{},economy:{},practical:{}};
const practicalSignatures={};
let states=0;

for(let seed=0;seed<seedCount;seed++){
  const s0=firstBattle(seed);
  if(!s0)continue;
  states++;
  const attacks=(s0.battle.hand||[]).map(id=>s0.deck.find(c=>c.id===id)).filter(c=>c&&CARDS[c.kind]?.type==='attack'&&c.kind!=='bunt');
  const all=[];
  for(let count=1;count<=4;count++){
    if(attacks.length<count)continue;
    aggregate[count].eligibleStates++;
    const r=rng((seed+1)*0x45d9f3b+count*0x9e3779b9);
    const loops=count===1?Math.min(samplesPerCount,attacks.length*9):samplesPerCount;
    for(let sample=0;sample<loops;sample++){
      const ordered=shuffled(r,attacks).slice(0,count);
      const mainZone=count===1?sample%9:Math.floor(r()*9);
      const state=setAimZone(s0,mainZone);
      const supports=ordered.slice(1).map(card=>({id:card.id,aimZone:Math.floor(r()*9)}));
      const c=summarizeCandidate(state,ordered[0],supports);
      if(c){aggregate[count].samples.push(c);all.push(c);}
    }
    // Always include one intentionally connected route for every legal ordered card set sample.
    const ordered=shuffled(r,attacks).slice(0,count);
    const mainZone=Math.floor(r()*9);
    const state=setAimZone(s0,mainZone);
    const supports=[];let prev=mainZone;
    for(const card of ordered.slice(1)){
      const pr=Math.floor(prev/3),pc=prev%3;
      const neighbors=[];
      for(let rr=Math.max(0,pr-1);rr<=Math.min(2,pr+1);rr++)for(let cc=Math.max(0,pc-1);cc<=Math.min(2,pc+1);cc++)neighbors.push(rr*3+cc);
      const aimZone=pick(r,neighbors);supports.push({id:card.id,aimZone});prev=aimZone;
    }
    const connected=summarizeCandidate(state,ordered[0],supports);
    if(connected){aggregate[count].samples.push(connected);all.push(connected);}
  }
  if(!all.length)continue;
  const best=(key,divide=false)=>all.reduce((a,b)=>{
    const av=divide?a[key]/a.cardCount:a[key],bv=divide?b[key]/b.cardCount:b[key];
    return bv>av+1e-9||Math.abs(bv-av)<1e-9&&b.cardCount<a.cardCount?b:a;
  });
  const pressure=best('expectedHp'),economy=best('expectedHp',true),practical=best('practical');
  inc(policyUsage.pressure,String(pressure.cardCount));
  inc(policyUsage.economy,String(economy.cardCount));
  inc(policyUsage.practical,String(practical.cardCount));
  inc(practicalSignatures,practical.signature);
}

const byCount={};
for(const n of [1,2,3,4]){
  const xs=aggregate[n].samples;
  byCount[n]={
    eligibleStates:aggregate[n].eligibleStates,
    samples:xs.length,
    avgHit:pct(mean(xs.map(x=>x.hit))),
    avgCoverage:round(mean(xs.map(x=>x.coverage))),
    avgConnect:round(mean(xs.map(x=>x.connectCount))),
    avgDamageRate:pct(mean(xs.map(x=>x.damageRate))),
    avgExpectedHp:round(mean(xs.map(x=>x.expectedHp))),
    avgHpPerCard:round(mean(xs.map(x=>x.perCard))),
    bestExpectedHp:round(xs.length?Math.max(...xs.map(x=>x.expectedHp)):0),
  };
}
const normalizeUsage=obj=>Object.fromEntries([1,2,3,4].map(n=>[n,{count:obj[n]||0,share:states?pct((obj[n]||0)/states):0}]));
const topSignatures=Object.entries(practicalSignatures).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([signature,count])=>({signature,count,share:states?pct(count/states):0}));

const brokenTwo=V10_SWING_DAMAGE_RATES[1];
const connectedTwo=brokenTwo+V11_STACK_CONNECT_BONUS;
const report={
  generatedAt:new Date().toISOString(),
  seedsRequested:seedCount,
  battleStates:states,
  samplesPerCount,
  assumptions:{
    expectedHp:'Preview probabilities × pitcher HP damage table × stack damageRate. Foul uses normal foul damage; relic flat bonuses are excluded.',
    practicalPolicy:`max expectedHp - ${CARD_TAX} HP-equivalent per extra card`,
    usage:'Policy-choice diagnostics, not observed human behavior.',
  },
  mechanics:{
    baseRates:V10_SWING_DAMAGE_RATES,
    connectBonusPerLink:V11_STACK_CONNECT_BONUS,
    routeSpace:Object.fromEntries([1,2,3,4].map(n=>[n,routeSpace(n)])),
    soloRate:100,
    perfectFourRate:pct(V10_SWING_DAMAGE_RATES[3]+3*V11_STACK_CONNECT_BONUS),
    perfectFourBelowSolo:V10_SWING_DAMAGE_RATES[3]+3*V11_STACK_CONNECT_BONUS<1,
    perfectFourVsBrokenThreeDelta:pct((V10_SWING_DAMAGE_RATES[3]+3*V11_STACK_CONNECT_BONUS)-V10_SWING_DAMAGE_RATES[2]),
  },
  sampledBattle:byCount,
  policyUsage:{
    pressure:normalizeUsage(policyUsage.pressure),
    economy:normalizeUsage(policyUsage.economy),
    practical:normalizeUsage(policyUsage.practical),
  },
  practicalTopSignatures:topSignatures,
  relicDiagnostic:{
    twoStackBrokenRate:pct(v10RelicDamageRate(['twoStack'],2,brokenTwo)),
    twoStackConnectedRate:pct(v10RelicDamageRate(['twoStack'],2,connectedTwo)),
    erasesOrder:v10RelicDamageRate(['twoStack'],2,brokenTwo)===v10RelicDamageRate(['twoStack'],2,connectedTwo),
  },
};
console.log(JSON.stringify(report,null,2));
