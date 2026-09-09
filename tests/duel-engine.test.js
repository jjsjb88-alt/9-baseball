import {describe,it,expect} from 'vitest';
import {createDuel,startBattle,playCard,endTurn,chooseCard,previewCard,readDuel,saveDuel,cardProblem} from '../src/duel/engine.js';
import {planTurn} from '../src/duel/policy.js';
import {SAVE_KEY} from '../src/duel/cards.js';
const memory=()=>{const data={};return {setItem:(k,v)=>data[k]=v,getItem:k=>data[k]??null}};
function fixture(kinds){const s=startBattle(createDuel(17));s.deck=kinds.map((kind,i)=>({id:`c${i}`,kind}));s.battle.hand=s.deck.map(c=>c.id);s.battle.draw=[];s.battle.enemyHp=100;return s;}
describe('DUGOUT deterministic card combat',()=>{
  it('watch → lure → slug changes intent and deals exactly 25 for 3 energy',()=>{
    let s=fixture(['watch','lure','slug']);const original=structuredClone(s);
    expect(cardProblem(s,'c1')).toContain('카운트');
    s=playCard(s,'c0');expect(s.battle.count).toBe(1);expect(s.battle.block).toBe(5);
    s=playCard(s,'c1');expect(s.battle.intent.kind).toBe('fastball');expect(s.battle.intent.attack).toBe(4);
    const preview=previewCard(s,'c2');s=playCard(s,'c2');expect(s.last.damage).toBe(25);expect(preview.damage).toBe(25);expect(s.battle.energy).toBe(0);
    expect(original.battle.enemyHp).toBe(100);expect(playCard(original,'c2').last.damage).toBe(12);
  });
  it('card order, aim, multi hit and finisher matter',()=>{
    let s=fixture(['setup','rally']);s=playCard(s,'c0');s=playCard(s,'c1');expect(s.last.damage).toBe(18);expect(s.battle.aim).toBe(0);
    s=fixture(['defend','scout','finisher']);s=playCard(s,'c0');s=playCard(s,'c1');s=playCard(s,'c2');expect(s.last.damage).toBe(19);
  });
  it('flow requires two skills, powers exhaust and refresh block',()=>{
    let s=fixture(['flow','defend','setup','calm']);expect(cardProblem(s,'c0')).toContain('2장');
    s=playCard(s,'c1');s=playCard(s,'c2');s=playCard(s,'c0');expect(s.battle.energy).toBe(2);expect(s.battle.exhaust).toContain('c0');
    s=playCard(s,'c3');s=endTurn(s);expect(s.battle.block).toBe(3);expect(s.battle.exhaust).toContain('c3');
  });
  it('announced attack always resolves exactly, no hit roll',()=>{
    let s=fixture(['defend']);s.battle.block=2;const hp=s.hp;s=endTurn(s);expect(s.hp).toBe(hp-4);expect(s.last.blocked).toBe(2);expect(s.battle.energy).toBe(3);
    s.hp=1;s.battle.block=0;s=endTurn(s);expect(s.phase).toBe('lost');expect(s.hp).toBe(0);expect(endTurn(s)).toBe(s);
  });
  it('rejects illegal actions without mutation and preserves seeded replay',()=>{
    const s=createDuel(99);expect(playCard(s,'c0')).toBe(s);expect(endTurn(s)).toBe(s);
    const a=startBattle(s),b=startBattle(s);expect(a).toEqual(b);a.battle.energy=0;const id=a.battle.hand[0];expect(playCard(a,id)).toBe(a);expect(startBattle(a)).toBe(a);
  });
  it('saves every phase, conserves cards through three rewards, completes a full run',()=>{
    let s=createDuel(42);const store=memory();let guard=0;
    while(!['won','lost'].includes(s.phase)&&guard++<160){
      if(s.phase==='map')s=startBattle(s);
      else if(s.phase==='reward')s=chooseCard(s,['lure','scout','slug'][s.stage]);
      else {const path=planTurn(s);for(const id of path)s=playCard(s,id);if(s.phase==='battle')s=endTurn(s);}
      saveDuel(store,s);expect(readDuel(store)).toEqual(s);
      if(s.battle&&s.phase!=='map'){const ids=['hand','draw','discard','exhaust'].flatMap(k=>s.battle[k]);expect(new Set(ids).size).toBe(s.deck.length);}
    }
    expect(s.phase).toBe('won');expect(s.rewards).toHaveLength(3);expect(s.deck).toHaveLength(13);expect(s.victories).toBe(4);
  });
  it('rejects corrupted cards, duplicate piles and non-numeric combat data',()=>{
    for(const corrupt of [s=>s.deck[0].kind='evil',s=>s.battle.hand.push(s.battle.hand[0]),s=>s.battle.intent.attack='6']){
      const s=startBattle(createDuel(1)),store=memory();corrupt(s);saveDuel(store,s);expect(()=>readDuel(store)).toThrow();
    }
    const store=memory();store.setItem(SAVE_KEY,'{');expect(()=>readDuel(store)).toThrow();
  });
});
