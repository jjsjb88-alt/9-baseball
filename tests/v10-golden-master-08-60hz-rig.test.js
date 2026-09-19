import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const actor=fs.readFileSync(new URL('../src/duel/SmoothActor.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/smooth-actor.css',import.meta.url),'utf8');

describe('GM08 V4 60Hz actor rig',()=>{
  it('uses authored 16-key-pose tracks for batter and pitcher',()=>{
    expect((actor.match(/const BATTER_SWING=\[/g)||[]).length).toBe(1);
    expect((actor.match(/const PITCHER_PITCH=\[/g)||[]).length).toBe(1);
    expect((actor.match(/pose\(/g)||[]).length).toBeGreaterThanOrEqual(48);
    expect(actor).toContain('const BATTER_HOMER=[');
    expect(actor).toContain('const BATTER_MISS=[');
  });

  it('interpolates motion with Web Animations instead of image stepping',()=>{
    expect(actor).toContain("el.animate(frames,{duration:opts.duration,fill:'forwards',easing:'linear'})");
    expect(actor).not.toContain('setInterval(');
    expect(actor).not.toContain('setTimeout(');
    expect(actor).toContain("const RANGE={windup:[0,5],impact:[5,9],slowmo:[9,10],release:[10,14],settle:[14,15]}");
  });

  it('articulates elbows and knees independently',()=>{
    for(const ref of ['ff','bf','fs','bs']){
      expect(actor).toContain('refs.'+ref);
      expect(actor).toContain('animate('+ref+'.current');
    }
    expect(actor).toContain('className="rig-joint forearm"');
    expect(actor).toContain('className="rig-joint shin"');
  });

  it('uses unique SVG paint servers for simultaneous batter and pitcher',()=>{
    expect(actor).toContain("const uid=useId().replace(/:/g,'')");
    expect(actor).toContain("id={id('jersey')}");
    expect(actor).toContain("fill={`url(#${id('jersey')})`}");
    expect(actor).not.toMatch(/fill="url\(#\$\{id/);
  });

  it('routes main run and cinema actors through SmoothActor',()=>{
    expect(app).toContain("import SmoothActor from './SmoothActor.jsx'");
    expect(app).toContain('isV10?<SmoothActor who="batter"');
    expect(app).toContain('isV10?<SmoothActor who="pitcher"');
    expect(app).toContain('has-smooth-actor');
  });

  it('blocks legacy stepped container motion from fighting the V4 rig',()=>{
    expect(css).toContain('.golden-master-stage .actor-left.has-smooth-actor');
    expect(css).toContain('animation:none!important');
    expect(css).toContain('transform:none!important');
  });
});
