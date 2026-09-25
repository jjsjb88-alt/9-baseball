// V10 엔진을 통합에서 조인 부분. Codex 원본 테스트는 v10-engine-map.test.js가 계속 지킨다.
import {describe,it,expect} from 'vitest';
import {ACT_ESCALATION,createRunMap,validateRunMap,everyNodeReachesBoss,reachableMatchesProgress,selectRunNode,completeRunNode} from '../src/duel/run-map.js';
import {actDelta,actStats} from '../src/duel/v10-copy.js';
import {createV10Duel,enterV10Node,playV10Action,advanceV10Pitch,advanceV10Batter,setAimZone,v10NodeProblem,selectV10Combat,claimV10Reward,completeV10UtilityNode,v10NormalizeHand} from '../src/duel/engine.js';
import {validateV10State} from '../src/duel/v10-storage.js';

const SEEDS=Array.from({length:120},(_,i)=>i*7+1);

describe('지도 생성', ()=>{
  it('한 런 안에서 투수 이름이 겹치지 않는다',()=>{
    for(const seed of SEEDS){
      const names=createRunMap(seed).nodes.filter(n=>n.opponent).map(n=>n.opponent.name);
      expect(names.length).toBeGreaterThan(12);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('상대 요약은 그 칸의 실제 이름을 쓴다',()=>{
    for(const seed of SEEDS.slice(0,20))
      for(const node of createRunMap(seed).nodes)
        if(node.opponent)expect(node.preview.startsWith(node.opponent.name)).toBe(true);
  });

  it('어느 칸을 골라도 그 막의 보스까지 닿는다',()=>{
    for(const seed of SEEDS){
      const map=createRunMap(seed);
      for(let act=1;act<=3;act++)expect(everyNodeReachesBoss(map,act)).toBe(true);
    }
  });
});

describe('저장 검증', ()=>{
  it('진행과 어긋난 reachableIds를 거른다',()=>{
    const map=createRunMap(3);
    expect(validateRunMap(map)).toBe(true);
    expect(validateRunMap({...map,reachableIds:['a3-boss']})).toBe(false);
    expect(validateRunMap({...map,reachableIds:[]})).toBe(false);
  });

  it('칸에 들어간 동안에는 갈 수 있는 칸이 없다',()=>{
    const {map}=selectRunNode(createRunMap(3),'a1-entry');
    expect(reachableMatchesProgress(map)).toBe(true);
    expect(reachableMatchesProgress({...map,reachableIds:['a1-boss']})).toBe(false);
  });

  it('처음부터 끝까지 걸어도 매 단계가 저장 가능한 상태다',()=>{
    for(const seed of SEEDS.slice(0,40)){
      let map=createRunMap(seed),guard=0;
      while(guard++<60&&map.reachableIds.length){
        const picked=selectRunNode(map,map.reachableIds[seed%map.reachableIds.length]);
        expect(picked.error).toBe(null);
        map=picked.map;
        expect(validateRunMap(map)).toBe(true);
        map=completeRunNode(map);
        expect(validateRunMap(map)).toBe(true);
      }
      expect(map.currentNodeId).toBe('a3-boss');
    }
  });
});

describe('전투 결과', ()=>{
  const firstPitch=seed=>{
    let s=enterV10Node(createV10Duel(seed),'a1-entry');
    s=setAimZone(s,4);
    return playV10Action(s,{type:'card',id:'basic'});
  };

  it('결과에 화면에 쓸 이름이 같이 온다',()=>{
    for(const seed of SEEDS.slice(0,30)){
      const combat=selectV10Combat(firstPitch(seed));
      expect(combat).toBeTruthy();
      for(const key of ['choiceLabel','aimLabel','pitchLabel'])
        expect(typeof combat[key]).toBe('string');
      expect(combat.choiceLabel).toBe('기본 스윙');
      /* 내부 키가 화면 문구로 새지 않는다. */
      expect(combat.choiceLabel).not.toMatch(/[A-Za-z]/);
      expect(combat.aimLabel).not.toMatch(/[A-Za-z]/);
      expect(combat.pitchLabel).not.toMatch(/[A-Za-z]/);
    }
  });

  it('이름이 붙은 결과도 그대로 저장된다',()=>{
    const s=firstPitch(11);
    expect(validateV10State(s)).toBe(true);
  });

  it('표시 이름이 없는 예전 기록도 계속 읽는다',()=>{
    const s=firstPitch(11);
    const {choiceLabel,aimLabel,pitchLabel,pitchName,aimZone,...legacy}=s.v10.lastCombat;
    expect(validateV10State({...s,v10:{...s.v10,lastCombat:legacy}})).toBe(true);
  });
});

describe('지도 이동 문제', ()=>{
  it('왜 못 들어가는지 말한다',()=>{
    const s=createV10Duel(5);
    expect(v10NodeProblem(s,'a1-entry')).toBe(null);
    expect(v10NodeProblem(s,'a3-boss')).toBe('아직 닿지 않는 칸입니다.');
    expect(v10NodeProblem(s,'없는칸')).toBe('지도에 없는 칸입니다.');
    const inFight=enterV10Node(s,'a1-entry');
    expect(v10NodeProblem(inFight,'a1-entry')).toBe('지금은 지도에서 이동할 수 없습니다.');
  });
});

describe('막 난도 에스컬레이션', ()=>{
  it('막이 올라갈수록 HP · 기본기 · 코스가 함께 는다',()=>{
    const steps=[1,2,3].map(act=>ACT_ESCALATION[act]);
    for(let i=1;i<steps.length;i++){
      expect(steps[i].hp).toBeGreaterThan(steps[i-1].hp);
      expect(steps[i].stat).toBeGreaterThan(steps[i-1].stat);
      expect(steps[i].zone).toBeGreaterThan(steps[i-1].zone);
    }
  });

  it('같은 종류의 칸은 뒷막일수록 반드시 더 두껍다',()=>{
    for(const seed of SEEDS.slice(0,40)){
      const nodes=createRunMap(seed).nodes.filter(n=>n.opponent);
      for(const type of ['battle','elite','boss']){
        const byAct=[1,2,3].map(act=>nodes.filter(n=>n.type===type&&n.act===act).map(n=>n.opponent.maxHp));
        for(let act=1;act<3;act++){
          if(!byAct[act-1].length||!byAct[act].length)continue;
          expect(Math.min(...byAct[act])).toBeGreaterThan(Math.min(...byAct[act-1]));
        }
      }
    }
  });

  it('같은 유형의 투수는 뒷막일수록 코스를 더 많이 쓴다',()=>{
    /* 막마다 뽑히는 유형이 달라 관측 최소값은 흔들린다. 같은 유형끼리만 비교한다. */
    for(const seed of SEEDS.slice(0,40)){
      const nodes=createRunMap(seed).nodes.filter(n=>n.opponent);
      const byKey=new Map();
      for(const node of nodes){
        const key=node.opponent.archetypeKey;
        if(!byKey.has(key))byKey.set(key,new Map());
        byKey.get(key).set(node.act,node.opponent.zoneOpen);
      }
      for(const acts of byKey.values())
        for(const act of [2,3]){
          if(!acts.has(act)||!acts.has(act-1))continue;
          const prev=acts.get(act-1),now=acts.get(act);
          /* 9에서 잘리는 경우만 같을 수 있다. */
          if(prev>=9)expect(now).toBe(9);else expect(now).toBeGreaterThan(prev);
        }
      for(const node of nodes)expect(node.opponent.zoneOpen).toBeLessThanOrEqual(node.opponent.zoneMax);
    }
  });

  it('막마다 무엇이 올랐는지 시드와 무관하게 같은 문구로 나온다',()=>{
    const say=seed=>{
      const nodes=createRunMap(seed).nodes;
      const stats=act=>actStats(nodes.filter(n=>n.act===act));
      const base=stats(1);
      return [2,3].map(act=>actDelta(stats(act),base));
    };
    const first=say(SEEDS[0]);
    expect(first[0]).toBe('상대 HP +28 · 쓰는 코스 +1 · 투수 기본기 +4'); // V13: Act 1 is 12 HP lighter
    expect(first[1]).toBe('상대 HP +48 · 쓰는 코스 +2 · 투수 기본기 +9');
    for(const seed of SEEDS.slice(1,30))expect(say(seed)).toEqual(first);
    expect(actDelta(actStats(createRunMap(7).nodes.filter(n=>n.act===1)),actStats(createRunMap(7).nodes.filter(n=>n.act===1)))).toBe(null);
  });

  it('난도가 올라도 지도 계약은 그대로다',()=>{
    for(const seed of SEEDS.slice(0,40))expect(validateRunMap(createRunMap(seed))).toBe(true);
  });
});

// 라커룸에서 카드를 제거하면 그 막의 다음 전투 손패에 덱에 없는 id가 남아 화면이 죽었다.
// 1막의 모든 노드가 stage 0으로 매핑되는데 startBattle이 stage 0에서 손패를 c0..c4로 고정했기 때문이다.
describe('라커룸 제거 후 손패 불변식', ()=>{
  const firstBattleWin=state=>{
    let s=enterV10Node(state,'a1-entry');
    s={...s,pitcher:{...s.pitcher,hp:1}};
    s=setAimZone(s,s.battle.aimZone);
    return playV10Action(s,{type:'card',id:'basic'});
  };

  it('제거한 카드 id가 다음 전투 손패에 남지 않는다',()=>{
    let s=createV10Duel(0);
    s=firstBattleWin(s);
    // 시작 덱은 DECK_MIN과 같은 9장이라 먼저 한 장을 받아야 라커룸 제거가 열린다.
    const offer=(s.v10?.rewardChoices||[])[0];
    s=claimV10Reward(s,offer?{type:'add',kind:offer.kind||offer}:{type:'skip'});
    expect(s.deck.length).toBeGreaterThan(9);

    const locker=enterV10Node(s,'a1-craft');
    expect(locker.phase).toBe('locker');
    const removed=completeV10UtilityNode(locker,{type:'remove',id:'c0'});
    expect(removed.deck.some(c=>c.id==='c0')).toBe(false);

    const nextId=removed.runMap.reachableIds.find(id=>
      ['battle','elite','boss'].includes(removed.runMap.nodes.find(n=>n.id===id)?.type));
    expect(nextId).toBeTruthy();
    const battle=enterV10Node(removed,nextId);

    const deckIds=new Set(battle.deck.map(c=>c.id));
    const ghosts=battle.battle.hand.filter(id=>!deckIds.has(id));
    expect(ghosts).toEqual([]);
    expect(battle.battle.hand.length).toBe(5);
    // 화면이 읽는 경로와 같은 조회. 하나라도 비면 여기서 터진다.
    for(const id of battle.battle.hand)expect(battle.deck.find(c=>c.id===id)).toBeTruthy();
  });

  it('덱이 온전하면 1막 첫 손패는 그대로 c0..c4다',()=>{
    const s=enterV10Node(createV10Duel(0),'a1-entry');
    expect(s.battle.hand).toEqual(['c0','c1','c2','c3','c4']);
  });

  it('이미 오염된 저장은 불러올 때 유령 id를 버린다',()=>{
    const s=enterV10Node(createV10Duel(0),'a1-entry');
    const poisoned={...s,deck:s.deck.filter(c=>c.id!=='c0')};
    expect(v10NormalizeHand(poisoned).battle.hand).toEqual(['c1','c2','c3','c4']);
    // 온전한 상태는 같은 객체를 그대로 돌려준다.
    expect(v10NormalizeHand(s)).toBe(s);
  });
});
