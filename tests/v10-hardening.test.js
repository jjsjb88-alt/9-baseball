// V10 엔진을 통합에서 조인 부분. Codex 원본 테스트는 v10-engine-map.test.js가 계속 지킨다.
import {describe,it,expect} from 'vitest';
import {createRunMap,validateRunMap,everyNodeReachesBoss,reachableMatchesProgress,selectRunNode,completeRunNode} from '../src/duel/run-map.js';
import {createV10Duel,enterV10Node,playV10Action,advanceV10Pitch,advanceV10Batter,setAimZone,v10NodeProblem,selectV10Combat} from '../src/duel/engine.js';
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
