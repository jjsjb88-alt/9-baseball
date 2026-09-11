import {describe,it,expect} from 'vitest';
import {createDuel,startBattle,playCard,endTurn,chooseCard,previewCard,readDuel,saveDuel,cardProblem,baseIntent,advanceBatter,currentBatter,advancePitch,setAimZone,coverage,swingOdds,hitProfile,publicProbabilities,setGrowthMode} from '../src/duel/engine.js';
import {planAction} from '../src/duel/policy.js';
import {SAVE_KEY,LINEUP,CARDS,BUILDS} from '../src/duel/cards.js';
const memory=()=>{const d={};return {setItem:(k,v)=>d[k]=v,getItem:k=>d[k]??null}};
function fixture(kind='strike',build='away'){const s=startBattle(createDuel(1,build));s.deck[0].kind=kind;return s;}
function pitch(s,zone,roll=.5,powerRoll=.95){s.battle.pending={zone,roll,powerRoll};return s;}
function roundtrip(s){const store=memory();saveDuel(store,s);expect(readDuel(store)).toEqual(s);if(s.battle){const b=s.battle,ids=[...b.hand,...b.draw,...b.discard];expect(ids).toHaveLength(s.deck.length);expect(new Set(ids).size).toBe(s.deck.length);expect(b.bases.filter(Boolean).every(id=>LINEUP.some(p=>p.id===id))).toBe(true);}}
describe('9-zone read success is guaranteed; stats only choose hit type',()=>{
  it('every covered zone, swing, build and random roll is a hit, including BASIC',()=>{
    for(const build of Object.keys(BUILDS))for(const kind of ['basic',...Object.keys(CARDS).filter(k=>CARDS[k].type==='attack'&&k!=='bunt')]){
      let s=fixture(kind==='basic'?'strike':kind,build);const id=kind==='basic'?'basic':'c0';
      for(let aim=0;aim<9;aim++){s=setAimZone(s,aim);for(const z of coverage(s,id))for(const roll of [0,.25,.6,.999999]){
        const n=playCard(pitch(s,z,roll),'basic'===kind?'basic':'c0');expect(n.stats.hits).toBe(1);expect(n.stats.outs).toBe(0);expect(n.stats.appearances).toBe(1);
      }}
    }
  });
  it('a named batter reaches base; used card is discarded and no second swing is allowed',()=>{
    const s=playCard(pitch(fixture(),5),'c0');expect(s.battle.bases[0]).toBe('p1');expect(s.battle.discard).toContain('c0');expect(s.phase).toBe('between');
    expect(playCard(s,'c1')).toBe(s);expect(endTurn(s)).toBe(s);expect(advancePitch(s)).toBe(s);roundtrip(s);
    const n=advanceBatter(s);expect(currentBatter(n).id).toBe('p2');expect(n.battle.balls).toBe(0);expect(advanceBatter(n)).toBe(n);roundtrip(n);
  });
  it('power and technique change hit mix, not hit guarantee',()=>{
    const s=setAimZone(fixture('slug','pull'),3),profile=hitProfile(s,'c0',3);
    expect(profile.reduce((a,t)=>a+t.p,0)).toBeCloseTo(1);
    const weak=structuredClone(s);weak.build='contact';
    expect(profile[0].p).toBeGreaterThan(hitProfile(weak,'c0',3)[0].p);
    const strongerPitcher=structuredClone(s);strongerPitcher.stage=3;
    expect(profile[0].p).toBeGreaterThan(hitProfile(strongerPitcher,'c0',3)[0].p);
    const labels=new Set();
    let offset=0;for(const t of profile){if(t.p>0){const n=playCard(pitch(s,3,.999,offset+t.p/2),'c0');labels.add(n.battle.revealed.label);expect(n.stats.hits).toBe(1);}offset+=t.p;}
    expect(labels).toContain('홈런');expect(labels).toContain('땅볼 안타');expect(labels).toContain('중전안타');expect(labels).toContain('바가지 안타 · 행운의 단타');
  });
  it('expanded coverage guarantees hits but reduces extra-base power',()=>{
    const s=setAimZone(fixture('slug','pull'),3);const normal=hitProfile(s,'c0',3)[0].p;
    s.battle.expanded=true;expect(coverage(s,'c0').length).toBeGreaterThan(1);expect(hitProfile(s,'c0',3)[0].p).toBeLessThan(normal);
    for(const z of coverage(s,'c0'))expect(playCard(pitch(s,z,.99),'c0').stats.hits).toBe(1);
  });
  it('preview uses public odds, cannot reveal hidden pitch or consume random numbers',()=>{
    const s=fixture(),before=structuredClone(s),a=previewCard(s,'c0');pitch(s,0,0,0);const b=previewCard(s,'c0');expect(a).toEqual(b);
    expect(s.seed).toBe(before.seed);expect(s.pitchSeed).toBe(before.pitchSeed);expect(a.hit).toBeCloseTo(coverage(s,'c0').reduce((v,z)=>v+s.battle.intent.probabilities[z],0));expect(a.bases).toBeUndefined();
  });
  it('same seed starts all builds against same pitcher; choosing aim or drawing cannot reroll',()=>{
    const starts=Object.keys(BUILDS).map(k=>startBattle(createDuel(37,k)));
    expect(starts[0].battle.pending).toEqual(starts[1].battle.pending);expect(starts[1].battle.pending).toEqual(starts[2].battle.pending);
    let s=fixture('watch');const pending=structuredClone(s.battle.pending);s=setAimZone(s,8);s=playCard(s,'c0');expect(s.battle.pending).toEqual(pending);expect(s.stats.pitches).toBe(0);roundtrip(s);
  });
  it('scouting reveals only height/ball and conditions public probabilities',()=>{
    const s=pitch(fixture('scout'),8),n=playCard(s,'c0');const p=publicProbabilities(n);
    expect(p.slice(0,6)).toEqual([0,0,0,0,0,0]);expect(p[9]).toBe(0);expect(p[6]).toBeGreaterThan(0);expect(p[7]).toBeGreaterThan(0);expect(p[8]).toBeGreaterThan(0);expect(p.reduce((a,v)=>a+v,0)).toBeCloseTo(1);roundtrip(n);
  });
  it('two preparations do not consume pitches, and a third is rejected even at two strikes',()=>{
    let s=fixture('setup');s.deck[1].kind='calm';s.deck[2].kind='watch';s.battle.strikes=2;
    s=playCard(s,'c0');s=playCard(s,'c1');expect(s.battle.preparations).toBe(2);expect(s.stats.pitches).toBe(0);expect(cardProblem(s,'c2')).toContain('준비 2회');roundtrip(s);
  });
  it('whiff continues same batter with persisted reveal gate',()=>{
    const s=playCard(pitch(fixture('slug'),0,.99),'c0');expect(s.phase).toBe('pitch');expect(s.battle.strikes).toBe(1);expect(s.stats.appearances).toBe(0);
    expect(playCard(s,'basic')).toBe(s);expect(setAimZone(s,0)).toBe(s);roundtrip(s);
    const n=advancePitch(s);expect(currentBatter(n).id).toBe('p1');expect(n.phase).toBe('battle');expect(n.battle.pending).not.toBeNull();expect(n.battle.revealed).toBeNull();roundtrip(n);
  });
  it('ordinary two-strike foul survives, bunt two-strike foul strikes out',()=>{
    const s=pitch(fixture('slug'),0,0);s.battle.strikes=2;const n=playCard(s,'c0');expect(n.battle.strikes).toBe(2);expect(n.phase).toBe('pitch');expect(n.stats.fouls).toBe(1);roundtrip(n);
    const bunt=pitch(fixture('bunt'),4,0);bunt.battle.strikes=2;const out=playCard(bunt,'c0');expect(out.phase).toBe('between');expect(out.battle.outs).toBe(1);expect(out.battle.revealed.label).toBe('번트 파울 삼진');roundtrip(out);
  });
  it('three called strikes end one PA; all balls count as balls',()=>{
    let s=fixture();for(let i=0;i<3;i++){s=endTurn(pitch(s,4));if(i<2)s=advancePitch(s);}
    expect(s.battle.strikes).toBe(3);expect(s.battle.outs).toBe(1);expect(s.stats.appearances).toBe(1);expect(s.phase).toBe('between');roundtrip(s);
    const ball=endTurn(pitch(fixture(),9));expect(ball.battle.balls).toBe(1);expect(ball.battle.strikes).toBe(0);roundtrip(ball);
  });
  it('walk forces only connected runners, and bases-loaded walk scores exactly one',()=>{
    for(const bases of [[null,'p8','p9'],['p7',null,'p9'],['p7','p8','p9']]){
      let s=fixture();s.battle.bases=[...bases];for(let i=0;i<4;i++){s=endTurn(pitch(s,9));if(i<3)s=advancePitch(s);}
      expect(s.stats.walks).toBe(1);expect(s.battle.bases[0]).toBe('p1');expect(s.battle.runs).toBe(bases.every(Boolean)?1:0);expect(s.battle.bases[2]).toBe(bases.every(Boolean)?'p8':'p9');roundtrip(s);
    }
  });
  it('third-out sacrifice never advances runners or scores',()=>{
    const s=pitch(fixture('bunt'),4,.5);s.battle.outs=2;s.battle.bases[2]='p9';
    const n=playCard(s,'c0');expect(n.phase).toBe('lost');expect(n.stats.runs).toBe(0);expect(n.battle.bases[2]).toBe('p9');roundtrip(n);
  });
  it('BASIC works with empty hand and guarantees single on the selected zone',()=>{
    const s=fixture();s.battle.discard.push(...s.battle.hand);s.battle.hand=[];
    const n=playCard(pitch(s,s.battle.aimZone),'basic');expect(n.battle.bases[0]).toBe('p1');expect(n.stats.cards).toBe(0);expect(n.stats.hits).toBe(1);roundtrip(n);
  });
  it('hit and run moves players only on the subsequent hit',()=>{
    let s=fixture('flow');s.deck[1].kind='rally';s.battle.bases[0]='p8';s=playCard(s,'c0');expect(s.battle.bases[0]).toBe('p8');
    s=playCard(pitch(s,s.battle.aimZone),'c1');expect(s.battle.runs).toBe(1);expect(s.battle.bases[0]).toBe('p1');roundtrip(s);
  });
  it('ninth batter wraps to first after confirmed PA',()=>{
    const s=fixture();s.battle.batterIndex=8;s.battle.turn=9;const hit=playCard(pitch(s,5),'c0');expect(hit.battle.bases[0]).toBe('p9');const next=advanceBatter(hit);expect(currentBatter(next).id).toBe('p1');expect(next.battle.turn).toBe(10);roundtrip(next);
  });
  it('public bot cannot see hidden pitches; entire runs conserve players/cards and terminate',()=>{
    const a=fixture(),b=structuredClone(a);pitch(a,0,.1);pitch(b,8,.99);expect(planAction(a)).toEqual(planAction(b));
    const phases=new Set();let won=0;
    for(const build of Object.keys(BUILDS))for(let seed=1;seed<=10;seed++){
      let s=createDuel(seed,build),guard=0;
      while(!['won','lost'].includes(s.phase)&&guard++<1000){
        phases.add(s.phase);
        if(s.phase==='map')s=startBattle(s);else if(s.phase==='between')s=advanceBatter(s);else if(s.phase==='pitch')s=advancePitch(s);else if(s.phase==='reward')s=chooseCard(s,['flow','lure','finisher'][s.stage],['patience','relay','fortune'][s.stage]);
        else{const a=planAction(s);s=setGrowthMode(setAimZone(s,a.zone),a.mode);s=a.id?playCard(s,a.id):endTurn(s);}
        roundtrip(s);
      }
      expect(guard).toBeLessThan(1000);if(s.phase==='won')won++;
    }
    expect(won).toBeGreaterThan(0);expect([...phases]).toEqual(expect.arrayContaining(['map','battle','pitch','between','reward']));
  // Thirty full runs with per-action save validation need headroom on shared CI runners.
  // Keep every seed, invariant, and the per-run termination guard intact.
  },30000);
  it('saves preserve pending pitch and reject old, mixed, and corrupt state',()=>{
    roundtrip(fixture());const store=memory();
    for(const corrupt of [s=>s.battle.bases[0]='c0',s=>s.battle.hand.push('p1'),s=>s.battle.bases=['p8','p8',null],s=>s.version=3,s=>s.battle.pending.zone=10,s=>s.battle.pending.roll=NaN,s=>s.battle.balls=4]){
      const s=fixture();corrupt(s);saveDuel(store,s);expect(()=>readDuel(store)).toThrow();
    }
    store.setItem(SAVE_KEY,'{');expect(()=>readDuel(store)).toThrow();
  });
});
