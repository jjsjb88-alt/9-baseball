import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {stackResolveDuration,stackResolveTiming} from '../src/duel/StackResolve.jsx';

const component=fs.readFileSync(new URL('../src/duel/StackResolve.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/stack-resolve.css',import.meta.url),'utf8');
const plan=count=>({
  steps:Array.from({length:count},(_,i)=>({id:'c'+i,order:i+1,aimZone:i,main:i===0,kind:'place'})),
  links:Array.from({length:Math.max(0,count-1)},(_,i)=>({fromZone:i,toZone:i+1,connected:true})),
  connectCount:Math.max(0,count-1),
  connectBonus:Math.max(0,count-1)*.07,
  perfect:count>1,
  damageRate:.8,
});

describe('V11 Stack Resolve commit beat',()=>{
  it('fits the commit beat inside the existing resolve budget',()=>{
    const two=stackResolveTiming(plan(2)),four=stackResolveTiming(plan(4));
    expect(stackResolveDuration(plan(2))).toBe(530);
    expect(stackResolveDuration(plan(4))).toBe(640);
    expect(two.commitDelay).toBe(348);
    expect(two.commitHold).toBe(182);
    expect(four.commitDelay).toBe(518);
    expect(four.commitHold).toBe(122);
    expect(four.duration).toBeLessThanOrEqual(660);
  });

  it('waits until the last ordered token has substantially landed before lock',()=>{
    for(const count of [2,3,4]){
      const timing=stackResolveTiming(plan(count));
      const lastTokenStart=28+(count-1)*timing.stepGap;
      expect(timing.commitDelay-lastTokenStart).toBeGreaterThanOrEqual(105);
      expect(timing.commitDelay).toBeLessThan(timing.duration);
      expect(timing.commitHold).toBeGreaterThanOrEqual(105);
    }
  });

  it('adds one route-wide lock flash instead of more ambient particles',()=>{
    expect(component).toContain('className="stack-resolve-lock-route"');
    expect(component).toContain("links.filter(link=>link.connected)");
    expect(component).toContain("plan?.perfect?'PATH LOCKED':'STACK COMMITTED'");
    expect(component).toContain("('HP +'+connectGain+'%p')");
    expect(css).toContain('.stack-resolve-lock-route');
    expect(css).toContain('@keyframes stackResolveLockRoute');
    expect(css).toContain('@keyframes stackResolveCommit');
  });

  it('hands the eye to SWING only during the commit hold',()=>{
    expect(component).toContain("'--commit-delay':commitDelay+'ms'");
    expect(component).toContain("'--commit-hold':commitHold+'ms'");
    expect(component).toContain('<em><i aria-hidden="true"/>SWING →</em>');
    expect(css).toContain('animation:stackResolveHandoff var(--commit-hold)');
    expect(css).toContain('animation:stackResolveHandoffLine var(--commit-hold)');
  });
});
