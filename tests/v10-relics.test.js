import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {V10_RELICS,v10RelicOffers,v10RelicDamagePlan,v10RelicDamageRate} from '../src/duel/v10-relics.js';
import {createPitcherHp,applyPitcherOutcome} from '../src/duel/pitcher-hp.js';

describe('V10 build relics',()=>{
  it('offers two deterministic unowned relics',()=>{
    const a=v10RelicOffers({seed:17,act:1,nodeSeed:91,owned:[]});
    expect(a).toHaveLength(2);expect(v10RelicOffers({seed:17,act:1,nodeSeed:91,owned:[]})).toEqual(a);
    expect(v10RelicOffers({seed:17,act:1,nodeSeed:91,owned:[a[0]]})).not.toContain(a[0]);
  });
  it('makes the two-card stack a real build direction',()=>{
    expect(v10RelicDamageRate([],2,.8)).toBe(.8);
    expect(v10RelicDamageRate(['twoStack'],2,.8)).toBeCloseTo(.9);
    expect(v10RelicDamageRate(['twoStack'],2,.87)).toBeCloseTo(.97);
    const plan=v10RelicDamagePlan({relics:['twoStack'],outcome:{kind:'hit',bases:1,zone:4},cardCount:2,damageRate:.8,pitchInPA:2});
    expect(plan.damageRate).toBeCloseTo(.9);expect(plan.events.join(' ')).toContain('더블 그립');
  });
  it('stacks situational HP bonuses without changing base damage tables',()=>{
    const plan=v10RelicDamagePlan({relics:['firstPitch','awayBadge','slugBand'],outcome:{kind:'hit',bases:2,zone:5},cardCount:1,damageRate:1,pitchInPA:1});
    expect(plan.damageBonus).toBe(11);expect(plan.events).toHaveLength(3);
    const applied=applyPitcherOutcome(createPitcherHp({maxHp:72}),{kind:'hit',bases:2,zone:5,aimZone:5},{pitchId:1,damageBonus:plan.damageBonus});
    expect(applied.result.baseDamage).toBe(18);expect(applied.result.damage).toBe(29);
  });
  it('defines five readable relic identities',()=>{
    expect(Object.keys(V10_RELICS)).toHaveLength(5);
    for(const relic of Object.values(V10_RELICS)){expect(relic.name.length).toBeGreaterThan(2);expect(relic.text).toContain('HP');}
  });
  it('wires relic choice, combat metadata and HUD into the main run',()=>{
    const engine=fs.readFileSync(new URL('../src/duel/engine.js',import.meta.url),'utf8');
    const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
    expect(engine).toContain("type:'relic'");expect(engine).toContain('v10RelicDamagePlan');expect(engine).toContain('relicEvents:relicPlan.events');
    expect(main).toContain('v10-relic-ui.js');expect(main).toContain('v10-relic-ui.css');
  });
});
