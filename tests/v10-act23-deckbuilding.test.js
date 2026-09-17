import {describe,it,expect} from 'vitest';
import {CARDS,cardPower,rewardChoices,DECKBUILDER_BUILD} from '../src/duel/cards.js';
import {createRunMap,getRunNode,validateRunMap} from '../src/duel/run-map.js';
import {createV10Duel,enterV10Node,playV10Action,v10RewardOptions,claimV10Reward} from '../src/duel/engine.js';

function forceCombatReward(act,type='elite',seed=20260917){
  let s=createV10Duel(seed);
  const node=s.runMap.nodes.find(n=>n.act===act&&n.type===type);
  expect(node).toBeTruthy();
  s.runMap.reachableIds=[node.id];
  s=enterV10Node(s,node.id);
  s.pitcher={...s.pitcher,hp:12,phase:'critical'};
  s.battle.pending={...s.battle.pending,zone:s.battle.aimZone,roll:0,powerRoll:.99};
  s=playV10Action(s,{type:'card',id:'basic'});
  return {s,node,rewards:v10RewardOptions(s)};
}

function defeatBossAndDraft(s,bossId){
  s.runMap.reachableIds=[bossId];
  s=enterV10Node(s,bossId);
  expect(s.phase).toBe('battle');
  s.pitcher={...s.pitcher,hp:12,phase:'critical'};
  s.battle.pending={...s.battle.pending,zone:s.battle.aimZone,roll:0,powerRoll:.99};
  s=playV10Action(s,{type:'card',id:'basic'});
  expect(s.phase).toBe('reward');
  const pick=v10RewardOptions(s)[0];
  return claimV10Reward(s,pick?{type:'add',kind:pick}:{type:'skip'});
}

describe('V10 three-act deckbuilding arc',()=>{
  it('1막은 방향, 2막은 연계, 3막은 전술 완성의 서로 다른 기본 드래프트다',()=>{
    expect(rewardChoices(0,null,DECKBUILDER_BUILD,'home-opener')).toEqual(['slug','rally','defend']);
    expect(rewardChoices(1,null,DECKBUILDER_BUILD,'sinker-study')).toEqual(['scout','flow','finisher']);
    expect(rewardChoices(2,null,DECKBUILDER_BUILD,'deep-series')).toEqual(['lure','bunt','calm']);
  });

  it('각 막 강적은 그 막에서만 열리는 시그니처 카드를 네 번째 후보로 준다',()=>{
    expect(rewardChoices(0,null,DECKBUILDER_BUILD,'giant-road')).toEqual(['slug','rally','defend','wall']);
    expect(rewardChoices(1,null,DECKBUILDER_BUILD,'city-rival')).toEqual(['scout','flow','finisher','laser']);
    expect(rewardChoices(2,null,DECKBUILDER_BUILD,'wall-rival')).toEqual(['lure','bunt','calm','commit']);

    expect(forceCombatReward(1).rewards).toContain('wall');
    expect(forceCombatReward(2).rewards).toContain('laser');
    expect(forceCombatReward(3).rewards).toContain('commit');
  });

  it('시그니처 세 장은 범위→균형→한 방으로 실제 역할이 다르다',()=>{
    expect(CARDS.wall).toMatchObject({shape:'cross',power:0,rarity:'signature',act:1});
    expect(CARDS.laser).toMatchObject({shape:'column',power:1,rarity:'signature',act:2});
    expect(CARDS.commit).toMatchObject({shape:'point',power:3,rarity:'signature',act:3});
    expect(cardPower({kind:'wall'})).toBeLessThan(cardPower({kind:'laser'}));
    expect(cardPower({kind:'laser'})).toBeLessThan(cardPower({kind:'commit'}));
    expect(cardPower({kind:'commit',plus:true})).toBe(4);
  });

  it('2막과 3막은 투수 질문 자체가 달라지고 각 막 보스 정체성이 고정된다',()=>{
    for(let seed=0;seed<48;seed++){
      const map=createRunMap(seed);expect(validateRunMap(map)).toBe(true);
      const act1=new Set(map.nodes.filter(n=>n.act===1&&n.opponent).map(n=>n.opponent.archetypeKey));
      const act2=new Set(map.nodes.filter(n=>n.act===2&&n.opponent).map(n=>n.opponent.archetypeKey));
      const act3=new Set(map.nodes.filter(n=>n.act===3&&n.opponent).map(n=>n.opponent.archetypeKey));
      expect([...act1].every(k=>['outside','sinker'].includes(k))).toBe(true);
      expect([...act2].every(k=>['outside','sinker','high'].includes(k))).toBe(true);
      expect([...act3].every(k=>['sinker','high','closer'].includes(k))).toBe(true);
      expect(getRunNode(map,'a1-boss').opponent.archetypeKey).toBe('sinker');
      expect(getRunNode(map,'a2-boss').opponent.archetypeKey).toBe('high');
      expect(getRunNode(map,'a3-boss').opponent.archetypeKey).toBe('closer');
    }
  });

  it('보스 승리와 드래프트가 실제로 1막→2막→3막을 끊김 없이 연다',()=>{
    let s=createV10Duel(20260917);
    s=defeatBossAndDraft(s,'a1-boss');
    expect(s.phase).toBe('map');
    expect(s.runMap.completedNodeIds).toContain('a1-boss');
    expect(s.runMap.reachableIds).toEqual(['a2-entry']);

    s=defeatBossAndDraft(s,'a2-boss');
    expect(s.phase).toBe('map');
    expect(s.runMap.completedNodeIds).toContain('a2-boss');
    expect(s.runMap.reachableIds).toEqual(['a3-entry']);

    s=enterV10Node(s,'a3-entry');
    expect(s.phase).toBe('battle');
    expect(s.v10.opponent.act).toBe(3);
    expect(s.pitcher.maxHp).toBeGreaterThan(getRunNode(s.runMap,'a1-entry').opponent.maxHp);
  });

  it('정규전은 시그니처를 공짜로 풀지 않고 강적 선택에 의미를 남긴다',()=>{
    expect(forceCombatReward(1,'battle').rewards).not.toContain('wall');
    expect(forceCombatReward(2,'battle').rewards).not.toContain('laser');
    expect(forceCombatReward(3,'battle').rewards).not.toContain('commit');
  });
});
