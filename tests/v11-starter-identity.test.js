import {describe,it,expect} from 'vitest';
import {CARDS} from '../src/duel/cards.js';
import {
  createV10Duel,enterV10Node,setAimZone,previewV10Stack,playV10Action,selectV10Combat,
} from '../src/duel/engine.js';

function armed(){
  let s=createV10Duel(20260919);
  s=enterV10Node(s,'a1-entry');
  s=setAimZone(s,0);
  return s;
}

describe('V11 starter identity — 정타 노림 vs 밀어치기',()=>{
  it('gives the one-zone starter a precision identity instead of lower power',()=>{
    expect(CARDS.place.name).toBe('정타 노림');
    expect(CARDS.place.shape).toBe('point');
    expect(CARDS.place.power).toBe(0);
    expect(CARDS.place.pressure).toBe(.50);
    expect(CARDS.place.role).toBe('정타');
    expect(CARDS.strike.shape).toBe('column');
    expect(CARDS.strike.power).toBe(0);
  });

  it('exposes precision pressure only when place is the MAIN card',()=>{
    const s=armed();
    expect(previewV10Stack(s,'c0',[]).precisionPressure).toBe(.5);
    expect(previewV10Stack(s,'c4',[{id:'c0',aimZone:8}]).precisionPressure).toBe(0);
    expect(previewV10Stack(s,'c0',[{id:'c4',aimZone:8}]).precisionPressure).toBe(.5);
  });

  it('adds 50% pitcher pressure on an exact MAIN-card hit',()=>{
    let s=armed();
    const hp=s.pitcher.hp;
    s.battle.pending={...s.battle.pending,zone:0,roll:0,powerRoll:.99};
    s=playV10Action(s,{type:'card',id:'c0'});
    const combat=selectV10Combat(s);
    expect(s.battle.revealed.kind).toBe('hit');
    expect(s.battle.revealed.assistOnly).toBe(false);
    expect(combat.precisionRate).toBe(.5);
    expect(combat.precisionBonus).toBe(Math.round(combat.baseDamage*combat.damageRate*.5));
    expect(combat.damage).toBe(combat.baseDamage+combat.precisionBonus);
    expect(hp-s.pitcher.hp).toBe(combat.damage);
    expect(s.last.events.some(e=>e.includes('정타 노림 · 정확 적중'))).toBe(true);
  });

  it('never grants precision pressure to support-only contact',()=>{
    let s=armed();
    s.battle.pending={...s.battle.pending,zone:8,roll:.99,powerRoll:.99};
    s=playV10Action(s,{type:'card',id:'c4',supports:[{id:'c0',aimZone:8}]});
    const combat=selectV10Combat(s);
    expect(s.battle.revealed.assistOnly).toBe(true);
    expect(combat.precisionRate).toBe(0);
    expect(combat.precisionBonus).toBe(0);
  });

  it('keeps the stack damage multiplier separate from precision pressure',()=>{
    let s=armed();
    s.battle.pending={...s.battle.pending,zone:0,roll:0,powerRoll:.99};
    s=playV10Action(s,{type:'card',id:'c0',supports:[{id:'c4',aimZone:4}]});
    const combat=selectV10Combat(s);
    expect(combat.connectCount).toBe(1);
    expect(combat.damageRate).toBeCloseTo(.87);
    expect(combat.precisionRate).toBe(.5);
    expect(combat.precisionBonus).toBe(Math.round(combat.baseDamage*combat.damageRate*.5));
  });
});
