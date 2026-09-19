import {describe,it,expect} from 'vitest';
import {stackMoveConnectDelta,stackReorderPreview} from '../src/duel/StackBoard.jsx';

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

  it('previews a multi-slot drag with renumbered order and live links',()=>{
    const steps=route([0,8,4,7]);
    const preview=stackReorderPreview(steps,1,3);
    expect(preview.steps.map(x=>x.id)).toEqual(['c0','c2','c3','c1']);
    expect(preview.steps.map(x=>x.order)).toEqual([1,2,3,4]);
    expect(preview.links.map(x=>x.connected)).toEqual([true,true,true]);
    expect(preview.connectCount).toBe(3);
    expect(preview.delta).toBe(1);
    expect(preview.perfect).toBe(true);
  });

  it('keeps neutral swaps neutral and never moves a support ahead of MAIN',()=>{
    const steps=route([0,8,7]);
    expect(stackMoveConnectDelta(steps,1,1)).toBe(0);
    expect(stackMoveConnectDelta(steps,1,-1)).toBeNull();
    expect(stackMoveConnectDelta(steps,0,1)).toBeNull();
    expect(stackReorderPreview(steps,1,0)).toBeNull();
  });
});
