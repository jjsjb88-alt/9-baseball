import {describe,it,expect} from 'vitest';
import {
  V10_SWING_DAMAGE_RATES,V11_STACK_CONNECT_BONUS,
  v10SwingDamageRate,v11StackZonesConnect,
} from '../src/duel/engine.js';
import {v10RelicDamageRate} from '../src/duel/v10-relics.js';

describe('V11 stack balance diagnostics',()=>{
  it('keeps raw card-count pressure strictly decreasing',()=>{
    expect(V10_SWING_DAMAGE_RATES).toEqual([1,.80,.65,.50]);
    expect(v10SwingDamageRate(1)).toBeGreaterThan(v10SwingDamageRate(2));
    expect(v10SwingDamageRate(2)).toBeGreaterThan(v10SwingDamageRate(3));
    expect(v10SwingDamageRate(3)).toBeGreaterThan(v10SwingDamageRate(4));
  });

  it('CONNECT raises pressure without letting a perfect four-card stack beat solo',()=>{
    const perfect4=V10_SWING_DAMAGE_RATES[3]+3*V11_STACK_CONNECT_BONUS;
    expect(perfect4).toBeGreaterThan(V10_SWING_DAMAGE_RATES[3]);
    expect(perfect4).toBeLessThan(1);
  });

  it('same-zone, orthogonal and diagonal links all count, distant links break',()=>{
    expect(v11StackZonesConnect(0,0)).toBe(true);
    expect(v11StackZonesConnect(0,1)).toBe(true);
    expect(v11StackZonesConnect(0,4)).toBe(true);
    expect(v11StackZonesConnect(0,8)).toBe(false);
  });

  it('keeps Double Grip valuable without erasing CONNECT order',()=>{
    const broken=v10RelicDamageRate(['twoStack'],2,V10_SWING_DAMAGE_RATES[1]);
    const connected=v10RelicDamageRate(['twoStack'],2,V10_SWING_DAMAGE_RATES[1]+V11_STACK_CONNECT_BONUS);
    expect(broken).toBeCloseTo(.90);
    expect(connected).toBeCloseTo(.97);
    expect(connected).toBeGreaterThan(broken);
  });

  it('rewards a perfect four-card route above an unconnected three-card stack',()=>{
    const perfect4=V10_SWING_DAMAGE_RATES[3]+3*V11_STACK_CONNECT_BONUS;
    expect(perfect4).toBeCloseTo(.71);
    expect(perfect4).toBeGreaterThan(V10_SWING_DAMAGE_RATES[2]);
  });
});
