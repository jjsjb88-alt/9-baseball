import {describe,it,expect} from 'vitest';
import {createDuel,startBattle,playCard,chooseReward,saveDuel,readDuel,baseIntent,publicProbabilities,
  repertoire,repertoireWidth,readLevel,advanceBatter,endTurn,advancePitch} from '../src/duel/engine.js';
import {rewardProblem} from '../src/duel/deck.js';
import {perceivedProbabilities,planAction} from '../src/duel/policy.js';
import {STAGES,ZONES,ZONE_ORDER,WIDEN_EVERY,PUTAWAY_REACH,RELICS,RELIC_OFFERS,READ_THRESHOLDS,
  observeScore,bandFor,rangeFor,shadeFor,shadeNameFor} from '../src/duel/cards.js';

const pitch=(s,zone=s.battle.aimZone,roll=.5,powerRoll=.99)=>{s.battle.pending={zone,roll,powerRoll};return s;};
function only(s,kind,plus){
  s.deck[0]={id:'c0',kind,...(plus?{plus:true}:{})};
  const all=[...s.battle.hand,...s.battle.draw,...s.battle.discard];
  s.battle.hand=['c0'];s.battle.draw=all.filter(x=>x!=='c0');s.battle.discard=[];return s;
}
function reward(s=startBattle(createDuel(1))){
  s=only(s,'strike');s.battle.runs=STAGES[s.stage].target-1;s.battle.bases=[null,null,'p8'];
  return playCard(pitch(s),'c0');
}
function roundtrip(s){const m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};
  saveDuel(storage,s);expect(readDuel(storage)).toEqual(s);}

describe('a pitcher opens narrow and widens',()=>{
  it('throws only inside its repertoire; every other zone is exactly zero',()=>{
    const s=startBattle(createDuel(1));
    const live=repertoire(s),p=baseIntent(s).probabilities;
    expect(live).toEqual(ZONE_ORDER.rookie.slice(0,STAGES[0].zoneOpen).sort((a,b)=>a-b));
    for(let z=0;z<9;z++)expect(p[z]>0).toBe(live.includes(z));
    expect(p.reduce((a,x)=>a+x,0)).toBeCloseTo(1);
  });
  it('widens one zone every WIDEN_EVERY plate appearances up to the stage cap',()=>{
    const s=startBattle(createDuel(1));
    const widthAt=turn=>{s.battle.turn=turn;return repertoireWidth(s);};
    expect(widthAt(1)).toBe(STAGES[0].zoneOpen);
    expect(widthAt(1+WIDEN_EVERY)).toBe(STAGES[0].zoneOpen+1);
    expect(widthAt(1+WIDEN_EVERY*2)).toBe(STAGES[0].zoneOpen+2);
    expect(widthAt(99)).toBe(STAGES[0].zoneMax);
  });
  it('announces a permanent expansion at the next batter and records it in the log',()=>{
    let s=startBattle(createDuel(1));s=advanceBatter(playCard(pitch(s),'basic'));s=playCard(pitch(s),'basic');
    const before=repertoireWidth(s),zone=ZONE_ORDER[STAGES[s.stage].style][before];
    s=advanceBatter(s);
    const event=`투수 레퍼토리 확장 · ${before}→${before+1}존 · ${ZONES[zone]} 추가`;
    expect(s.last).toMatchObject({kind:'repertoire',events:[event]});
    expect(s.battle.log.slice(0,2)).toEqual(['3번 박도윤 타석 입장',event]);
    s=advanceBatter(playCard(pitch(s),'basic'));
    expect(s.last).toMatchObject({kind:'entry',events:[]});
  });
  it('later pitchers open wider than earlier ones',()=>{
    const opens=STAGES.map(st=>st.zoneOpen),caps=STAGES.map(st=>st.zoneMax);
    for(let i=1;i<opens.length;i++){expect(opens[i]).toBeGreaterThanOrEqual(opens[i-1]);expect(caps[i]).toBeGreaterThanOrEqual(caps[i-1]);}
    expect(caps.at(-1)).toBe(9);
  });
  it('reaches outside the repertoire at two strikes, then comes back',()=>{
    const s=startBattle(createDuel(1)),base=repertoire(s).length;
    s.battle.strikes=2;
    expect(repertoire(s).length).toBe(Math.min(9,base+PUTAWAY_REACH));
    s.battle.strikes=1;
    expect(repertoire(s).length).toBe(base);
  });
  it('never opens the batter aimed at a zone the pitcher does not throw',()=>{
    for(const build of ['pull','away','contact'])for(let stage=0;stage<4;stage++){
      let s=createDuel(7,build);s.stage=stage;s=startBattle(s);
      expect(repertoire(s)).toContain(s.battle.aimZone);
    }
  });
  it('keeps the narrow repertoire inside saved runs',()=>{
    const s=startBattle(createDuel(3));roundtrip(s);
    expect(s.battle.intent.repertoire).toEqual(repertoire(s));
    expect(s.battle.intent.width).toBe(STAGES[0].zoneOpen);
  });
});

