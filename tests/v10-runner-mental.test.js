import {describe,it,expect} from 'vitest';
import {createV10Duel,enterV10Node,playV10Action,baseIntent,readLevel,advanceV10Batter,
  V10_RUNNER_PRESSURE,V10_MENTAL,v10MentalCap,v10Shaken} from '../src/duel/engine.js';
import {validateV10State} from '../src/duel/v10-storage.js';

// 주자 압박(주자 수 = 피해 배율)과 투수 멘탈(실점 = 흔들림, 막이 오를수록 단단함).
const clone=x=>JSON.parse(JSON.stringify(x));
function battle({bases=[null,null,null],act=1,shaken}={}){
  let s=createV10Duel(0);s=enterV10Node(s,'a1-entry');s=clone(s);
  s.v10.opponent.act=act;s.battle.bases=bases;
  if(shaken!==undefined)s.battle.shaken=shaken;
  s.pitcher={...s.pitcher,hp:s.pitcher.maxHp};
  s.battle.pending.zone=s.battle.aimZone; // 기본 스윙 범위 적중 = 안타 확정
  return s;
}
const hit=s=>playV10Action(s,{type:'card',id:'basic'});

describe('V10 runner pressure',()=>{
  it('each runner on base adds 10% of base hit damage',()=>{
    const empty=hit(battle()),two=hit(battle({bases:['p5',null,'p6']}));
    expect(empty.battle.revealed.kind).toBe('hit');expect(two.battle.revealed.kind).toBe('hit');
    const a=empty.v10.lastCombat,b=two.v10.lastCombat;
    expect(a.runnerBonus).toBe(0);
    expect(b.runnersBefore).toBe(2);expect(b.runnerRate).toBeCloseTo(2*V10_RUNNER_PRESSURE);
    expect(b.runnerBonus).toBe(Math.round(a.baseDamage*a.damageRate*.2));
    expect(b.damage).toBe(a.damage+b.runnerBonus);
    expect(two.last.events.some(e=>e.includes('주자 2명 압박'))).toBe(true);
  });
  it('non-hits get no runner bonus',()=>{
    const s=battle({bases:['p5','p6','p7']});s.battle.pending.zone=9;
    const t=playV10Action(s,{type:'take'});
    expect(t.v10.lastCombat.runnerBonus).toBe(0);
  });
});

describe('V10 pitcher mental',()=>{
  it('a run shakes the pitcher: more balls in the next intent and read +1',()=>{
    const s=battle({bases:[null,null,'p6']});
    const read0=readLevel(s),t=hit(s);
    expect(t.battle.runs).toBe(1);expect(t.battle.shaken).toBe(1);
    expect(t.v10.lastCombat.shakenAfter).toBe(1);
    expect(readLevel(t)).toBe(Math.min(2,read0+1));
    const calm=clone(t);calm.battle.shaken=0;
    expect(baseIntent(t).probabilities[9]).toBeGreaterThan(baseIntent(calm).probabilities[9]);
    expect(validateV10State(t)).toBe(true);
    const next=advanceV10Batter(t);expect(next.battle.shaken).toBe(1);
  });
  it('mental caps harden by act: 3 / 2 / 1',()=>{
    expect(V10_MENTAL.capByAct).toEqual({1:3,2:2,3:1});
    for(const [act,cap] of [[1,3],[2,2],[3,1]]){
      const t=hit(battle({act,shaken:2,bases:[null,null,'p6']})); // 흔들림 2에서 1실점 추가
      expect(v10MentalCap(t)).toBe(cap);
      expect(t.battle.shaken).toBe(cap);
    }
  });
  it('a scoreless plate appearance recovers one step',()=>{
    const s=battle({shaken:2});
    const t=hit(s);expect(t.battle.runs).toBe(0);expect(t.battle.shaken).toBe(1);
  });
  it('shaken above the act cap is clamped when read',()=>{
    const s=battle({act:3,shaken:3});expect(v10Shaken(s)).toBe(1);
  });
});
