import {createDuel,startBattle,playCard,endTurn,chooseReward,advancePitch,advanceBatter,setAimZone,setGrowthMode,saveDuel,readDuel} from '../src/duel/engine.js';
import {planAction} from '../src/duel/policy.js';
import {DECKBUILDER_BUILD,rewardChoices} from '../src/duel/cards.js';

const count=Number(process.argv[2]||20);
if(!Number.isInteger(count)||count<1||count>500)throw Error('Use 1–500 seeds');

const rows=[];
const picks={};
for(let seed=1;seed<=count;seed++){
  let s=createDuel(seed,DECKBUILDER_BUILD),guard=0;
  const storage={raw:null,getItem(){return this.raw},setItem(k,v){this.raw=v}};
  const chosen=[];
  while(!['won','lost'].includes(s.phase)&&guard++<1000){
    if(s.phase==='map')s=startBattle(s);
    else if(s.phase==='pitch')s=advancePitch(s);
    else if(s.phase==='between')s=advanceBatter(s);
    else if(s.phase==='reward'){
      const pool=rewardChoices(s.stage,null,DECKBUILDER_BUILD);
      const kind=pool[(seed+s.stage)%pool.length];
      chosen.push(kind);picks[kind]=(picks[kind]||0)+1;
      s=chooseReward(s,{type:'add',kind},null);
    }else{
      const a=planAction(s);
      s=setGrowthMode(setAimZone(s,a.zone),a.mode);
      s=a.id?playCard(s,a.id):endTurn(s);
    }
    saveDuel(storage,s);
    readDuel(storage);
  }
  if(guard>=1000)throw Error('V9 main run did not terminate: '+seed);
  rows.push({seed,result:s.phase,victories:s.victories,pitches:s.stats.pitches,runs:s.stats.runs,finalDeck:s.deck.length,rewards:s.rewards.length,chosen});
}

const wins=rows.filter(r=>r.result==='won').length;
const reachedReward=rows.filter(r=>r.rewards>0).length;
const average=(key)=>Number((rows.reduce((sum,r)=>sum+r[key],0)/rows.length).toFixed(2));
console.log(JSON.stringify({
  scope:'V9 neutral starter + deterministic three-card draft policy. This is termination/save coverage, NOT human fun or balance proof.',
  seeds:count,
  wins,
  completionRate:Number((wins/count).toFixed(3)),
  reachedReward,
  averagePitches:average('pitches'),
  averageRuns:average('runs'),
  averageFinalDeck:average('finalDeck'),
  picks,
  rows,
},null,2));
