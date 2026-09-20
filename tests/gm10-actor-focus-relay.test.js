import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {presentationFor} from '../src/duel/presentation.js';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/golden-master.css',import.meta.url),'utf8');

const state=(kind,label,zone=4,aimZone=4)=>({
  last:{kind:'pitch',text:label,runs:0},
  battle:{revealed:{kind,label,zone,aimZone,coverage:[aimZone],strikesBefore:1}},
});

describe('GM10 actor focus relay',()=>{
  it('surfaces Outcome Director identity on the arena parent',()=>{
    expect(app).toContain("shot?.director?.key?'director-'+shot.director.key:''");
    expect(app).toContain('arenaPresentationClass(stage,shot)');
  });

  it('keeps outcome families distinct before CSS blocking is applied',()=>{
    expect(presentationFor(state('hit','중전안타'))?.director?.key).toBe('contact');
    expect(presentationFor(state('hit','홈런'))?.director?.key).toBe('power');
    expect(presentationFor(state('whiff','헛스윙',1,4))?.director?.key).toBe('near-miss');
    expect(presentationFor(state('whiff','삼진',8,0))?.director?.key).toBe('strikeout');
    expect(presentationFor(state('foul','파울'))?.director?.key).toBe('scrappy');
  });

  it('hands visual ownership between pitcher, hitter, passing ball and result',()=>{
    expect(css).toContain('.golden-master-stage.fx-stage-windup[class*="director-"] .actor-right');
    expect(css).toContain('.golden-master-stage.director-contact.fx-stage-impact .actor-left');
    expect(css).toContain('.golden-master-stage.director-power.fx-stage-impact .actor-left');
    expect(css).toContain('.golden-master-stage.director-near-miss.fx-stage-slowmo .actor-left');
    expect(css).toContain('.golden-master-stage.director-near-miss.fx-stage-release .actor-left');
    expect(css).toContain('.golden-master-stage.director-strikeout.fx-stage-release .actor-right');
    expect(css).toContain('.golden-master-stage.director-scrappy.fx-stage-impact .actor-left');
  });

  it('moves only outer actor containers and leaves V4 Canvas timing untouched',()=>{
    expect(css).toContain('V4 Canvas keeps its native 60Hz frame interpolation');
    expect(css).not.toContain('.v4-canvas{animation:');
    expect(css).not.toContain('.v4-sequence{animation:');
  });

  it('compresses blocking on phones and low-height landscape',()=>{
    expect(css).toContain('@media(max-width:700px)');
    expect(css).toContain('@media (orientation:landscape) and (max-height:430px)');
    expect(css).toContain('scale(1.07)');
    expect(css).toContain('scale(1.045)');
  });

  it('removes container motion under reduced-motion preference',()=>{
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
    expect(css).toContain('transform:none!important');
    expect(css).toContain('transition:none!important');
  });
});
