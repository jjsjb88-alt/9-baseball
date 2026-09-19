import {describe,it,expect} from 'vitest';
import {
  createV10Duel,enterV10Node,setAimZone,previewV10Stack,playV10Action,selectV10Combat,
  v11StackZonesConnect,v11StackPlan,V11_STACK_CONNECT_BONUS,
} from '../src/duel/engine.js';

function armed(){
  let s=createV10Duel(20260919);
  s=enterV10Node(s,'a1-entry');
  return setAimZone(s,0);
}

describe('V11 9ZONE STACK ORDER',()=>{
  it('같은 존과 8방향 인접 존을 CONNECT로 판정한다',()=>{
    expect(V11_STACK_CONNECT_BONUS).toBe(.05);
    expect(v11StackZonesConnect(0,0)).toBe(true);
    expect(v11StackZonesConnect(0,1)).toBe(true);
    expect(v11StackZonesConnect(0,4)).toBe(true);
    expect(v11StackZonesConnect(0,8)).toBe(false);
    expect(v11StackZonesConnect(1,7)).toBe(false);
  });

  it('같은 카드와 같은 세 존도 순서를 바꾸면 CONNECT 수와 피해 효율이 달라진다',()=>{
    const s=armed();
    const perfect=[
      {id:'c0',aimZone:4},
      {id:'c1',aimZone:8},
      {id:'c2',aimZone:7},
    ];
    const broken=[
      {id:'c1',aimZone:8},
      {id:'c0',aimZone:4},
      {id:'c2',aimZone:7},
    ];
    const a=v11StackPlan(s,'c4',perfect);
    const b=v11StackPlan(s,'c4',broken);
    expect(a.steps.map(x=>x.aimZone)).toEqual([0,4,8,7]);
    expect(a.links.map(x=>x.connected)).toEqual([true,true,true]);
    expect(a.connectCount).toBe(3);
    expect(a.baseDamageRate).toBe(.5);
    expect(a.orderedDamageRate).toBe(.65);
    expect(a.perfect).toBe(true);
    expect(b.steps.map(x=>x.aimZone)).toEqual([0,8,4,7]);
    expect(b.links.map(x=>x.connected)).toEqual([false,true,true]);
    expect(b.connectCount).toBe(2);
    expect(b.orderedDamageRate).toBe(.60);
    expect(b.perfect).toBe(false);
  });

  it('preview가 순서와 CONNECT 보너스를 한 계약으로 노출한다',()=>{
    const s=armed();
    const p=previewV10Stack(s,'c4',[
      {id:'c0',aimZone:4},{id:'c1',aimZone:8},{id:'c2',aimZone:7},
    ]);
    expect(p.cardCount).toBe(4);
    expect(p.connectCount).toBe(3);
    expect(p.connectBonus).toBeCloseTo(.15);
    expect(p.baseStackDamageRate).toBe(.5);
    expect(p.orderedStackDamageRate).toBe(.65);
    expect(p.damageRate).toBe(.65);
    expect(p.label).toContain('CONNECT 3/3');
  });

  it('실제 투수 HP도 preview와 같은 ordered damageRate를 사용한다',()=>{
    let s=armed();
    s.battle.pending={...s.battle.pending,zone:4,roll:.99,powerRoll:.99};
    s=playV10Action(s,{type:'card',id:'c4',supports:[
      {id:'c0',aimZone:4},{id:'c1',aimZone:8},{id:'c2',aimZone:7},
    ]});
    const combat=selectV10Combat(s);
    expect(combat.connectCount).toBe(3);
    expect(combat.connectBonus).toBeCloseTo(.15);
    expect(combat.baseStackDamageRate).toBe(.5);
    expect(combat.orderedStackDamageRate).toBe(.65);
    expect(combat.damageRate).toBe(.65);
    expect(combat.stackLinks.map(x=>x.connected)).toEqual([true,true,true]);
  });

  it('완전 연결 4장도 단독 1장보다 HP 효율이 낮다',()=>{
    const s=armed();
    expect(v11StackPlan(s,'c4',[
      {id:'c0',aimZone:4},{id:'c1',aimZone:8},{id:'c2',aimZone:7},
    ]).damageRate).toBeLessThan(1);
  });
});
