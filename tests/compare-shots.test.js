import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {verdict,AXES,BAR} from '../scripts/compare-shots.mjs';

// V14 QUALITY — blind before/after judging against the commercial reference (docs/art/QUALITY-BAR.md).
const scores=(before,after)=>Object.fromEntries(AXES.map((a,i)=>[a,{before:[before[i]],after:[after[i]]}]));

describe('quality verdict',()=>{
  it('improved = average up by 0.25+, no axis drops more than 1, at least half the axes win',()=>{
    expect(verdict(scores([2,1,2,3,2,3,3,3],[3,3,3,3,3,3,3,3])).improved).toBe(true);
    // average up but one axis collapses
    expect(verdict(scores([2,1,2,3,2,3,3,3],[4,4,4,1,3,3,3,3])).improved).toBe(false);
    // one big axis win, the rest flat: not enough axes improve
    expect(verdict(scores([2,1,2,3,2,3,3,3],[2,4,2,3,2,3,3,3])).improved).toBe(false);
    // tiny average gain
    expect(verdict(scores([3,3,3,3,3,3,3,3],[3.5,3,3,3,3,3,3,3.5])).improved).toBe(false);
  });
  it('bar met only at the reference level on every axis, and names the weakest axis',()=>{
    expect(verdict(scores(Array(8).fill(3),[4.5,4.5,4.5,4.5,4.5,4.5,4.5,4])).barMet).toBe(true);
    const v=verdict(scores(Array(8).fill(3),[5,5,5,5,5,5,5,3.5]));
    expect(v.barMet).toBe(false);expect(v.weakest).toBe(AXES[7]);
    expect(BAR).toEqual({avg:4.3,min:4});
  });
  it('the reference image and the rubric are in the repo',()=>{
    expect(fs.existsSync('docs/art/benchmark/ref-01-commercial.png')).toBe(true);
    const bar=fs.readFileSync('docs/art/QUALITY-BAR.md','utf8');
    for(const a of AXES)expect(bar).toContain(a);
  });
});
