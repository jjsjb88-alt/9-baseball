import {describe,it,expect} from 'vitest';
import {createDuel,startBattle,playCard,chooseReward,saveDuel,readDuel,coverage,swingOdds,matchup,pitchClue,advanceBatter} from '../src/duel/engine.js';
import {deckProfile,diagnose,applyRewardToDeck,rewardProblem,profileDelta,relationsFor,growthConflict} from '../src/duel/deck.js';
import {CARDS,STAGES,DECK_MIN,DECK_MAX,cardPower,canUpgrade,rewardChoices} from '../src/duel/cards.js';

const pitch=(s,zone=s.battle.aimZone,roll=.5,powerRoll=.99)=>{s.battle.pending={zone,roll,powerRoll};return s;};
function only(s,kind,plus){
  s.deck[0]={id:'c0',kind,...(plus?{plus:true}:{})};
  const all=[...s.battle.hand,...s.battle.draw,...s.battle.discard];
  s.battle.hand=['c0'];s.battle.draw=all.filter(x=>x!=='c0');s.battle.discard=[];return s;
}
const held=(kind,plus)=>only(startBattle(createDuel(1)),kind,plus);
function reward(s=startBattle(createDuel(1))){
  s=only(s,'strike');s.battle.runs=STAGES[s.stage].target-1;s.battle.bases=[null,null,'p8'];
  return playCard(pitch(s),'c0');
}
function roundtrip(s){const m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};
  saveDuel(storage,s);expect(readDuel(storage)).toEqual(s);}

describe('deck profile and diagnosis read the deck, never a hand-written label',()=>{
  it('counts coverage axes, roles, prepare/swing split and upgrades from card data',()=>{
    const deck=[{id:'c0',kind:'rally'},{id:'c1',kind:'strike'},{id:'c2',kind:'scout'},{id:'c3',kind:'slug',plus:true}];
    const p=deckProfile(deck);
    expect(p.total).toBe(4);expect(p.swing).toBe(3);expect(p.prepare).toBe(1);expect(p.plus).toBe(1);
    expect(p.axes.row).toBe(1);expect(p.axes.column).toBe(1);expect(p.axes.point).toBe(1);
    expect(p.roles.관찰).toBe(1);expect(p.roles.진루).toBe(1);
    expect(p.power).toBe(cardPower({kind:'rally'})+cardPower({kind:'strike'})+cardPower({kind:'slug',plus:true}));
    expect(p.power).toBe(3); // slug 2 +1 upgrade
  });
  it('names information that the deck cannot cash in',()=>{
    const blind=[{id:'a',kind:'scout'},{id:'b',kind:'scout'},{id:'c',kind:'slug'},{id:'d',kind:'slug'}];
    expect(diagnose(blind,{}).some(n=>n.text.includes('가로 3존'))).toBe(true);
    const paired=[{id:'a',kind:'scout'},{id:'b',kind:'scout'},{id:'c',kind:'rally'},{id:'d',kind:'rally'}];
    expect(diagnose(paired,{}).some(n=>n.text.includes('가로 3존'))).toBe(false);
  });
  it('warns that 기다림 voids wide coverage while it is active',()=>{
    const wide=Array.from({length:6},(_,i)=>({id:'w'+i,kind:'rally'}));
    expect(diagnose(wide,{patience:0}).some(n=>n.text.includes('1존으로 강제'))).toBe(false);
    expect(diagnose(wide,{patience:1}).some(n=>n.text.includes('1존으로 강제'))).toBe(true);
  });
  it('reports only the rows a change actually moves',()=>{
    const before=[{id:'c0',kind:'rally'}],after=[{id:'c0',kind:'rally'},{id:'c1',kind:'slug'}];
    const rows=profileDelta(before,after),labels=rows.map(r=>r.label);
    expect(labels).toContain('덱 장수');expect(labels).toContain('1존');expect(labels).toContain('장타');
    expect(labels).not.toContain('가로 3존'); // unchanged rows stay out of the list
    expect(rows.find(r=>r.label==='덱 장수')).toMatchObject({from:1,to:2,delta:1});
  });
});

