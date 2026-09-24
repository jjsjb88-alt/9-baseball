import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import {batterPoseAt} from '../src/duel/BatterV3Sprite.jsx';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

describe('actor runtime smoothness',()=>{
  it('uses absolute RAF timing for the authored batter without React frame commits',()=>{
    const src=read('src/duel/BatterV3Sprite.jsx');
    expect(src).toContain('const elapsed=Math.max(0,now-startedAt)');
    expect(src).toContain('requestAnimationFrame(tick)');
    expect(src).not.toContain('useState(');
    expect(src).not.toContain('flushSync');
    expect(src).not.toContain('setTimeout(');
    const timeline=[{pose:'ready',at:0},{pose:'load',at:100},{pose:'contact',at:200}];
    expect(batterPoseAt(timeline,0)).toBe('ready');
    expect(batterPoseAt(timeline,150)).toBe('load');
    expect(batterPoseAt(timeline,220)).toBe('contact');
  });

  it('draws the 120-frame pitcher atlas directly to canvas without 60 React updates per second',()=>{
    const src=read('src/duel/RedRushCanvasSprite.jsx');
    expect(src).toContain('ctx.drawImage');
    expect(src).toContain('requestAnimationFrame(tick)');
    expect(src).not.toContain('useState(');
    expect(src).not.toContain('setFrame(');
    expect(src).not.toContain('backgroundPosition');
    expect(src).not.toContain('echo-mid');
    expect(src).toContain("stage==='impact'&&frame%3===0");
  });

  it('does not force a layout read from the WebGL render loop',()=>{
    const src=read('src/duel/ArenaRenderer2.jsx');
    expect(src).toContain('new ResizeObserver(resize)');
    const draw=src.slice(src.indexOf('const draw=now=>'),src.indexOf('raf=requestAnimationFrame(draw);',src.indexOf('const draw=now=>'))+40);
    expect(draw).not.toContain('resize();');
    expect(draw).not.toContain('getBoundingClientRect');
  });

  it('keeps the main app free of forced synchronous batter commits',()=>{
    const src=read('src/duel/App.jsx');
    expect(src).not.toContain("from 'react-dom'");
    expect(src).not.toContain('useBatterMotionV3Pose');
    expect(src).not.toContain('useRedRushFrame');
    expect(src).toContain('<BatterV3Sprite');
    expect(src).toContain('<RedRushCanvasSprite');
  });
});
