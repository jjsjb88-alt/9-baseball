import {playCard,endTurn,cardProblem,advanceBatter} from './engine.js';
// Functional reachability only. Search sees future draws; it does not model human fun or skill.
export function planTurn(state){
  if(state.phase!=='battle')return [];
  const score=s=>(s.phase==='reward'||s.phase==='won'?10000:0)+(s.battle.runs-state.battle.runs)*100-(s.battle.outs-state.battle.outs)*40+s.battle.bases.reduce((v,id,i)=>v+(id?8+i*6:0),0)+(s.battle.hand.length-state.battle.hand.length)*.2;
  let best={s:state,path:[],score:-Infinity},beam=[{s:state,path:[]}];
  for(let d=0;d<5;d++){const next=[];for(const n of beam){if(n.s.phase==='between')n.s=advanceBatter(n.s);if(n.s.phase!=='battle')continue;
    for(const id of [...n.s.battle.hand.filter(id=>!cardProblem(n.s,id)),null]){const s=id?playCard(n.s,id):endTurn(n.s),item={s,path:[...n.path,id],score:score(s)};next.push(item);if(item.score>best.score)best=item;}}
    beam=next.sort((a,b)=>b.score-a.score).slice(0,24);
  }
  return best.path.slice(0,1);
}
