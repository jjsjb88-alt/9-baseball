import {describe,it,expect} from 'vitest';
import fs from 'node:fs';

const arena=fs.readFileSync(new URL('../src/duel/ArenaRenderer2.jsx',import.meta.url),'utf8');
const stage=fs.readFileSync(new URL('../src/duel/GoldenMasterStage.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/golden-master.css',import.meta.url),'utf8');

describe('GM09 outcome director',()=>{
  it('passes the presentation director into the WebGL shader',()=>{
    expect(arena).toContain("import {cinemaDirector} from './presentation.js'");
    expect(arena).toContain("'uniform int u_director;'");
    expect(arena).toContain("director=cinemaDirector(shot)");
    expect(arena).toContain("gl.uniform1i(U.director,director.code)");
  });

  it('gives POWER a contact punch, ball chase and stadium reaction',()=>{
    expect(arena).toContain('if(u_director==2){zoom=1.160');
    expect(arena).toContain("if(u_director==2){zoom=mix(1.110,1.025,u_phase)");
    expect(arena).toContain('stadiumReaction=(u_director==2&&u_stage==4)');
    expect(css).toContain('.gm-depth-back.gm-director-power.gm-impact');
    expect(css).toContain('.gm-depth-back.gm-director-power.gm-release');
  });

  it('lets near-miss follow the passing ball instead of using power framing',()=>{
    expect(arena).toContain("else if(u_director==3){zoom=1.095");
    expect(arena).toContain("else if(u_director==3){zoom=mix(1.100,1.045,u_phase)");
    expect(css).toContain('.gm-depth-mid.gm-director-near-miss.gm-slowmo .gm-pitch-tunnel');
  });

  it('lets strikeout end with pitcher ownership and no contact flash',()=>{
    expect(arena).toContain('pitcherClaim=(u_director==4&&(u_stage==4||u_stage==5))');
    expect(css).toContain('.gm-depth-mid.gm-director-strikeout.gm-release .gm-pitcher-light');
    expect(css).toContain('.gm-depth-mid.gm-director-strikeout.gm-release .gm-contact-halo');
  });

  it('exposes director classes without adding new particles or actor filters',()=>{
    expect(stage).toContain("director=cinemaDirector(shot).key");
    expect(stage).toContain("' gm-director-'+director");
    const directorSection=css.slice(css.indexOf('GM09 · Outcome Director'));
    expect(directorSection).not.toContain('@keyframes');
    expect(directorSection).not.toContain('.duel-sprite');
    expect(directorSection).not.toContain('.v4-canvas');
  });

  it('keeps reduced motion transitions disabled',()=>{
    const directorSection=css.slice(css.indexOf('GM09 · Outcome Director'));
    expect(directorSection).toContain('@media (prefers-reduced-motion:reduce)');
    expect(directorSection).toContain('transition:none!important');
  });
});
