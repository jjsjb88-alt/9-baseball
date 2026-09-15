import {createDuel,startBattle,playCard,endTurn,chooseReward,advancePitch,advanceBatter,setAimZone,setGrowthMode,readDuel,saveDuel} from '../src/duel/engine.js';
import {planAction} from '../src/duel/policy.js';
import {CARDS,BUILDS,RELICS,RELIC_OFFERS,DECKBUILDER_BUILD} from '../src/duel/cards.js';
const count=Number(process.argv[2]||10);
if(!Number.isInteger(count)||count<1||count>100)throw Error('Use 1–100 seeds');
const variants=[{type:'skip',key:'baseline'},...Object.keys(CARDS).map(key=>({type:'upgrade',key})),...Object.keys(RELICS).map(key=>({type:'relic',key}))];
const rows=[];
for(const build of Object.keys(BUILDS).filter(k=>k!==DECKBUILDER_BUILD))for(const variant of variants){
  const row={build,variant:variant.key,runs:count,wins:0,acquired:0,pitches:0,runsScored:0};
  for(let seed=1;seed<=count;seed++){
    let s=createDuel(seed,build),steps=0,acquired=false;
    const storage={raw:null,getItem(){return this.raw},setItem(k,v){this.raw=v}};
    while(!['won','lost'].includes(s.phase)&&steps++<1000){
      if(s.phase==='map')s=startBattle(s);
      else if(s.phase==='pitch')s=advancePitch(s);
      else if(s.phase==='between')s=advanceBatter(s);
      else if(s.phase==='reward'){
        let action={type:'skip'};
        if(!acquired&&variant.type==='upgrade'){const target=s.deck.find(c=>c.kind===variant.key&&!c.plus);if(target)action={type:'upgrade',id:target.id};}
        if(!acquired&&variant.type==='relic'&&RELIC_OFFERS[s.stage].includes(variant.key))action={type:'relic',kind:variant.key};
        if(action.type!=='skip'){acquired=true;row.acquired++;}
        s=chooseReward(s,action,'fortune');
      }else{const a=planAction(s);s=setGrowthMode(setAimZone(s,a.zone),a.mode);s=a.id?playCard(s,a.id):endTurn(s);}
      saveDuel(storage,s);readDuel(storage);
    }
    if(!['won','lost'].includes(s.phase))throw Error('Run stalled: '+build+'/'+variant.key+'/'+seed);
    row.wins+=s.phase==='won'?1:0;row.pitches+=s.stats.pitches;row.runsScored+=s.stats.runs;
  }
  rows.push(row);
}
for(const row of rows){const base=rows.find(r=>r.build===row.build&&r.variant==='baseline');row.winDelta=row.wins-base.wins;}
console.log(JSON.stringify({scope:'Paired seeds. Same public heuristic, actual evolving read level, fortune growth. Baseline skips all deck rewards; each variant takes at most one legal upgrade/relic at its first opportunity, then skips. No card injection. acquired=0 means unavailable or no reward reached, NOT a useless upgrade. This measures this policy only, not human fun or a universal power ranking.',rows},null,2));
