import {publicProbabilities,knownPitchZones,readLevel,coverage} from './engine.js';
import {shadeFor} from './cards.js';

// Bounds are derived ONLY from the same categories/intervals visible in the grid.
// They are not rounded exact totals: two distributions with identical visible cells
// must produce identical card previews. Clues are usable at every reading level.
export function probabilityBounds(s){
  const p=publicProbabilities(s),known=knownPitchZones(s),level=readLevel(s);
  const radar=s.relics.includes('radar'),ledger=s.relics.includes('ledger');
  return p.map((v,z)=>{
    if(!known.includes(z))return [0,0];
    if(known.length===1)return [1,1];
    if(level===2||(ledger&&z===9))return [v,v];
    if((radar||level>=1)&&v===0)return [0,0];
    if(level===1){const low=Math.floor((v+1e-12)*20)/20;return [low,Math.min(1,low+.05)];}
    return [[0,.14],[.14,.28],[.28,1]][shadeFor(v)-1];
  });
}
export function coverageBounds(s,id){
  const zones=coverage(s,id),bounds=probabilityBounds(s);
  const add=(inside,index)=>bounds.reduce((sum,b,z)=>sum+(zones.includes(z)===inside?b[index]:0),0);
  return [Math.max(0,add(true,0),1-add(false,1)),Math.min(1,add(true,1),1-add(false,0))];
}
export function coverageText(s,id){
  const [low,high]=coverageBounds(s,id);
  if(high<1e-9)return '범위 도착 불가';
  if(low>1-1e-9)return '범위 도착 확정';
  if(readLevel(s)===2)return '범위 도착 '+Math.round(low*100)+'%';
  return '범위 도착 '+Math.floor((low+1e-9)*100)+'–'+Math.ceil((high-1e-9)*100)+'% · 공개 정보 범위';
}
