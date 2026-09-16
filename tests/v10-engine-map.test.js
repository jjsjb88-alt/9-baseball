import {describe,it,expect} from 'vitest';
import {PITCHER_DAMAGE,createPitcherHp,pitcherPhase,damageForOutcome,applyPitcherOutcome} from '../src/duel/pitcher-hp.js';
import {createRunMap,actHasBossPath,validateRunMap,selectRunNode,getRunNode} from '../src/duel/run-map.js';
import {SAVE_KEY} from '../src/duel/cards.js';
import {
  createDuel,startBattle,swingOdds,matchup,
  createV10Duel,enterV10Node,playV10Action,advanceV10Pitch,advanceV10Batter,
  claimV10Reward,v10RewardOptions,v10UtilityOptions,completeV10UtilityNode,
  selectV10Pitcher,selectV10Combat,selectV10Map,
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

  it('keeps early route choices committed before offering a second pivot, and varies topology by seed',()=>{
    const signatures=new Set();
    const children=(map,id)=>map.edges.filter(e=>e.from===id).map(e=>e.to);
    for(let seed=0;seed<64;seed++){
      const map=createRunMap(seed);
      signatures.add(map.edges.map(e=>e.from+'>'+e.to).join('|'));
      for(let act=1;act<=3;act++){
        const branches=children(map,`a${act}-entry`);
        expect(branches.length).toBeGreaterThanOrEqual(2);
        const committed=branches.map(id=>new Set(children(map,id)));
        for(let i=0;i<committed.length;i++)for(let j=i+1;j<committed.length;j++){
          expect([...committed[i]].filter(id=>committed[j].has(id))).toEqual([]);
        }
      }
    }
    expect(signatures.size).toBeGreaterThan(1);
  });

  it('exposes opponent identity, risk and reward before combat',()=>{
    const map=createRunMap(21);
    const combat=map.nodes.filter(n=>['battle','elite','boss'].includes(n.type));
    expect(combat.length).toBeGreaterThan(0);
    for(const n of combat){
      expect(n.preview).toContain('HP ');
      expect(n.opponent.name).toBeTruthy();
      expect(n.opponent.threat).toBeTruthy();
      expect(['rookie','sinker','deep','closer']).toContain(n.opponent.style);
      expect(n.risk).toBeTruthy();expect(n.reward).toBeTruthy();
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
    const openingId=selectV10Map(s).reachableIds[0],openingNode=getRunNode(s.runMap,openingId);
    s=enterV10Node(s,openingId);
    expect(s.phase).toBe('battle');
    expect(Object.keys(selectV10Pitcher(s))).toEqual(['name','hp','maxHp','phase','lastDamage']);
    expect(s.pitcher.name).toBe(openingNode.opponent.name);
    expect(s.pitcher.maxHp).toBe(openingNode.opponent.maxHp);
    expect(s.battle.intent.maxWidth).toBe(openingNode.opponent.zoneMax);
    expect(s.v10.opponent.archetypeKey).toBe(openingNode.opponent.archetypeKey);
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

  it('makes training, locker, shop and rest nodes change the run instead of acting as decoration',()=>{
    const arm=(type,seed=17)=>{
      const s=createV10Duel(seed),node=s.runMap.nodes.find(n=>n.type===type);
      expect(node).toBeTruthy();
      s.phase=type;s.runMap.currentNodeId=node.id;s.runMap.reachableIds=[];s.v10.nodeId=node.id;
      return {s,node};
    };

    let x=arm('training').s,opts=v10UtilityOptions(x);
    expect(opts.length).toBeGreaterThan(0);
    const upgrade=opts[0];x=completeV10UtilityNode(x,upgrade);
    expect(x.deck.find(c=>c.id===upgrade.id).plus).toBe(true);
    expect(x.v10.utilityHistory.at(-1).kind).toBe('training');

    x=arm('locker').s;x.deck=[...x.deck,{id:'c9',kind:'slug'}];x.nextId=10;
    opts=v10UtilityOptions(x);expect(opts.length).toBeGreaterThan(0);
    const remove=opts.find(o=>o.id==='c9')||opts[0],beforeRemove=x.deck.length;
    x=completeV10UtilityNode(x,remove);expect(x.deck.length).toBe(beforeRemove-1);

    x=arm('shop').s;opts=v10UtilityOptions(x);expect(opts.length).toBeGreaterThan(0);
    const add=opts[0],beforeAdd=x.deck.length;x=completeV10UtilityNode(x,add);
    expect(x.deck.length).toBe(beforeAdd+1);expect(x.deck.at(-1).kind).toBe(add.kind);

    x=createV10Duel(19);
    const rest=x.runMap.nodes.find(n=>n.type==='rest'&&x.runMap.edges.some(e=>e.from===n.id&&['battle','elite','boss'].includes(getRunNode(x.runMap,e.to)?.type)));
    expect(rest).toBeTruthy();
    x.phase='rest';x.runMap.currentNodeId=rest.id;x.runMap.reachableIds=[];x.v10.nodeId=rest.id;
    x=completeV10UtilityNode(x,{type:'rest'});
    expect(x.v10.nextBattleBonus).toMatchObject({technique:8,source:'rest'});
    const combatId=x.runMap.reachableIds.find(id=>['battle','elite','boss'].includes(getRunNode(x.runMap,id)?.type));
    expect(combatId).toBeTruthy();
    x=enterV10Node(x,combatId);expect(x.v10.activeBattleBonus.technique).toBe(8);
    const boosted=matchup(x,'basic').hitter.technique;
    const plain={...x,v10:{...x.v10,activeBattleBonus:null}};
    expect(boosted-matchup(plain,'basic').hitter.technique).toBe(8);
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

  it('ignores the legacy score target until pitcher HP actually reaches zero',()=>{
    let s=createV10Duel(29);s=enterV10Node(s,'a1-entry');
    const hp=s.pitcher.hp;s.battle.runs=99;
    s.battle.pending={...s.battle.pending,zone:s.battle.aimZone,roll:.5,powerRoll:.5};
    s=playV10Action(s,{type:'take'});
    expect(s.phase).toBe('pitch');
    expect(s.pitcher.hp).toBe(hp);
    expect(s.victories).toBe(0);expect(s.routeHistory).toEqual([]);
  });

  it('finishes the run immediately when the act-three boss reaches zero HP',()=>{
    let s=createV10Duel(31);
    s.runMap.reachableIds=['a3-boss'];
    s=enterV10Node(s,'a3-boss');expect(s.phase).toBe('battle');
    s.pitcher={...s.pitcher,hp:12,phase:'critical'};
    s.battle.pending={...s.battle.pending,zone:s.battle.aimZone,roll:0,powerRoll:.99};
    s=playV10Action(s,{type:'card',id:'basic'});
    expect(s.phase).toBe('won');expect(s.v10.runComplete).toBe(true);
    expect(s.runMap.completedNodeIds).toContain('a3-boss');
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
