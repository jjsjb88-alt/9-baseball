import {describe,it,expect} from 'vitest';
import {PITCHER_DAMAGE,createPitcherHp,pitcherPhase,damageForOutcome,applyPitcherOutcome} from '../src/duel/pitcher-hp.js';
import {createRunMap,actHasBossPath,validateRunMap,selectRunNode,getRunNode} from '../src/duel/run-map.js';
import {SAVE_KEY} from '../src/duel/cards.js';
import {
  createDuel,startBattle,swingOdds,
  createV10Duel,enterV10Node,playV10Action,advanceV10Pitch,advanceV10Batter,
  claimV10Reward,v10RewardOptions,selectV10Pitcher,selectV10Combat,selectV10Map,
  saveV10Duel,readV10Duel,V10_SAVE_KEY,
} from '../src/duel/engine.js';

describe('V10 pitcher HP contract',()=>{
  it('maps every requested baseball verdict to damage',()=>{
    const d=(o,streak=0)=>damageForOutcome(o,streak).damage;
    expect(d({kind:'hit',bases:4})).toBe(PITCHER_DAMAGE.homeRun);
    expect(d({kind:'hit',bases:3})).toBe(PITCHER_DAMAGE.triple);
    expect(d({kind:'hit',bases:2})).toBe(PITCHER_DAMAGE.double);
    expect(d({kind:'hit',bases:1})).toBe(PITCHER_DAMAGE.single);
    expect(d({kind:'out'})).toBe(4);
    expect(d({kind:'ball',label:'볼넷'})).toBe(6);
    expect(d({kind:'foul',aimZone:0,zone:1})).toBe(3);
    expect(d({kind:'foul',aimZone:0,zone:8})).toBe(2);
    expect(d({kind:'whiff',aimZone:0,zone:1})).toBe(2);
    expect(d({kind:'whiff',aimZone:0,zone:8})).toBe(1);
    expect(d({kind:'ball'})).toBe(1);
    expect(d({kind:'called'})).toBe(0);
  });

  it('uses 60/30 percent phases, attenuates repeated fouls, prevents duplicate damage, and locks at zero',()=>{
    expect(pitcherPhase(61,100)).toBe('steady');
    expect(pitcherPhase(60,100)).toBe('pressured');
    expect(pitcherPhase(30,100)).toBe('critical');
    expect(pitcherPhase(0,100)).toBe('defeated');
    const foul={kind:'foul',aimZone:0,zone:1};
    expect([0,1,2,3].map(n=>damageForOutcome(foul,n).damage)).toEqual([3,2,1,0]);

    let p=createPitcherHp({maxHp:100});
    let a=applyPitcherOutcome(p,{kind:'hit',bases:1},{pitchId:1});p=a.pitcher;
    expect(p.hp).toBe(88);
    a=applyPitcherOutcome(p,{kind:'hit',bases:1},{pitchId:1});
    expect(a.pitcher.hp).toBe(88);expect(a.result.duplicate).toBe(true);expect(a.result.damage).toBe(0);

    p=createPitcherHp({maxHp:12});
    a=applyPitcherOutcome(p,{kind:'hit',bases:1},{pitchId:1});p=a.pitcher;
    expect(p.hp).toBe(0);expect(p.phase).toBe('defeated');
    a=applyPitcherOutcome(p,{kind:'ball'},{pitchId:2});
    expect(a.pitcher.hp).toBe(0);expect(a.result.locked).toBe(true);
  });

  it('preserves the covered-zone hit guarantee from V9',()=>{
    const s=startBattle(createDuel(5,'away')),zone=s.battle.aimZone;
    const odds=swingOdds(s,'basic',zone);
    expect(odds.covered).toBe(true);expect(odds.hit).toBe(1);expect(odds.out).toBe(0);
  });
});

