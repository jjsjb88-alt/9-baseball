import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/golden-master-scene.css',import.meta.url),'utf8');
const renderer=fs.readFileSync(new URL('../src/duel/ArenaRenderer2.jsx',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');

describe('V10 golden master scene pass',()=>{
  it('adds structural back/mid/front stadium planes to both live combat and cinema lab',()=>{
    expect(app).toContain('function CinematicStadiumDepth');
    expect(app).toContain('className="depth-back"');
    expect(app).toContain('className="depth-mid"');
    expect(app).toContain('className="depth-front"');
    expect((app.match(/<CinematicStadiumDepth/g)||[]).length).toBeGreaterThanOrEqual(2);
  });

  it('uses real parallax planes instead of a single flat filter',()=>{
    expect(css).toContain('.cinematic-stadium-depth>.depth-back');
    expect(css).toContain('.cinematic-stadium-depth>.depth-mid');
    expect(css).toContain('.cinematic-stadium-depth>.depth-front');
    expect(css).toContain('.fx-stage-impact .cinematic-stadium-depth>.depth-front');
    expect(css).toContain('.depth-light-tower');
    expect(css).toContain('.depth-dugout');
    expect(css).toContain('.depth-fence');
  });

  it('keeps batter and pitcher above the structural scene and gives stage-specific weight transfer',()=>{
    expect(css).toContain('.duel-arena.renderer2-host .actor-left');
    expect(css).toContain('z-index:42!important');
    expect(css).toContain('.fx-stage-windup .duel-arena.renderer2-host .actor-right');
    expect(css).toContain('.fx-stage-impact .duel-arena.renderer2-host .actor-left');
    expect(css).toContain('translate3d(16px,-1px,0)');
    expect(css).toContain('.fx-stage-release .duel-arena.renderer2-host .actor-left');
  });

  it('makes the camera push, impact freeze and release pullback materially stronger',()=>{
    expect(renderer).toContain('zoom=1.+.032*u_phase');
    expect(renderer).toContain('zoom=1.075');
    expect(renderer).toContain('zoom=1.095');
    expect(renderer).toContain('zoom=1.08-.060*u_phase');
    expect(renderer).toContain('distanceFade');
  });

  it('lets secondary UI recede during pitch cinema while preserving pitcher HP prominence',()=>{
    expect(css).toContain('.duel-combat.cinematic-focus>.zone-panel{opacity:.16!important');
    expect(css).toContain('.duel-combat.cinematic-focus>.duel-table{opacity:.32!important');
    expect(css).toContain('.duel-combat.cinematic-focus>.v10-combat-hp{opacity:.96!important');
    expect(css).toContain('.duel-combat.fx-stage-impact>.v10-combat-hp');
  });

  it('loads the golden master layer after the responsive/declutter contracts and supports reduced motion',()=>{
    expect(main.indexOf('golden-master-scene.css')).toBeGreaterThan(main.indexOf('landscape-declutter.css'));
    expect(css).toContain('@media (orientation:landscape) and (max-height:430px)');
    expect(css).toContain('@media (orientation:portrait)');
    expect(css).toContain('@media (prefers-reduced-motion:reduce)');
  });
});
