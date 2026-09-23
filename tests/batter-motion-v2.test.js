import {describe,expect,it} from 'vitest';
import {
  BATTER_MOTION_V2_SEQUENCE,
  batterMotionV2PoseAt,
  batterMotionV2Timeline,
} from '../src/duel/batterMotionV2.js';

const solid={
  grade:'solid',
  motion:{duration:960,impactAt:225,settleAt:660,freeze:50,slowmo:0},
};

describe('batter motion loop v2',()=>{
  it('defines the required authored eight-pose hit sequence in order',()=>{
    expect(BATTER_MOTION_V2_SEQUENCE).toEqual([
      'ready','load','trigger','swing-start','contact','follow-through-early','finish','settle',
    ]);
    expect(batterMotionV2Timeline(solid).slice(0,8).map(x=>x.pose)).toEqual(BATTER_MOTION_V2_SEQUENCE);
  });

  it('keeps every key pose time strictly increasing and aligns contact to impact',()=>{
    const timeline=batterMotionV2Timeline(solid);
    for(let i=1;i<timeline.length;i++)expect(timeline[i].at).toBeGreaterThan(timeline[i-1].at);
    const contact=timeline.find(x=>x.pose==='contact');
    expect(contact.at).toBe(solid.motion.impactAt);
  });

  it('holds contact long enough to read before early follow-through',()=>{
    const timeline=batterMotionV2Timeline(solid);
    const contact=timeline.find(x=>x.pose==='contact');
    const follow=timeline.find(x=>x.pose==='follow-through-early');
    expect(follow.at-contact.at).toBeGreaterThanOrEqual(140);
    expect(batterMotionV2PoseAt(solid,contact.at+80)).toBe('contact');
  });

  it('plays through a swing on misses without falsely showing contact',()=>{
    const miss={grade:'near-miss',motion:{duration:1460,impactAt:245,settleAt:1070,freeze:16,slowmo:380}};
    const poses=batterMotionV2Timeline(miss).map(x=>x.pose);
    expect(poses).toContain('swing-start');
    expect(poses).toContain('follow-through-early');
    expect(poses).not.toContain('contact');
  });
});