describe('information is earned, never faked',()=>{
  it('starts every build at shading only',()=>{
    for(const build of ['pull','away','contact']){
      const s=createDuel(1,build);
      expect(observeScore(s.deck)).toBeLessThan(READ_THRESHOLDS[0]);
      expect(readLevel(s)).toBe(0);
    }
  });
  it('rises with 관찰 cards and counts an upgraded 관찰 double',()=>{
    const s=createDuel(1);
    const withScouts=n=>({...s,deck:[...s.deck,...Array.from({length:n},(_,i)=>({id:'x'+i,kind:'scout'}))]});
    expect(readLevel(withScouts(1))).toBe(1);
    expect(readLevel(withScouts(3))).toBe(2);
    const upgraded={...s,deck:s.deck.map(c=>c.kind==='scout'?{...c,plus:true}:c)};
    expect(observeScore(upgraded.deck)).toBe(observeScore(s.deck)+1);
  });
  it('lets 낡은 망원경 add exactly one level and never exceed the top',()=>{
    const s=createDuel(1);
    expect(readLevel({...s,relics:['scope']})).toBe(1);
    const full={...s,deck:[...s.deck,{id:'x',kind:'scout'},{id:'y',kind:'scout'},{id:'z',kind:'scout'}]};
    expect(readLevel(full)).toBe(2);
    expect(readLevel({...full,relics:['scope']})).toBe(2);
  });
  it('describes a probability without inventing digits and uses only three shades',()=>{
    expect(rangeFor(.17)).toBe('15~20%');
    expect(rangeFor(0)).toBe('0~5%');
    expect(bandFor(.4)).toBe('자주');
    expect(bandFor(0)).toBe('희박');
    expect(shadeFor(0)).toBe(shadeFor(.02));
    expect([0,.02,.13].map(shadeFor)).toEqual([1,1,1]);
    expect([.14,.27].map(shadeFor)).toEqual([2,2]);
    expect([.28,.5].map(shadeFor)).toEqual([3,3]);
    expect([.02,.16,.4].map(shadeNameFor)).toEqual(['드묾','가끔','자주']);
  });
  it('reports a true zero for zones outside the repertoire at every level',()=>{
    const s=startBattle(createDuel(1)),live=repertoire(s),p=publicProbabilities(s);
    for(let z=0;z<9;z++)if(!live.includes(z)){expect(p[z]).toBe(0);expect(bandFor(p[z])).toBe('희박');expect(shadeFor(p[z])).toBe(shadeFor(.02));}
  });
  it('limits the policy to shading, ranges, or exact odds at each read level',()=>{
    const s=startBattle(createDuel(1));
    s.battle.intent.probabilities=[.14,.20,.21,.06,.06,.06,.06,.06,.06,.09];
    const shade=perceivedProbabilities(s,0),range=perceivedProbabilities(s,1),exact=perceivedProbabilities(s,2);
    expect(shade[0]).toBeCloseTo(shade[1]);expect(shade[1]).toBeCloseTo(shade[2]);
    expect(range[0]).toBeLessThan(range[1]);expect(range[1]).toBeCloseTo(range[2]);
    expect(exact).toEqual(s.battle.intent.probabilities);
    for(const probabilities of [shade,range,exact])expect(probabilities.reduce((sum,p)=>sum+p,0)).toBeCloseTo(1);
  });
  it('hides unused zones at level zero unless the radar relic identifies them',()=>{
    const s=startBattle(createDuel(1));
    s.battle.intent.probabilities=[0,.02,.13,.14,.27,.28,.04,.04,.04,.04];
    const hidden=perceivedProbabilities(s,0);
    expect(hidden[0]).toBeCloseTo(hidden[1]);
    const revealed=perceivedProbabilities({...s,relics:['radar']},0);
    expect(revealed[0]).toBe(0);expect(revealed[1]).toBeGreaterThan(0);
  });
  it('can choose a different zone from the information visible at each level',()=>{
    const s=startBattle(createDuel(1));
    s.battle.preparations=2;s.battle.hand=[];
    s.battle.intent.probabilities=[.14,.20,.21,.06,.06,.06,.06,.06,.06,.09];
    expect([0,1,2].map(level=>planAction(s,{level}).zone)).toEqual([0,1,2]);
  });
  it('keeps the ledger ball probability exact, including a scouted certain ball',()=>{
    const s=startBattle(createDuel(1));s.relics=['ledger'];
    expect(perceivedProbabilities(s,0)[9]).toBeCloseTo(publicProbabilities(s)[9]);
    s.battle.scouted=true;s.battle.pending.zone=9;
    expect(perceivedProbabilities(s,0)).toEqual([0,0,0,0,0,0,0,0,0,1]);
  });
});

