import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import {presentationFor} from '../src/duel/presentation.js';

const stage=fs.readFileSync(new URL('../src/duel/GoldenMasterStage.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/golden-master.css',import.meta.url),'utf8');
const renderer=fs.readFileSync(new URL('../src/duel/ArenaRenderer2.jsx',import.meta.url),'utf8');

const shotState=(kind,label,zone=4,aimZone=4)=>({
  last:{kind:'pitch',runs:0},
  battle:{revealed:{kind,label,zone,aimZone,coverage:[aimZone],strikesBefore:0}}
});

describe('golden master 02 duel choreography',()=>{
  it('gives the pitcher a readable windup before contact rather than flashing through release',()=>{
    const homer=presentationFor(shotState('hit','홈런'));
    const solid=presentationFor(shotState('hit','안타'));
    const called=presentationFor(shotState('called','스트라이크'));
    expect(homer.motion.impactAt).toBeGreaterThanOrEqual(280);
    expect(solid.motion.impactAt).toBeGreaterThanOrEqual(220);
    expect(called.motion.impactAt).toBeGreaterThanOrEqual(220);
    expect(homer.motion.settleAt).toBeGreaterThan(homer.motion.impactAt+homer.motion.freeze+homer.motion.slowmo);
  });

  it('adds a spatial pitcher-to-batter relay layer without intercepting input',()=>{
    expect(stage).toContain('gm-duel-axis');
    expect(stage).toContain('gm-pitch-tunnel');
    expect(stage).toContain('gm-release-ring');
    expect(stage).toContain('gm-foot-plant');
    expect(stage).toContain('gm-bat-arc');
    expect(css).toContain('.gm-pitch-tunnel{');
    expect(css).toContain('.gm-release-ring{');
    expect(css).toContain('.golden-master-stage.fx-stage-windup .gm-pitch-tunnel');
    expect(css).toContain('.golden-master-stage.fx-stage-impact .gm-bat-arc');
  });

  it('hands visual emphasis from pitcher on windup to batter on impact',()=>{
    expect(css).toContain('.golden-master-stage.fx-stage-windup .gm-pitcher-light{opacity:1');
    expect(css).toContain('.golden-master-stage.fx-stage-windup .gm-batter-light{opacity:.36');
    expect(css).toContain('.golden-master-stage.fx-stage-impact .gm-batter-light{opacity:1');
    expect(css).toContain('.golden-master-stage.fx-stage-impact .gm-pitcher-light{opacity:.42');
    expect(css).toContain('.fx-stage-windup .sprite-pitcher .duel-sprite');
    expect(css).toContain('.fx-stage-impact .sprite-batter .duel-sprite');
  });

  it('moves the camera from pitcher side toward the plate and tightens on contact',()=>{
    expect(renderer).toContain('float handoff=smoothstep(.18,.92,u_phase)');
    expect(renderer).toContain('pan=mix(.038,-.020,handoff)');
    expect(renderer).toContain('zoom=1.118');
    expect(renderer).toContain('zoom=1.138');
    expect(renderer).toContain('releasePulse=u_stage==1');
    expect(renderer).toContain('float tunnel=lineMask');
  });

  it('keeps reduced-motion and short landscape fallbacks for the new choreography',()=>{
    expect(css).toContain('@media (orientation:landscape) and (max-height:430px)');
    expect(css).toContain('.gm-release-ring{right:14%;top:26%;width:66px;height:66px}');
    expect(css).toContain('@media (prefers-reduced-motion:reduce)');
    expect(css).toContain('.golden-master-stage .gm-pitch-tunnel,.golden-master-stage .gm-release-ring,.golden-master-stage .gm-foot-plant,.golden-master-stage .gm-bat-arc{animation:none!important');
  });
});
