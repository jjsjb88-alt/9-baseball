import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {stackEchoData} from '../src/duel/StackRouteEcho.jsx';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/stack-route-echo.css',import.meta.url),'utf8');

describe('V11 stack result echo',()=>{
  it('stays absent for solo swings so the old READ TRACE remains unchanged',()=>{
    expect(stackEchoData({stackSteps:[{order:1,aimZone:4,main:true}],stackLinks:[]})).toBeNull();
    expect(app).toContain("stackTrace?'STACK TRACE':'READ TRACE'");
  });

  it('uses the committed result route instead of recalculating a new plan',()=>{
    const revealed={
      stackSteps:[
        {id:'a',order:1,aimZone:0,main:true},
        {id:'b',order:2,aimZone:4},
        {id:'c',order:3,aimZone:8},
      ],
      stackLinks:[
        {fromZone:0,toZone:4,connected:true},
        {fromZone:4,toZone:8,connected:true},
      ],
      stackConnectCount:2,
    };
    expect(stackEchoData(revealed)).toMatchObject({
      connectCount:2,
      linkCount:2,
      perfect:true,
    });
    expect(app).toContain('<StackRouteEcho revealed={r}/>');
    expect(app).toContain('r.stackConnectCount||0');
  });

  it('preserves CONNECT/BREAK and same-zone route language visually',()=>{
    expect(css).toContain('.stack-route-echo .connected');
    expect(css).toContain('.stack-route-echo .broken');
    expect(css).toContain('stroke-dasharray:5 4');
    expect(app).toContain('스택 경로');
  });

  it('keeps the actual pitch visually above the authored route and respects reduced motion',()=>{
    expect(css).toContain('.read-trace .trace-grid i.actual{z-index:5}');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
    expect(css).toContain('animation:none!important');
  });
});
