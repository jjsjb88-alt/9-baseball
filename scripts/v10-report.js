import {PITCHER_DAMAGE,damageForOutcome} from '../src/duel/pitcher-hp.js';
import {createRunMap,validateRunMap,actHasBossPath} from '../src/duel/run-map.js';

const count=Math.max(1,Number(process.argv[2]||100));
let valid=0,bossPaths=0,committedActs=0;
const topologies=new Set(),archetypes=new Map();
const children=(map,id)=>map.edges.filter(e=>e.from===id).map(e=>e.to);
for(let seed=0;seed<count;seed++){
  const map=createRunMap(seed);if(validateRunMap(map))valid++;
  topologies.add(map.edges.map(e=>e.from+'>'+e.to).join('|'));
  for(const node of map.nodes){
    if(node.opponent)archetypes.set(node.opponent.archetypeKey,(archetypes.get(node.opponent.archetypeKey)||0)+1);
  }
  for(let act=1;act<=3;act++){
    if(actHasBossPath(map,act))bossPaths++;
    const branches=children(map,`a${act}-entry`),sets=branches.map(id=>new Set(children(map,id)));
    let committed=true;
    for(let i=0;i<sets.length;i++)for(let j=i+1;j<sets.length;j++)
      if([...sets[i]].some(id=>sets[j].has(id)))committed=false;
    if(committed)committedActs++;
  }
}
const foul=[0,1,2,3].map(streak=>damageForOutcome({kind:'foul',aimZone:0,zone:1},streak).damage);
console.log(JSON.stringify({
  seeds:count,validMaps:valid,topologyVariants:topologies.size,
  bossPaths,expectedBossPaths:count*3,committedActs,expectedCommittedActs:count*3,
  opponentArchetypes:Object.fromEntries(archetypes),
  damage:PITCHER_DAMAGE,hardFoulDecay:foul,
  failPolicy:{whiffDamage:1,whiffsBeforeThreeStrikeouts:9,maxChipBeforeLoss:9},
},null,2));
