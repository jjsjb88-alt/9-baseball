import {PITCHER_DAMAGE,damageForOutcome} from '../src/duel/pitcher-hp.js';
import {createRunMap,validateRunMap,actHasBossPath} from '../src/duel/run-map.js';

const count=Math.max(1,Number(process.argv[2]||100));
let valid=0,bossPaths=0;
for(let seed=0;seed<count;seed++){
  const map=createRunMap(seed);if(validateRunMap(map))valid++;
  for(let act=1;act<=3;act++)if(actHasBossPath(map,act))bossPaths++;
}
const foul=[0,1,2,3].map(streak=>damageForOutcome({kind:'foul',aimZone:0,zone:1},streak).damage);
console.log(JSON.stringify({
  seeds:count,validMaps:valid,bossPaths,expectedBossPaths:count*3,
  damage:PITCHER_DAMAGE,hardFoulDecay:foul,
  failPolicy:{whiffDamage:1,whiffsBeforeThreeStrikeouts:9,maxChipBeforeLoss:9},
},null,2));
