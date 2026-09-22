import {describe,expect,it} from 'vitest';
import {
  BATTER_MOTION_V3_SEQUENCE,
  batterMotionV3PoseAt,
  batterMotionV3Timeline,
} from '../src/duel/batterMotionV3.js';

const solid={
  grade:'solid',
  motion:{duration:1080,impactAt:300,settleAt:850,freeze:50,slowmo:0},
};

describe('batter motion loop v3',()=>{
  it('defines ten authored poses including pre/post-contact bridges',()=>{
    expect(BATTER_MOTION_V3_SEQUENCE).toEqual([
      'ready','load','trigger','swing-start','swing-mid','contact',
      'follow-through-early','follow-through-late','finish','settle',
    ]);
    expect(batterMotionV3Timeline(solid).slice(0,10).map(x=>x.pose)).toEqual(BATTER_MOTION_V3_SEQUENCE);
  });

  it('keeps key times increasing and contact aligned to presentation impact',()=>{
    const timeline=batterMotionV3Timeline(solid);
    for(let i=1;i<timeline.length;i++)expect(timeline[i].at).toBeGreaterThan(timeline[i-1].at);
    expect(timeline.find(x=>x.pose==='contact').at).toBe(solid.motion.impactAt);
  });

  it('keeps a readable contact hold and bridge pose on each side',()=>{
    const timeline=batterMotionV3Timeline(solid);
    const mid=timeline.find(x=>x.pose==='swing-mid');
    const contact=timeline.find(x=>x.pose==='contact');
    const early=timeline.find(x=>x.pose==='follow-through-early');
    expect(contact.at-mid.at).toBeGreaterThanOrEqual(38);
    expect(early.at-contact.at).toBeGreaterThanOrEqual(150);
    expect(batterMotionV3PoseAt(solid,contact.at+90)).toBe('contact');
  });

  it('misses still swing through both bridges without showing false contact',()=>{
    const miss={grade:'near-miss',motion:{duration:1500,impactAt:300,settleAt:1100,freeze:16,slowmo:380}};
    const poses=batterMotionV3Timeline(miss).map(x=>x.pose);
    expect(poses).toContain('swing-mid');
    expect(poses).toContain('follow-through-late');
    expect(poses).not.toContain('contact');
  });
});
