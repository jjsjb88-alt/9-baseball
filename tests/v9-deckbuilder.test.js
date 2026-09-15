import {describe,it,expect} from 'vitest';
import {createDuel,startBattle,chooseRoute,battleTarget,pitcherProfile,playCard,chooseReward,chooseFacility,saveDuel,readDuel,readLevel} from '../src/duel/engine.js';
import {BUILDS,CARDS,DECKBUILDER_BUILD,GROWTHS,STAGES,rewardChoices,RELIC_OFFERS,ROUTE_CHOICES} from '../src/duel/cards.js';

const pitch=(s,zone=s.battle.aimZone,roll=.1,powerRoll=.99)=>{
  s.battle.pending={zone,roll,powerRoll};
  return s;
};
function rewardState(){
  let s=createDuel(1,DECKBUILDER_BUILD);
  s=chooseRoute(s,ROUTE_CHOICES[0][0].id);
  s=startBattle(s);
  s.battle.runs=battleTarget(s)-1;
  s.battle.bases=[null,null,'p8'];
  s=playCard(pitch(s),'c0');
  expect(s.phase).toBe('reward');
  return s;
}
function nextReward(s){
  s=chooseRoute(s,ROUTE_CHOICES[s.stage][0].id);
  s=startBattle(s);
  s.battle.runs=battleTarget(s)-1;
  s.battle.bases=[null,null,'p8'];
  return playCard(pitch(s),'c0');
}
function roundtrip(s){
  let raw=null;
  const storage={setItem:(k,v)=>{raw=v},getItem:()=>raw};
  saveDuel(storage,s);
  expect(readDuel(storage)).toEqual(s);
}

describe('V9 main run builds a deck instead of choosing a finished archetype',()=>{
  it('starts from one neutral nine-card deck and leaves all growth tracks at zero',()=>{
    const s=createDuel(17,DECKBUILDER_BUILD);
    expect(s.version).toBe(9);
    expect(s.build).toBe(DECKBUILDER_BUILD);
    expect(BUILDS[s.build].name).toBe('무명 타선');
    expect(s.deck).toHaveLength(9);
    expect(s.nextId).toBe(9);
    expect(s.deck.filter(c=>c.kind==='place')).toHaveLength(4);
    expect(s.deck.some(c=>['slug','rally','defend','bunt','flow','finisher'].includes(c.kind))).toBe(false);
    expect(Object.keys(s.growth)).toEqual(Object.keys(GROWTHS));
    expect(Object.values(s.growth)).toEqual([0,0,0]);
    expect(s.growthHistory).toEqual([]);
    expect(s.route).toBeNull();
    expect(s.routeHistory).toEqual([]);
  });

  it('requires a route and makes the hard branch genuinely harder for a larger draft',()=>{
    const base=createDuel(23,DECKBUILDER_BUILD);
    expect(startBattle(base)).toBe(base);
    const hard=ROUTE_CHOICES[0][1],routed=chooseRoute(base,hard.id);
    expect(routed).not.toBe(base);
    expect(battleTarget(routed)).toBe(STAGES[0].target+hard.targetDelta);
    expect(pitcherProfile(routed)).toEqual({
      stuff:STAGES[0].stats.stuff+hard.statBonus,
      movement:STAGES[0].stats.movement+hard.statBonus,
      command:STAGES[0].stats.command+hard.statBonus,
    });
    const pool=rewardChoices(0,null,DECKBUILDER_BUILD,hard.id);
    expect(pool).toEqual(['slug','rally','defend',hard.rewardBonus]);
    expect(startBattle(routed).phase).toBe('battle');
    roundtrip(routed);
  });

  it('offers three different identity seeds after the first win',()=>{
    const pool=rewardChoices(0,null,DECKBUILDER_BUILD);
    expect(pool).toEqual(['slug','rally','defend']);
    expect(new Set(pool).size).toBe(3);
    for(const kind of pool)expect(CARDS[kind]).toBeTruthy();
  });

  it('adds exactly one drafted card without secretly granting a growth rank',()=>{
    const s=rewardState();
    expect(s.routeHistory).toEqual([ROUTE_CHOICES[0][0].id]);
    const n=chooseReward(s,{type:'add',kind:'slug'},null);
    expect(n).not.toBe(s);
    expect(n.phase).toBe('facility');
    expect(n.stage).toBe(1);
    expect(n.route).toBeNull();
    expect(n.deck).toHaveLength(10);
    expect(n.deck.at(-1)).toEqual({id:'c9',kind:'slug'});
    expect(n.nextId).toBe(10);
    expect(n.growth).toEqual({patience:0,relay:0,fortune:0});
    expect(n.growthHistory).toEqual([null]);
    expect(n.rewards).toEqual([{type:'add',kind:'slug'}]);
    roundtrip(n);
    const trained=chooseFacility(n,{type:'training',id:'c4'});
    expect(trained.phase).toBe('map');
    expect(trained.deck.find(c=>c.id==='c4').plus).toBe(true);
    expect(trained.facilities[0]).toMatchObject({type:'training',id:'c4',kind:'strike'});
    roundtrip(trained);
    roundtrip(startBattle(trained));
  });

  it('can skip a card without turning the skip into hidden progression',()=>{
    const s=rewardState();
    const n=chooseReward(s,{type:'skip'},null);
    expect(n.deck).toEqual(s.deck);
    expect(n.growth).toEqual(s.growth);
    expect(n.growthHistory).toEqual([null]);
    expect(n.rewards).toEqual([{type:'skip'}]);
    expect(n.phase).toBe('facility');
    roundtrip(n);
  });



  it('makes scouting a one-game information choice, not permanent free knowledge',()=>{
    const drafted=chooseReward(rewardState(),{type:'add',kind:'rally'},null);
    expect(readLevel(drafted)).toBe(0);
    const scouted=chooseFacility(drafted,{type:'scouting'});
    expect(scouted.phase).toBe('map');
    expect(scouted.facilities).toEqual([{type:'scouting'}]);
    expect(readLevel(scouted)).toBe(1);
    const routed=chooseRoute(scouted,ROUTE_CHOICES[scouted.stage][0].id);
    expect(readLevel(startBattle(routed))).toBe(1);
    expect(readLevel({...scouted,stage:2})).toBe(0);
    roundtrip(scouted);
  });

  it('separates deck thinning and equipment into the second route',()=>{
    let s=chooseReward(rewardState(),{type:'add',kind:'slug'},null);
    s=chooseFacility(s,{type:'training',id:'c4'});
    s=nextReward(s);
    expect(s.phase).toBe('reward');
    s=chooseReward(s,{type:'add',kind:'scout'},null);
    expect(s.phase).toBe('facility');

    const thinned=chooseFacility(s,{type:'release',id:'c0'});
    expect(thinned.deck).toHaveLength(s.deck.length-1);
    expect(thinned.facilities[1]).toMatchObject({type:'release',kind:'place'});
    roundtrip(thinned);

    const relic=RELIC_OFFERS[1][0];
    const equipped=chooseFacility(s,{type:'equipment',kind:relic});
    expect(equipped.relics).toContain(relic);
    expect(equipped.facilities[1]).toEqual({type:'equipment',kind:relic});
    roundtrip(equipped);
  });

  it('keeps upgrade, removal and relics out of combat rewards',()=>{
    const s=rewardState();
    for(const action of [
      {type:'remove',id:'c0'},
      {type:'upgrade',id:'c0'},
      {type:'relic',kind:'scope'},
    ])expect(chooseReward(s,action,null)).toBe(s);
  });
});
