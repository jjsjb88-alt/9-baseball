import {describe,expect,it} from 'vitest';
import {createV10Duel,enterV10Node,createDuel,startBattle} from '../src/duel/engine.js';

// Regression (found in the V12 full-flow smoke): act-1 battles open with the fixed tutorial hand
// c0–c4. After the locker room removed c0, the next battle still dealt c0 — a card no longer in the
// deck — and the battle screen crashed (hand entry undefined).
describe('opening hand after the deck was trimmed',()=>{
  it('never deals a card that is not in the deck',()=>{
    for(const removed of [['c0'],['c2','c4'],['c0','c1','c2','c3','c4']]){
      let s=createV10Duel(1);s.deck=s.deck.filter(c=>!removed.includes(c.id));
      s=enterV10Node(s,'a1-entry');
      const ids=new Set(s.deck.map(c=>c.id)),b=s.battle;
      expect(b.hand.every(id=>ids.has(id))).toBe(true);
      expect(b.hand.length).toBe(Math.min(5,s.deck.length));
      const all=[...b.hand,...b.draw,...b.discard];
      expect(new Set(all).size).toBe(all.length);
      expect(all.sort()).toEqual([...ids].sort());
    }
  });
  it('keeps the fixed tutorial hand when the deck is intact',()=>{
    const s=enterV10Node(createV10Duel(1),'a1-entry');
    expect(s.battle.hand).toEqual(['c0','c1','c2','c3','c4']);
    const legacy=startBattle(createDuel(1,'away'));
    expect(legacy.battle.hand).toEqual(['c0','c1','c2','c3','c4']);
  });
});
