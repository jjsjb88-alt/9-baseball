import {describe,expect,it} from 'vitest';
import {createV10Duel,enterV10Node,playV10Action,saveV10Duel,readV10Duel} from '../src/duel/engine.js';
import {validateV10State} from '../src/duel/v10-storage.js';

// Regression (found in V12 P4-2): watching a pitch left lastCombat.aimZone = null (nothing was aimed)
// and the save validator rejected it, so every watched pitch showed "저장 실패" and was not saved.
const mem=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};
function watched(zone){
  let s=enterV10Node(createV10Duel(1),'a1-entry');
  s.battle.pending={...s.battle.pending,zone,roll:.5};
  return playV10Action(s,{type:'take'});
}

describe('V10 save after a watched pitch',()=>{
  it('keeps a valid, saveable state for a ball and a called strike',()=>{
    for(const zone of [9,4]){
      const s=watched(zone);
      expect(s.v10.lastCombat).toBeTruthy();
      expect(validateV10State(s)).toBe(true);
      const store=mem();expect(()=>saveV10Duel(store,s)).not.toThrow();
      expect(readV10Duel(store).v10.lastCombat.verdict).toBe(s.v10.lastCombat.verdict);
    }
  });
  it('still rejects a corrupt aim zone',()=>{
    const s=watched(9);s.v10.lastCombat.aimZone=12;
    expect(validateV10State(s)).toBe(false);
    s.v10.lastCombat.aimZone='x';
    expect(validateV10State(s)).toBe(false);
  });
});
