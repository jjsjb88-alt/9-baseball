import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const stage=fs.readFileSync(new URL('../src/duel/GoldenMasterStage.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/golden-master.css',import.meta.url),'utf8');
const renderer=fs.readFileSync(new URL('../src/duel/ArenaRenderer2.jsx',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');

describe('visual reboot golden master 01',()=>{
  it('loads the golden master layer last and scopes it to combat/cinema arenas',()=>{
    expect(main).toContain('golden-master.css');
    expect(main.indexOf('golden-master.css')).toBeGreaterThan(main.indexOf('landscape-declutter.css'));
    expect(app).toContain('golden-master-stage');
    expect(app).toContain('<GoldenMasterStage stage={fxStage}');
    expect(app).toContain('<GoldenMasterStage stage={stage} shot={shot} rival/>');
  });

  it('uses V2 frame assets for the golden combat idle and key fallback poses',()=>{
    expect(app).toContain('const V2_FALLBACKS=');
    expect(app).toContain('idle:()=>BATTER_SWING_V2[0]');
    expect(app).toContain('idle:()=>PITCHER_PITCH_V2[0]');
    expect(app).toContain('golden?V2_FALLBACKS[who]?.[pose]?.():null');
    expect(app).toContain('golden-actor');
  });

  it('builds separate far, middle and foreground stadium depth layers with no input interception',()=>{
    expect(stage).toContain('gm-depth-back');
    expect(stage).toContain('gm-scoreboard-shell');
    expect(stage).toContain('gm-light-tower');
    expect(stage).toContain('gm-backstop-net');
    expect(stage).toContain('gm-depth-mid');
    expect(stage).toContain('gm-side-crowd');
    expect(stage).toContain('gm-dugout-mouth');
    expect(stage).toContain('gm-actor-light');
    expect(stage).toContain('gm-contact-halo');
    expect(stage).toContain('gm-depth-front');
    expect(stage).toContain('gm-dugout-rail');
    expect(stage).toContain('gm-camera-fence');
    expect(css).toContain('.gm-depth-back,.gm-depth-mid,.gm-depth-front{position:absolute;inset:0;pointer-events:none');
  });

  it('gives hitter and pitcher distinct weight transfer and grounded silhouettes',()=>{
    expect(css).toContain('.golden-master-stage.fx-stage-windup .golden-actor.sprite-batter');
    expect(css).toContain('.golden-master-stage.fx-stage-windup .golden-actor.sprite-pitcher');
    expect(css).toContain('.golden-master-stage.fx-stage-impact .golden-actor.sprite-batter');
    expect(css).toContain('.actor-contact-shadow');
    expect(css).toContain('.pitcher-nameplate');
  });

  it('uses multi-layer parallax and a stronger pixel WebGL camera instead of one flat zoom',()=>{
    expect(css).toContain('.golden-master-stage.fx-stage-impact .gm-depth-back');
    expect(css).toContain('.golden-master-stage.fx-stage-impact .gm-depth-front');
    expect(renderer).toContain('zoom=1.082');
    expect(renderer).toContain('zoom=1.105');
    expect(renderer).toContain('vec2(384.,216.)');
    expect(renderer).toContain('float concourse=rectMask');
    expect(renderer).toContain('float board=rectMask');
    expect(renderer).toContain('float bankL=rectMask');
  });

  it('adds a third parallax speed and spatial contact lighting between field and actors',()=>{
    expect(css).toContain('.gm-depth-mid{z-index:8');
    expect(css).toContain('.golden-master-stage.fx-stage-windup .gm-depth-mid');
    expect(css).toContain('scale(1.034)');
    expect(css).toContain('.golden-master-stage.fx-stage-impact .gm-depth-mid');
    expect(css).toContain('scale(1.085)');
    expect(css).toContain('.golden-master-stage.fx-stage-impact .gm-contact-halo');
    expect(css).toContain('.gm-depth-mid.gm-danger .gm-contact-halo{opacity:0}');
  });

  it('lets cinematic UI recede while keeping pitcher HP as the persistent objective',()=>{
    expect(css).toContain('.duel-combat.cinematic-focus>.zone-panel{opacity:.10!important');
    expect(css).toContain('.duel-combat.cinematic-focus>.duel-table{opacity:.24!important');
    expect(css).toContain('.duel-combat.cinematic-focus>.v10-combat-hp{opacity:.98!important');
    expect(css).toContain('.duel-combat.fx-stage-impact>.v10-combat-hp');
    expect(css).toContain('z-index:80!important');
  });

  it('keeps responsive actor clamps and reduced-motion fallbacks',()=>{
    expect(css).toContain('@media (orientation:landscape)');
    expect(css).toContain('clamp(210px,min(31vw,76vh),330px)');
    expect(css).toContain('@media (orientation:landscape) and (max-height:430px)');
    expect(css).toContain('@media (orientation:portrait)');
    expect(css).toContain('@media (prefers-reduced-motion:reduce)');
    expect(css).toContain('transform:none!important;transition:none!important;animation:none!important');
  });
});
