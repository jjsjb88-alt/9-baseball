import {CARDS} from './cards.js';
import {previewCard,cardProblem,publicProbabilities,setAimZone,setGrowthMode,growthProblem} from './engine.js';

// Public-information baseline, not an oracle or a human-fun metric.
// This module never reads pending pitch, RNG seed, or resolved future states.
export function planAction(s){
  if(s.phase!=='battle')return null;
  const b=s.battle,legal=b.hand.filter(id=>!cardProblem(s,id));
  if(b.preparations<2){
    const desired=!b.scouted?'scout':b.hand.length<6?'watch':b.strikes===2?'calm':'setup';
    const prep=legal.find(id=>s.deck.find(c=>c.id===id).kind===desired)
      ||legal.find(id=>['setup','lure'].includes(s.deck.find(c=>c.id===id).kind));
    if(prep)return {id:prep,zone:b.aimZone,mode:b.growthMode};
  }
  let best={id:null,zone:b.aimZone,mode:'normal',value:-Infinity};
  const ball=publicProbabilities(s)[9];
  // Value of extending the PA; at two strikes, a called strike is an out.
  best.value=ball*(b.balls===3?1.15:.22)-(1-ball)*(b.strikes===2?1.15:.15);
  if(s.growth.patience&&b.strikes<2)best.value+=(1-ball)*(b.waitCharge? .3:.55);
  for(const mode of ['normal','patience','fortune'].filter(m=>!growthProblem(s,m))){
  const candidate=setGrowthMode(s,mode);
  for(const id of ['basic',...candidate.battle.hand.filter(id=>!cardProblem(candidate,id)&&CARDS[s.deck.find(c=>c.id===id).kind].type==='attack')]){
    const kind=id==='basic'?'basic':s.deck.find(c=>c.id===id).kind;
    for(let zone=0;zone<9;zone++){
      const p=previewCard(setAimZone(candidate,zone),id);
      const value=p.expectedBases+p.hit*(kind==='rally'?b.bases.filter(Boolean).length*.3:0)
        -p.out*1.1-p.whiff*(b.strikes===2?1.1:.22)
        +p.sacrifice*(b.outs<2&&b.bases[2]?1.1:-1)
        +p.fortuneChance*(b.bases.filter(Boolean).length*.5+.45)
        +p.sacrifice*(s.growth.relay&&b.outs<2&&b.bases.some(Boolean)?.4:0)
        -p.foul*(kind==='bunt'&&b.strikes===2?1.1:.015);
      if(value>best.value)best={id,zone,mode,value};
    }
  }
  }
  return {id:best.id,zone:best.zone,mode:best.mode};
}
export const planTurn=s=>{const action=planAction(s);return action?[action.id]:[];};
