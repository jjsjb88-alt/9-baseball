import {describe,it,expect} from 'vitest';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/golden-master.css',import.meta.url),'utf8');

describe('production batter stand-in',()=>{
  it('routes golden-master batter away from unfinished sprite art',()=>{
    const gate=app.indexOf("if(golden&&who==='batter')");
    const v4=app.indexOf('const pose=actorPose');
    expect(gate).toBeGreaterThan(-1);
    expect(v4).toBeGreaterThan(gate);
    expect(app).toContain('className="batter-presence"');
    expect(app).toContain('className="presence-bat"');
    expect(app).toContain('className="presence-plate"');
  });

  it('keeps the replacement scoped to the golden-master batter box',()=>{
    expect(css).toContain('.golden-master-stage .batter-standin');
    expect(css).toContain('.golden-master-stage .batter-standin .presence-bat');
    expect(css).toContain('.golden-master-stage .batter-standin .presence-plate');
    expect(css).toContain('@media (orientation:portrait)');
    expect(css).toContain('@media (prefers-reduced-motion:reduce)');
  });

  it('does not delete the protected V4 infrastructure used by future final art and pitcher playback',()=>{
    expect(app).toContain('<V4CanvasSprite sheet={v4Sheet}');
    expect(app).toContain('function v4SheetFor');
  });
});
