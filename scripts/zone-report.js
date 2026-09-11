import {createDuel,startBattle,playCard,endTurn,advancePitch,advanceBatter,setAimZone,setGrowthMode} from '../src/duel/engine.js';
import {planAction} from '../src/duel/policy.js';
import {BUILDS} from '../src/duel/cards.js';
const n=Number(process.argv[2]||100);
if(!Number.isInteger(n)||n<1||n>2000)throw new Error('Use 1–2000 seeds');
const rows=[];
for(const build of Object.keys(BUILDS)){
  const totals={build,seeds:n,wins:0,pitches:0,runs:0,hits:0,walks:0,fouls:0,whiffs:0,totalBases:0,appearances:0};
  for(let seed=1;seed<=n;seed++){
    let s=startBattle(createDuel(seed,build)),guard=0;
    while(['battle','pitch','between'].includes(s.phase)&&guard++<1000){
      if(s.phase==='pitch')s=advancePitch(s);
      else if(s.phase==='between')s=advanceBatter(s);
      else {const a=planAction(s);s=setGrowthMode(setAimZone(s,a.zone),a.mode);s=a.id?playCard(s,a.id):endTurn(s);}
    }
    if(guard>=1000)throw new Error('Run did not terminate: '+build+' '+seed);
    if(s.phase==='reward')totals.wins++;
    for(const key of ['pitches','runs','hits','walks','fouls','whiffs','totalBases','appearances'])totals[key]+=s.stats[key];
  }
  rows.push({...totals,winRate:totals.wins/n,TBperPitch:totals.totalBases/totals.pitches});
}
console.log(JSON.stringify({scope:'First pitcher only; public-information baseline; NOT human fun or balance proof',rows},null,2));
