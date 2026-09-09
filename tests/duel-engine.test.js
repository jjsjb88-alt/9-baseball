import {describe,it,expect} from 'vitest';
import {createDuel,startBattle,playCard,endTurn,chooseCard,previewCard,readDuel,saveDuel,cardProblem,baseIntent,advanceBatter,currentBatter} from '../src/duel/engine.js';
import {planTurn} from '../src/duel/policy.js';
import {SAVE_KEY,LINEUP} from '../src/duel/cards.js';
const memory=()=>{const d={};return {setItem:(k,v)=>d[k]=v,getItem:k=>d[k]??null}};
function fixture(kinds=[]){const s=startBattle(createDuel(1));kinds.forEach((kind,i)=>s.deck[i].kind=kind);s.battle.hand=s.deck.slice(0,7).map(c=>c.id);s.battle.draw=s.deck.slice(7).map(c=>c.id);return s;}
function runner(s,id,base){s.battle.bases[base]=id;s.battle.intent=baseIntent(s);return s;}
function roundtrip(s){const store=memory();saveDuel(store,s);expect(readDuel(store)).toEqual(s);if(s.battle){const b=s.battle,ids=[...b.hand,...b.draw,...b.discard];expect(ids).toHaveLength(s.deck.length);expect(new Set(ids).size).toBe(s.deck.length);expect(b.bases.filter(Boolean).every(id=>LINEUP.some(p=>p.id===id))).toBe(true);}}
describe('one player, one plate appearance; cards are actions',()=>{
  it('a hit puts the named batter on base and the action card in discard',()=>{
    const s=startBattle(createDuel(1)),next=playCard(s,'c0');expect(next.battle.bases[0]).toBe('p1');expect(next.battle.discard).toContain('c0');expect(next.phase).toBe('between');expect(next.battle.turn).toBe(1);expect(currentBatter(next).name).toBe('강한결');roundtrip(next);
  });
  it('rejects every action after ONE swing until explicit next batter entry',()=>{
    const s=playCard(startBattle(createDuel(1)),'c0'),before=structuredClone(s);expect(playCard(s,'c1')).toBe(s);expect(endTurn(s)).toBe(s);expect(cardProblem(s,'c1')).toContain('타석이 끝났습니다');expect(s).toEqual(before);
    const next=advanceBatter(s);expect(currentBatter(next).id).toBe('p2');expect(next.battle.turn).toBe(2);expect(next.phase).toBe('battle');expect(advanceBatter(next)).toBe(next);roundtrip(next);
  });
  it('two preparation cards are not two pitches or swings',()=>{
    let s=fixture(['setup','scout','slug']);s=playCard(s,'c0');s=playCard(s,'c1');expect(s.battle.preparations).toBe(2);expect(s.battle.strikes).toBe(0);expect(s.stats.pitches).toBe(0);expect(cardProblem(s,'c3')).toContain('준비 2회');
    s=playCard(s,'c2');expect(s.stats.pitches).toBe(1);expect(s.stats.appearances).toBe(1);expect(s.battle.runs).toBe(1);expect(s.battle.discard).toContain('c2');expect(s.battle.bases).toEqual([null,null,null]);roundtrip(s);
  });
  it('a double is a player at second, not a locked attack card',()=>{
    let s=startBattle(createDuel(1));s=playCard(s,'c2');s=playCard(s,'c1');expect(s.battle.bases[1]).toBe('p1');expect(s.battle.discard).toContain('c1');expect(s.battle.bases).not.toContain('c1');expect(s.battle.runs).toBe(0);roundtrip(s);
  });
  it('the same sacrifice scores at one out but never on the third out',()=>{
    const s=runner(fixture(['bunt']),'p8',2);s.battle.outs=1;const next=playCard(s,'c0');expect(next.battle.runs).toBe(1);expect(next.phase).toBe('between');expect(next.battle.discard).toContain('c0');expect(next.battle.hand).not.toContain('p8');roundtrip(next);
    s.battle.outs=2;const lost=playCard(s,'c0');expect(lost.phase).toBe('lost');expect(lost.battle.runs).toBe(0);expect(lost.battle.bases[2]).toBe('p8');roundtrip(lost);
  });
  it('double play removes a real runner without deleting action cards',()=>{
    const s=runner(fixture(['strike']),'p8',0),next=playCard(s,'c0');expect(next.battle.outs).toBe(2);expect(next.battle.bases[0]).toBe(null);expect(next.battle.discard).toContain('c0');expect(next.last.events.join(' ')).toContain('오하준');roundtrip(next);
  });
  it('hit-and-run signs do not move a player before a pitch is resolved',()=>{
    let s=runner(fixture(['flow','rally']),'p8',0);s=playCard(s,'c0');expect(s.battle.bases[0]).toBe('p8');expect(s.stats.pitches).toBe(0);expect(s.battle.runSignal).toBe(true);s=playCard(s,'c1');expect(s.battle.runs).toBe(1);expect(s.battle.bases[0]).toBe('p1');roundtrip(s);
  });
  it('scoring returns a person to the dugout, not a card to the hand',()=>{
    const s=runner(runner(fixture(['rally']),'p8',1),'p9',2),next=playCard(s,'c0');expect(next.phase).toBe('reward');expect(next.battle.runs).toBe(2);expect(next.battle.bases).toEqual(['p1',null,null]);expect(next.battle.hand).not.toContain('p8');roundtrip(next);
  });
  it('third called strike also waits for the next batter and resets only on entry',()=>{
    let s=startBattle(createDuel(1));for(let i=0;i<3;i++)s=endTurn(s);expect(s.phase).toBe('between');expect(s.battle.strikes).toBe(3);expect(currentBatter(s).id).toBe('p1');expect(endTurn(s)).toBe(s);roundtrip(s);s=advanceBatter(s);expect(s.battle.strikes).toBe(0);expect(currentBatter(s).id).toBe('p2');roundtrip(s);
  });
  it('same swing kind on successive appearances belongs to different players',()=>{
    let s=fixture(['strike','strike','setup']);s=playCard(s,'c0');expect(s.battle.bases[0]).toBe('p1');s=advanceBatter(s);s=playCard(s,'c2');s=playCard(s,'c1');expect(s.battle.bases).toEqual(['p2','p1',null]);expect(s.battle.results.map(r=>r.batterId)).toEqual(['p1','p2']);roundtrip(s);
  });
  it('lineup wraps from ninth to first instead of inventing a tenth batter',()=>{
    const s=fixture(['strike']);s.battle.batterIndex=8;s.battle.turn=9;const hit=playCard(s,'c0');expect(hit.battle.bases[0]).toBe('p9');const next=advanceBatter(hit);expect(currentBatter(next).id).toBe('p1');expect(next.battle.turn).toBe(10);roundtrip(next);
  });
  it('all innings, transitions and rewards conserve separate cards and players',()=>{
    let s=createDuel(1),guard=0;while(!['won','lost'].includes(s.phase)&&guard++<200){if(s.phase==='map')s=startBattle(s);else if(s.phase==='between')s=advanceBatter(s);else if(s.phase==='reward')s=chooseCard(s,['flow','lure','finisher'][s.stage]);else {const id=planTurn(s)[0];s=id?playCard(s,id):endTurn(s);}roundtrip(s);}
    expect(s.phase).toBe('won');expect(s.rewards).toHaveLength(3);expect(s.stats.appearances).toBeGreaterThan(4);
  });
  it('rejects mixed card/player zones, duplicate players, and v2 data',()=>{
    const store=memory();for(const corrupt of [s=>s.battle.bases[0]='c0',s=>s.battle.hand.push('p1'),s=>s.battle.bases=['p8','p8',null],s=>s.version=2]){const s=startBattle(createDuel(1));corrupt(s);saveDuel(store,s);expect(()=>readDuel(store)).toThrow();}store.setItem(SAVE_KEY,'{');expect(()=>readDuel(store)).toThrow();
  });
});
