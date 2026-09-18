import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import {presentationFor,presentationTimeline} from '../src/duel/presentation.js';

const css=fs.readFileSync(new URL('../src/duel/golden-master.css',import.meta.url),'utf8');

const reveal=(kind,label,zone=4,coverage=[0],aimZone=4)=>({
  last:{kind:'pitch',text:label,runs:0},
  battle:{revealed:{kind,label,zone,coverage,aimZone,strikesBefore:2}},
});

describe('golden master 04 cinematic timing',()=>{
  it('gives strikeouts a longer authored beat than an ordinary whiff',()=>{
    const miss=presentationFor(reveal('whiff','헛스윙',4,[0],0));
    const strikeout=presentationFor(reveal('whiff','헛스윙 삼진',4,[0],0));
    const missTimeline=presentationTimeline(miss);
    const kTimeline=presentationTimeline(strikeout);
    expect(strikeout.grade).toBe('strikeout');
    expect(kTimeline.duration).toBeGreaterThan(missTimeline.duration);
    expect(kTimeline.freeze).toBeGreaterThan(missTimeline.freeze);
    expect(kTimeline.slowmo).toBeGreaterThan(missTimeline.slowmo);
  });

  it('separates called strike three from a normal called strike',()=>{
    const called=presentationFor(reveal('called','루킹 스트라이크'));
    const calledK=presentationFor(reveal('called','루킹 삼진'));
    expect(called.grade).toBe('called');
    expect(calledK.grade).toBe('called-k');
    expect(presentationTimeline(calledK).duration).toBeGreaterThan(presentationTimeline(called).duration);
  });

  it('keeps power contact visually hitter-led before the stadium response',()=>{
    expect(css).toContain('.golden-master-stage.grade-homer.fx-stage-impact .gm-batter-light');
    expect(css).toContain('.golden-master-stage.grade-homer.fx-stage-impact .gm-pitcher-light');
    expect(css).toContain('.golden-master-stage.grade-homer.fx-stage-release .gm-concourse-windows>i:nth-child(3n)');
    expect(css).toContain('.golden-master-stage.grade-grand-slam.fx-stage-impact .gm-contact-halo');
  });

  it('lets strikeout outcomes keep the pitcher and pitch line dominant',()=>{
    expect(css).toContain('.golden-master-stage.grade-strikeout.fx-stage-impact .gm-pitcher-light');
    expect(css).toContain('.golden-master-stage.grade-called-k.fx-stage-impact .gm-batter-light');
    expect(css).toContain('.golden-master-stage.grade-near-miss-k.fx-stage-slowmo .gm-pitch-tunnel');
    expect(css).toContain('.golden-master-stage.grade-strikeout.fx-stage-release .golden-actor.sprite-batter');
  });

  it('retains a reduced-motion static outcome hierarchy',()=>{
    expect(css).toContain('@media (prefers-reduced-motion:reduce)');
    expect(css).toContain('.golden-master-stage.grade-called-k .gm-depth-mid{transform:none!important}');
  });
});
