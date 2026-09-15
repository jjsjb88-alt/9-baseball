import {createDuel,startBattle,playCard,endTurn,chooseReward,advancePitch,advanceBatter,setAimZone,setGrowthMode,readDuel,saveDuel} from '../src/duel/engine.js';
import {planAction} from '../src/duel/policy.js';
import {BUILDS,GROWTHS,AFFINITY_CARDS,READ_LEVELS,rewardChoices,DECKBUILDER_BUILD} from '../src/duel/cards.js';
const count=Number(process.argv[2]||30);
if(!Number.isInteger(count)||count<1||count>500)throw Error('Use 1–500 seeds');
const rows=[];
for(let level=0;level<READ_LEVELS.length;level++)for(const build of Object.keys(BUILDS).filter(k=>k!==DECKBUILDER_BUILD))for(const growth of Object.keys(GROWTHS)){
  const row={readLevel:level,read:READ_LEVELS[level].name,build,growth,runs:count,wins:0,firstWins:0,growthAcquired:0,waitStrikes:0,patienceSwings:0,relayCreated:0,relayHits:0,fortuneEarned:0,fortuneUses:0};
  for(let seed=1;seed<=count;seed++){
    let s=createDuel(seed,build),guard=0;
    const storage={raw:null,getItem(){return this.raw},setItem(k,v){this.raw=v}};
    while(!['won','lost'].includes(s.phase)&&guard++<1000){
      if(s.phase==='map')s=startBattle(s);
      else if(s.phase==='between')s=advanceBatter(s);
      else if(s.phase==='pitch')s=advancePitch(s);
      else if(s.phase==='reward'){const pool=rewardChoices(s.stage,growth);
        s=chooseReward(s,{type:'add',kind:(AFFINITY_CARDS[growth]||[]).find(k=>pool.includes(k))||pool[0]},growth);}
      else {const a=planAction(s,{level});s=setGrowthMode(setAimZone(s,a.zone),a.mode);s=a.id?playCard(s,a.id):endTurn(s);}
      saveDuel(storage,s);readDuel(storage); // Every transitional state must remain resumable.
    }
    if(guard>=1000)throw Error('Non-terminating run: '+build+'/'+growth+'/'+seed);
    if(s.phase==='won')row.wins++;if(s.victories>0)row.firstWins++;row.growthAcquired+=s.growthHistory.length;
    for(const k of Object.keys(s.growthStats))row[k]+=s.growthStats[k];
  }
  rows.push(row);
}
const readLevels=READ_LEVELS.map((read,level)=>{
  const matching=rows.filter(row=>row.readLevel===level),runs=matching.reduce((sum,row)=>sum+row.runs,0),wins=matching.reduce((sum,row)=>sum+row.wins,0);
  return {readLevel:level,read:read.name,runs,wins,completionRate:Number((wins/runs).toFixed(3))};
});
console.log(JSON.stringify({scope:'Four battles, same seeds, public heuristic, split by a fixed read level: 0 uses only three-step zone shading (unused zones look rare), 1 uses displayed 5% ranges with exact zeroes, and 2 uses exact public probabilities. The bot always ADDS the first affinity card and never removes, upgrades or takes a relic, so deck editing and relics are NOT exercised here. Activation/termination smoke test, NOT human fun or balance proof.',readLevels,rows},null,2));