describe('reward actions compete: add, remove, upgrade and skip share one rule set',()=>{
  it('enforces deck bounds and upgrade legality', ()=>{
    const full=Array.from({length:DECK_MAX},(_,i)=>({id:'c'+i,kind:'strike'}));
    expect(rewardProblem(full,{type:'add',kind:'calm'},0,'patience')).toMatch(String(DECK_MAX));
    const thin=Array.from({length:DECK_MIN},(_,i)=>({id:'c'+i,kind:'strike'}));
    expect(rewardProblem(thin,{type:'remove',id:'c0'},0,'patience')).toMatch(String(DECK_MIN));
    expect(rewardProblem(thin,{type:'remove',id:'nope'},0,'patience')).toBeTruthy();
    const done=[{id:'c0',kind:'slug',plus:true},{id:'c1',kind:'strike'}];
    expect(rewardProblem(done,{type:'upgrade',id:'c0'},0,'patience')).toBeTruthy();
    expect(rewardProblem(done,{type:'upgrade',id:'c1'},0,'patience')).toBeNull();
    expect(rewardProblem(done,{type:'add',kind:'bunt'},0,'relay')).toBeTruthy(); // not a 연결 candidate any more
    expect(rewardProblem(done,{type:'skip'},0,'patience')).toBeNull();
  });
  it('applies each action purely, leaving the source deck untouched',()=>{
    const deck=[{id:'c0',kind:'strike'},{id:'c1',kind:'slug'}],frozen=structuredClone(deck);
    expect(applyRewardToDeck(deck,{type:'add',kind:'calm'},9).deck).toHaveLength(3);
    expect(applyRewardToDeck(deck,{type:'add',kind:'calm'},9).nextId).toBe(10);
    expect(applyRewardToDeck(deck,{type:'remove',id:'c0'},9).deck.map(c=>c.id)).toEqual(['c1']);
    expect(applyRewardToDeck(deck,{type:'upgrade',id:'c1'},9).deck[1].plus).toBe(true);
    expect(applyRewardToDeck(deck,{type:'skip'},9)).toEqual({deck,nextId:9});
    expect(deck).toEqual(frozen);
  });
  it('removes a card, leaves deck ids non-contiguous, and still round-trips through storage',()=>{
    const s=reward(),n=chooseReward(s,{type:'remove',id:'c3'},'patience');
    expect(n.deck).toHaveLength(11);expect(n.nextId).toBe(12);
    expect(n.deck.some(c=>c.id==='c3')).toBe(false);
    expect(n.deck.map(c=>c.id)).not.toEqual(n.deck.map((_,i)=>'c'+i)); // v6 required c0..cN; v7 cannot
    expect(n.rewards).toEqual([{type:'remove',id:'c3'}]);
    roundtrip(n);roundtrip(startBattle(n));
  });
  it('upgrades a card and round-trips the plus flag',()=>{
    const s=reward(),n=chooseReward(s,{type:'upgrade',id:'c1'},'patience');
    expect(n.deck.find(c=>c.id==='c1').plus).toBe(true);expect(n.deck).toHaveLength(12);expect(n.nextId).toBe(12);
    expect(chooseReward(n,{type:'upgrade',id:'c1'},'patience')).toBe(n); // phase already left reward
    roundtrip(n);roundtrip(startBattle(n));
  });
  it('rejects an illegal action without mutating the run',()=>{
    const s=reward(),frozen=structuredClone(s);
    expect(chooseReward(s,{type:'remove',id:'missing'},'patience')).toBe(s);
    expect(chooseReward(s,{type:'upgrade',id:'missing'},'patience')).toBe(s);
    expect(chooseReward(s,{type:'nonsense'},'patience')).toBe(s);
    expect(s).toEqual(frozen);
  });
  it('refuses a save whose deck size contradicts its reward log',()=>{
    const s=chooseReward(reward(),{type:'remove',id:'c3'},'patience');
    const m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};
    saveDuel(storage,{...s,deck:[...s.deck,{id:'c40',kind:'calm'}]});
    expect(()=>readDuel(storage)).toThrow();
    saveDuel(storage,{...s,deck:s.deck.map(c=>({...c,plus:true}))});
    expect(()=>readDuel(storage)).toThrow(); // more upgrades than the reward log recorded
  });
});