describe('relics sit on top of the deck',()=>{
  it('offers only this stage pair and refuses a duplicate',()=>{
    const s=reward();
    expect(rewardProblem(s.deck,{type:'relic',kind:RELIC_OFFERS[0][0]},0,'patience',[])).toBeNull();
    expect(rewardProblem(s.deck,{type:'relic',kind:'radar'},0,'patience',[])).toBeTruthy();
    expect(rewardProblem(s.deck,{type:'relic',kind:RELIC_OFFERS[0][0]},0,'patience',[RELIC_OFFERS[0][0]])).toBeTruthy();
    expect(rewardProblem(s.deck,{type:'relic',kind:'nonsense'},0,'patience',[])).toBeTruthy();
  });
  it('grants the relic, leaves the deck untouched, and round-trips',()=>{
    const s=reward(),n=chooseReward(s,{type:'relic',kind:'scope'},'patience');
    expect(n.relics).toEqual(['scope']);
    expect(n.deck).toEqual(s.deck);expect(n.nextId).toBe(s.nextId);
    expect(n.rewards).toEqual([{type:'relic',kind:'scope'}]);
    expect(readLevel(n)).toBe(readLevel(s)+1);
    roundtrip(n);roundtrip(startBattle(n));
  });
  it('refuses a save whose relics contradict its reward log',()=>{
    const s=chooseReward(reward(),{type:'relic',kind:'scope'},'patience');
    const m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};
    saveDuel(storage,{...s,relics:['scope','ledger']});
    expect(()=>readDuel(storage)).toThrow();
    saveDuel(storage,{...s,relics:['ledger']});
    expect(()=>readDuel(storage)).toThrow();
    saveDuel(storage,{...s,relics:[]});
    expect(()=>readDuel(storage)).toThrow();
  });
  it('names every offered relic in the catalogue',()=>{
    for(const pair of RELIC_OFFERS){expect(pair).toHaveLength(2);
      for(const k of pair)expect(RELICS[k]?.name).toBeTruthy();}
    expect(RELIC_OFFERS).toHaveLength(3); // one pair per reward stage
  });
});