describe('V10 deterministic run map',()=>{
  it('is deterministic and guarantees an act entry-to-boss path across seeds',()=>{
    expect(createRunMap(42)).toEqual(createRunMap(42));
    expect(createRunMap(42).nodes.map(n=>n.seed)).not.toEqual(createRunMap(43).nodes.map(n=>n.seed));
    for(let seed=0;seed<128;seed++){
      const map=createRunMap(seed);expect(validateRunMap(map)).toBe(true);
      for(let act=1;act<=3;act++)expect(actHasBossPath(map,act)).toBe(true);
    }
  });

  it('supports every node type and rejects disconnected selections',()=>{
    const map=createRunMap(9),types=new Set(map.nodes.map(n=>n.type));
    for(const type of ['battle','elite','training','locker','shop','rest','boss'])expect(types.has(type)).toBe(true);
    const blocked=selectRunNode(map,'a1-boss');
    expect(blocked.error).toBe('unreachable');expect(blocked.map).toBe(map);
  });
});

describe('V10 engine loop and save isolation',()=>{
  it('runs battle -> pitcher defeated -> card reward -> map -> next pitcher',()=>{
    let s=createV10Duel(7);
    expect(Object.keys(selectV10Map(s))).toEqual(['nodes','edges','currentNodeId','reachableIds']);
    s=enterV10Node(s,selectV10Map(s).reachableIds[0]);
    expect(s.phase).toBe('battle');
    expect(Object.keys(selectV10Pitcher(s))).toEqual(['name','hp','maxHp','phase','lastDamage']);
    const firstMax=s.pitcher.maxHp;
    s.pitcher={...s.pitcher,hp:12,phase:'critical'};
    s.battle.pending={...s.battle.pending,zone:s.battle.aimZone,roll:0,powerRoll:.99};
    s=playV10Action(s,{type:'card',id:'basic'});
    expect(s.phase).toBe('reward');expect(s.pitcher.hp).toBe(0);
    expect(selectV10Combat(s)).toMatchObject({choice:'basic',damage:12,hpAfter:0});
    expect(v10RewardOptions(s).length).toBeGreaterThan(0);

    const reward=v10RewardOptions(s)[0],firstNode=s.runMap.currentNodeId;
    s=claimV10Reward(s,{type:'add',kind:reward});
    expect(s.phase).toBe('map');expect(s.runMap.completedNodeIds).toContain(firstNode);
    const nextCombat=s.runMap.reachableIds.find(id=>getRunNode(s.runMap,id)?.type==='elite');
    expect(nextCombat).toBeTruthy();
    s=enterV10Node(s,nextCombat);
    expect(s.phase).toBe('battle');expect(s.pitcher.hp).toBe(s.pitcher.maxHp);
    expect(s.pitcher.maxHp).toBeGreaterThan(firstMax);
  });

  it('round-trips V10 under a new key without touching V9 save data',()=>{
    const bag=new Map(),storage={getItem:k=>bag.has(k)?bag.get(k):null,setItem:(k,v)=>bag.set(k,String(v))};
    storage.setItem(SAVE_KEY,'legacy-v9');
    const s=createV10Duel(123);
    saveV10Duel(storage,s);
    expect(V10_SAVE_KEY).not.toBe(SAVE_KEY);
    expect(storage.getItem(SAVE_KEY)).toBe('legacy-v9');
    expect(readV10Duel(storage)).toEqual(s);
  });

  it('does not let a pure whiff policy defeat the pitcher before three outs',()=>{
    let s=createV10Duel(33);s=enterV10Node(s,'a1-entry');
    const initialHp=s.pitcher.hp;let guard=0;
    while(s.phase!=='lost'&&guard++<40){
      if(s.phase==='battle'){
        const far=s.battle.aimZone<=4?8:0;
        s.battle.pending={...s.battle.pending,zone:far,roll:.99,powerRoll:.99};
        s=playV10Action(s,{type:'card',id:'basic'});
      }else if(s.phase==='pitch')s=advanceV10Pitch(s);
      else if(s.phase==='between')s=advanceV10Batter(s);
      else break;
    }
    expect(s.phase).toBe('lost');expect(initialHp-s.pitcher.hp).toBe(9);expect(s.pitcher.hp).toBeGreaterThan(0);
  });
});