describe('upgrades widen range, power, information and advancement — never the hit contract',()=>{
  it('never turns a covered pitch into an out',()=>{
    for(const kind of Object.keys(CARDS).filter(k=>CARDS[k].type==='attack'&&k!=='bunt')){
      const s=held(kind,true),zone=coverage(s,'c0')[0];
      expect(swingOdds(s,'c0',zone)).toMatchObject({hit:1,covered:true});
    }
  });
  it('gives attack cards +18 power and leaves coverage identical',()=>{
    for(const kind of ['slug','finisher','strike','rally','defend']){
      const base=held(kind,false),up=held(kind,true);
      expect(cardPower(up.deck[0])-cardPower(base.deck[0])).toBe(1);
      expect(matchup(up,'c0').powerEdge-matchup(base,'c0').powerEdge).toBe(18);
      expect(coverage(up,'c0')).toEqual(coverage(base,'c0'));
    }
  });
  it('upgraded 릴리스 간파 adds the column, the only way a 세로 card gets information',()=>{
    const base=playCard(pitch(held('scout',false),5),'c0');
    expect(pitchClue(base)).toBe('중간 높이 확인');
    const up=playCard(pitch(held('scout',true),5),'c0');
    expect(pitchClue(up)).toBe('중간 높이 · 바깥 확인');
    const ball=playCard(pitch(held('scout',true),9),'c0');
    expect(pitchClue(ball)).toBe('존 밖 볼 확인');
  });
  it('upgraded 준비 cards deepen their own effect',()=>{
    expect(playCard(pitch(held('setup',false)),'c0').battle.aim).toBe(1);
    expect(playCard(pitch(held('setup',true)),'c0').battle.aim).toBe(2);
    expect(playCard(pitch(held('watch',true)),'c0').battle.hand).toHaveLength(3);
    expect(playCard(pitch(held('watch',false)),'c0').battle.hand).toHaveLength(2);
    expect(playCard(pitch(held('calm',true)),'c0').battle.hand).toHaveLength(2);
    expect(playCard(pitch(held('calm',false)),'c0').battle.hand).toHaveLength(1);
  });
  it('upgraded 코스 조정 survives the swing and dies with the plate appearance',()=>{
    const keep=playCard(pitch(held('lure',true)),'c0');
    expect(keep.battle.expanded).toBe(true);
    const swung=playCard(pitch(only(keep,'slug'),9,.9,.5),'c0'); // zone 9 = outside, so the PA continues
    expect(swung.battle.expanded).toBe(true);
    const plain=playCard(pitch(held('lure',false)),'c0');
    expect(playCard(pitch(only(plain,'slug'),9,.9,.5),'c0').battle.expanded).toBe(false);
  });
  it('upgraded 히트앤드런 moves existing runners two extra bases',()=>{
    const run=kind=>{let s=held('flow',kind);s.battle.bases=['p8',null,null];
      s=playCard(pitch(s),'c0');s=only(s,'strike');
      return playCard(pitch(s,s.battle.aimZone,.1,.99),'c0');};
    expect(run(false).battle.runs).toBe(0); // 1루 + 단타 1 + 사인 1 = 3루
    expect(run(true).battle.runs).toBe(1);  // 1루 + 단타 1 + 사인 2 = 홈
  });
});

describe('hand relations restate live battle state',()=>{
  it('pairs 릴리스 간파 with 가로 cards and only pairs 세로 once upgraded',()=>{
    const entries=[{id:'a',kind:'rally'},{id:'b',kind:'strike'},{id:'c',kind:'slug'}];
    const base=relationsFor({id:'s',kind:'scout'},entries);
    expect(base.get('a')).toMatchObject({kind:'synergy'});
    expect(base.has('b')).toBe(false);
    const up=relationsFor({id:'s',kind:'scout',plus:true},entries);
    expect(up.get('b')).toMatchObject({kind:'synergy'});
  });
  it('shows 코스 조정 as both a synergy and a conflict depending on the card',()=>{
    const m=relationsFor({id:'l',kind:'lure'},[{id:'a',kind:'slug'},{id:'b',kind:'rally'}]);
    expect(m.get('a').kind).toBe('synergy');
    expect(m.get('b').kind).toBe('conflict');
  });
  it('flags wide cards while 기다림 is engaged, because coverage collapses to one zone',()=>{
    expect(growthConflict({kind:'rally'},'patience')).toBeTruthy();
    expect(growthConflict({kind:'slug'},'patience')).toBeNull();
    expect(growthConflict({kind:'bunt'},'patience')).toBeNull(); // shape 'all' is exempt in coverage()
    expect(growthConflict({kind:'rally'},'normal')).toBeNull();
  });
});
