import {describe,it,expect} from 'vitest';
import {stackMoveConnectDelta} from '../src/duel/StackBoard.jsx';

const route=(zones)=>zones.map((aimZone,i)=>({id:'c'+i,order:i+1,aimZone,main:i===0}));

describe('V11 stack reorder guidance',()=>{
  it('marks a support swap that repairs a broken route as positive',()=>{
    const steps=route([0,8,4,7]);
    expect(stackMoveConnectDelta(steps,1,1)).toBe(1);
    expect(stackMoveConnectDelta(steps,2,-1)).toBe(1);
  });

  it('marks a support swap that breaks a perfect route as negative',()=>{
    const steps=route([0,4,8,7]);
    expect(stackMoveConnectDelta(steps,1,1)).toBe(-1);
    expect(stackMoveConnectDelta(steps,2,-1)).toBe(-1);
  });

  it('keeps neutral swaps neutral and never moves a support ahead of MAIN',()=>{
    const steps=route([0,8,7]);
    expect(stackMoveConnectDelta(steps,1,1)).toBe(0);
    expect(stackMoveConnectDelta(steps,1,-1)).toBeNull();
    expect(stackMoveConnectDelta(steps,0,1)).toBeNull();
  });
});
