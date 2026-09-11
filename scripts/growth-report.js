import {createDuel,startBattle,playCard,endTurn,chooseCard,advancePitch,advanceBatter,setAimZone,setGrowthMode,readDuel,saveDuel} from '../src/duel/engine.js';
import {planAction} from '../src/duel/policy.js';
import {BUILDS,GROWTHS} from '../src/duel/cards.js';
const count=Number(process.argv[2]||30);
if(!Number.isInteger(count)||count<1||count>500)throw Error('Use 1–500 seeds');
const rows=[];
for(const build of Object.keys(BUILDS))for(const growth of Object.keys(GROWTHS)){
  const row={build,growth,runs:count,wins:0,firstWins:0,growthAcquired:0,waitStrikes:0,patienceSwings:0,relayCreated:0,relayHits:0,fortuneEarned:0,fortuneUses:0};
  for(let seed=1;seed<=count;seed++){
    let s=createDuel(seed,build),guard=0;
    const storage={raw:null,getItem(){return this.raw},setItem(k,v){this.raw=v}};
    while(!['won','lost'].includes(s.phase)&&guard++<1000){
      if(s.phase==='map')s=startBattle(s);
      else if(s.phase==='between')s=advanceBatter(s);
      else if(s.phase==='pitch')s=advancePitch(s);
      else if(s.phase==='reward')s=chooseCard(s,GROWTHS[growth].signature,growth);
      else {const a=planAction(s);s=setGrowthMode(setAimZone(s,a.zone),a.mode);s=a.id?playCard(s,a.id):endTurn(s);}
      saveDuel(storage,s);readDuel(storage); // Every transitional state must remain resumable.
    }
    if(guard>=1000)throw Error('Non-terminating run: '+build+'/'+growth+'/'+seed);
    if(s.phase==='won')row.wins++;if(s.victories>0)row.firstWins++;row.growthAcquired+=s.growthHistory.length;
    for(const k of Object.keys(s.growthStats))row[k]+=s.growthStats[k];
  }
  rows.push(row);
}
console.log(JSON.stringify({scope:'Four battles, same seeds, public heuristic, fixed signature-card rewards. Activation/termination smoke test, NOT human fun or balance proof.',rows},null,2));
