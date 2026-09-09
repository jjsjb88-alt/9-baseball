import {playCard,cardProblem} from './engine.js';
// Bounded, deterministic QA policy. Uses the real engine; not a fun predictor.
export function planTurn(state){
  if(state.phase!=='battle')return [];
  const start=state.battle;
  const score=s=>s.phase==='reward'||s.phase==='won'?10000+s.hp:
    (start.enemyHp-s.battle.enemyHp)+Math.min(start.enemyBlock,s.battle.enemyBlock===0?start.enemyBlock:0)*.25
    -Math.max(0,s.battle.intent.attack-s.battle.block)*1.25+s.battle.aim*1.1+s.battle.count*.5+s.battle.calm*4;
  let best={s:state,path:[],score:score(state)},beam=[best];
  for(let depth=0;depth<8;depth++){
    const next=[];
    for(const node of beam){if(node.s.phase!=='battle')continue;
      const seen=new Set();
      for(const id of node.s.battle.hand){const kind=node.s.deck.find(c=>c.id===id).kind;
        if(seen.has(kind)||cardProblem(node.s,id))continue;seen.add(kind);
        const s=playCard(node.s,id),item={s,path:[...node.path,id],score:score(s)};next.push(item);
        if(item.score>best.score)best=item;
      }
    }
    beam=next.sort((a,b)=>b.score-a.score).slice(0,20);if(!beam.length)break;
  }
  return best.path;
}
