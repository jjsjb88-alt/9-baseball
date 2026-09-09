import {describe,it,expect} from 'vitest';
import {createDuel,startBattle,playCard,endTurn,chooseCard,previewCard,readDuel,saveDuel,cardProblem,baseIntent} from '../src/duel/engine.js';
import {planTurn} from '../src/duel/policy.js';
import {SAVE_KEY} from '../src/duel/cards.js';
const memory=()=>{const d={};return {setItem:(k,v)=>d[k]=v,getItem:k=>d[k]??null}};
function fixture(kinds=[]){const s=startBattle(createDuel(1));kinds.forEach((kind,i)=>s.deck[i].kind=kind);s.battle.hand=s.deck.slice(0,7).map(c=>c.id);s.battle.draw=s.deck.slice(7).map(c=>c.id);return s;}
function runner(s,id,base){for(const k of ['hand','draw','discard','bench'])s.battle[k]=s.battle[k].filter(x=>x!==id);s.battle.bases[base]=id;s.battle.intent=baseIntent(s);return s;}
function roundtrip(s){const store=memory();saveDuel(store,s);expect(readDuel(store)).toEqual(s);const b=s.battle;if(b){const ids=[...b.hand,...b.draw,...b.discard,...b.bench,...b.bases.filter(Boolean)];expect(new Set(ids).size).toBe(s.deck.length);expect(ids.length).toBe(s.deck.length);}}
describe('HOMEBOUND: the diamond is part of the deck',()=>{
  it('a single removes its card from circulation and provokes a double-play trap',()=>{
    const s=startBattle(createDuel(1)),next=playCard(s,'c0');expect(next.battle.bases[0]).toBe('c0');expect(next.battle.hand).not.toContain('c0');expect(next.battle.discard).not.toContain('c0');expect(next.battle.intent.kind).toBe('sinker');expect(s.battle.bases).toEqual([null,null,null]);roundtrip(next);
  });
  it('a strong double is locked at second; pinch runner returns it without scoring',()=>{
    let s=startBattle(createDuel(1));s=playCard(s,'c2');s=playCard(s,'c1');expect(s.battle.bases[1]).toBe('c1');expect(s.battle.runs).toBe(0);
    s=playCard(s,'c4');expect(s.battle.bases[1]).toBe('c4');expect(s.battle.hand).toContain('c1');expect(s.battle.runs).toBe(0);expect(s.battle.strikes).toBe(1);roundtrip(s);
  });
  it('the SAME bunt scores and returns a card with one out, but loses with two outs',()=>{
    let s=runner(fixture(['bunt','slug']),'c1',2);s.battle.outs=1;
    const p=previewCard(s,'c0'),next=playCard(s,'c0');expect(p.runs).toBe(1);expect(next.battle.runs).toBe(1);expect(next.battle.hand).toContain('c1');expect(next.battle.bench).toContain('c0');expect(next.battle.outs).toBe(2);roundtrip(next);
    s.battle.outs=2;const loss=playCard(s,'c0');expect(loss.phase).toBe('lost');expect(loss.battle.runs).toBe(0);expect(loss.battle.bases[2]).toBe('c1');expect(previewCard(s,'c0').label).toContain('득점 무효');roundtrip(loss);
  });
  it('double play costs two real outs and locks both cards on the bench',()=>{
    const s=runner(fixture(['strike','slug']),'c1',0),next=playCard(s,'c0');expect(next.battle.outs).toBe(2);expect(next.battle.bases[0]).toBe(null);expect(next.battle.bench).toEqual(['c0','c1']);roundtrip(next);
  });
  it('intent reacts to count, but a committed lure protects a prepared swing',()=>{
    let s=fixture(['lure','setup','slug']);s=playCard(s,'c0');s=playCard(s,'c1');expect(s.battle.strikes).toBe(2);expect(s.battle.intent.kind).toBe('fastball');expect(cardProblem(s,'c3')).toContain('2스트라이크');expect(previewCard(s,'c2').label).toBe('2루타');
    const plain=endTurn(endTurn(fixture(['slug'])));expect(plain.battle.intent.need).toBe(4);expect(previewCard(plain,'c0').label).toBe('타자 아웃');
  });
  it('bases give rally its strength and returning cards go into the actual hand',()=>{
    const s=runner(runner(fixture(['rally','slug','strike']),'c1',1),'c2',2),p=previewCard(s,'c0');expect(p.contact).toBe(4);expect(p.runs).toBe(2);
    const next=playCard(s,'c0');expect(next.phase).toBe('reward');expect(next.battle.bases).toEqual(['c0',null,null]);expect(next.battle.hand).toEqual(expect.arrayContaining(['c1','c2']));roundtrip(next);
  });
  it('steal scores without a hit; the utility card returns as the runner',()=>{
    const s=runner(fixture(['flow','calm']),'c1',2),next=playCard(s,'c0');expect(next.battle.runs).toBe(1);expect(next.battle.hand).toContain('c1');expect(next.battle.strikes).toBe(1);expect(next.battle.turn).toBe(1);roundtrip(next);
  });
  it('deep defense changes the same strong swing from homer to single',()=>{
    const s=runner(fixture(['slug','strike']),'c1',2);s.battle.aim=4;expect(previewCard(s,'c0').label).toBe('홈런');s.stage=2;s.battle.intent=baseIntent(s);expect(previewCard(s,'c0').label).toBe('단타');
  });
  it('homecoming respects the hand cap and never duplicates a card',()=>{
    const s=runner(fixture(['rally','strike','slug','calm']),'c1',2);s.battle.hand.push(...s.battle.draw.splice(0,3));expect(s.battle.hand).toHaveLength(9);const next=playCard(s,'c0');expect(next.battle.hand).toHaveLength(9);roundtrip(next);
  });
  it('a third called strike ends the inning and illegal actions keep identity',()=>{
    let s=startBattle(createDuel(1));for(let i=0;i<9;i++)s=endTurn(s);expect(s.phase).toBe('lost');expect(s.battle.outs).toBe(3);expect(playCard(s,'c0')).toBe(s);expect(endTurn(s)).toBe(s);roundtrip(s);
  });
  it('completes all innings with rewards, conserving cards at EVERY action',()=>{
    let s=createDuel(1),guard=0;
    while(!['won','lost'].includes(s.phase)&&guard++<160){if(s.phase==='map')s=startBattle(s);else if(s.phase==='reward')s=chooseCard(s,['flow','lure','finisher'][s.stage]);else {const id=planTurn(s)[0];s=id?playCard(s,id):endTurn(s);}roundtrip(s);}
    expect(s.phase).toBe('won');expect(s.rewards).toHaveLength(3);expect(s.deck).toHaveLength(15);expect(s.victories).toBe(4);
  });
  it('rejects duplicate base cards, foreign cards, malformed saves',()=>{
    const store=memory();for(const corrupt of [s=>s.battle.bases[0]=s.battle.hand[0],s=>s.deck[0].kind='unknown',s=>s.battle.strikes=-1]){const s=startBattle(createDuel(1));corrupt(s);saveDuel(store,s);expect(()=>readDuel(store)).toThrow();}
    store.setItem(SAVE_KEY,'{');expect(()=>readDuel(store)).toThrow();
  });
});
