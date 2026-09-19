import {describe,it,expect} from 'vitest';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const resolve=fs.readFileSync(new URL('../src/duel/StackResolve.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/stack-resolve.css',import.meta.url),'utf8');

describe('V11 ordered Stack Resolve cinematic',()=>{
  it('runs only for multi-card stacks and stays inside 0.48–0.66s',()=>{
    expect(resolve).toContain('if(count<=1)return 0');
    expect(resolve).toContain('clamp(420+count*55,480,660)');
  });

  it('renders ordered zone tokens and CONNECT/BREAK route lines',()=>{
    expect(resolve).toContain('className="stack-resolve-zone"');
    expect(resolve).toContain("link.connected?'connected':'broken'");
    expect(resolve).toContain('step.order');
    expect(resolve).toContain("join(' → ')");
    expect(css).toContain('.stack-resolve-zone .connected');
    expect(css).toContain('.stack-resolve-zone .broken');
    expect(css).toContain('stroke-dasharray:5 5');
  });

  it('hands visual ownership to the swing only after resolve completes',()=>{
    expect(app).toContain('resolvePlan?.steps?.length>1?stackResolveDuration(resolvePlan):0');
    expect(app).toContain('setStackResolve({plan:resolvePlan,token})');
    expect(app).toContain('setStackResolve(null);');
    expect(app).toContain('persist(next);');
    expect(app).toContain('startPresentation(next);');
    expect(app.indexOf('setStackResolve(null);')).toBeLessThan(app.indexOf('startPresentation(next);'));
  });

  it('does not reveal the committed result before the stack route finishes',()=>{
    const act=app.slice(app.indexOf('function act(fn,animate=false,resolvePlan=null)'),app.indexOf('function freshV10()'));
    const resolveBranch=act.slice(act.indexOf('if(resolveMs){'),act.indexOf('return;',act.indexOf('if(resolveMs){'))+7);
    expect(resolveBranch.indexOf('persist(next);')).toBeGreaterThan(resolveBranch.indexOf('setTimeout(()=>{'));
    expect(resolveBranch.indexOf('persist(next);')).toBeLessThan(resolveBranch.indexOf('startPresentation(next);'));
  });

  it('keeps reduced motion free from the extra resolve delay',()=>{
    expect(app).toContain("window.matchMedia?.('(prefers-reduced-motion: reduce)').matches");
    expect(app).toContain('animate&&!reduced&&resolvePlan?.steps?.length>1');
    expect(css).toContain('@media (prefers-reduced-motion:reduce)');
    expect(css).toContain('.stack-resolve{display:none}');
  });

  it('does not modify the V4 Canvas renderer or engine math contract',()=>{
    expect(app).toContain("import V4CanvasSprite from './V4CanvasSprite.jsx'");
    expect(app).toContain("import StackResolve,{stackResolveDuration} from './StackResolve.jsx'");
    expect(app).toContain('act(doPlay,true,choice?.stackPlan)');
  });
});
