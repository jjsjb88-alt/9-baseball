import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import {createRunMap} from '../src/duel/run-map.js';
import {batterMotionV3Timeline} from '../src/duel/batterMotionV3.js';
import {RED_RUSH_ASSET_ID,hasPitchVisual,redRushFrameAt,redRushTimeline,redRushBatterShot,RED_RUSH_RELEASE_MS,RED_RUSH_RELEASE_FRAME,PITCH_FLIGHT_MS} from '../src/duel/pitcher-sd.js';

const root=new URL('../assets/pitcher-sd-v1/',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',root),'utf8'));

const dimensions=file=>{
  const data=fs.readFileSync(new URL(file,root));
  expect(data.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
  return [data.readUInt32BE(16),data.readUInt32BE(20),data[25]];
};

describe('Red Rush SD pitcher asset',()=>{
  it('ships 120 distinct transparent frames in a 10x12 single-request atlas',()=>{
    expect(manifest.character).toBe(RED_RUSH_ASSET_ID);
    expect(manifest.facing).toBe('screen-left');
    expect(manifest.throws).toBe('screen-left');
    expect(manifest.frameCount).toBe(120);
    expect(manifest.uniqueFrameCount).toBe(120);
    expect(manifest.frames).toHaveLength(120);
    expect(new Set(manifest.frames).size).toBe(120);
    expect(dimensions(manifest.atlas)).toEqual([2560,3072,6]);
    expect(dimensions('frames/'+manifest.frames[0])).toEqual([256,256,6]);
    expect(dimensions('frames/'+manifest.frames[79])).toEqual([256,256,6]);
    expect(dimensions('frames/'+manifest.frames[119])).toEqual([256,256,6]);
  });

  it('places exactly one named Red Rush encounter in each new deterministic run',()=>{
    for(let seed=0;seed<64;seed++){
      const map=createRunMap(seed);
      const found=map.nodes.filter(node=>node.opponent?.artId===RED_RUSH_ASSET_ID);
      expect(found).toHaveLength(1);
      expect(found[0].type).toBe('battle');
      expect(found[0].id).toBe('a1-entry');
      expect(found[0].opponent.name).toBe('레드 러시');
    }
  });

  it('releases the ball on authored frame 76 and makes contact one flight later; honors reduced motion',()=>{
    expect(redRushFrameAt(-10)).toBe(0);
    expect(redRushFrameAt(0)).toBe(0);
    expect(redRushFrameAt(1320)).toBe(79);
    expect(redRushFrameAt(2000)).toBe(119);
    expect(redRushFrameAt(5000)).toBe(119);
    const base={impactAt:230,freeze:58,slowmo:100,releaseAt:388,settleAt:760,duration:1080};
    const full=redRushTimeline(base);
    expect(redRushFrameAt(RED_RUSH_RELEASE_MS)).toBe(RED_RUSH_RELEASE_FRAME);
    expect(full.impactAt).toBe(RED_RUSH_RELEASE_MS+PITCH_FLIGHT_MS);
    expect(PITCH_FLIGHT_MS).toBeGreaterThanOrEqual(250);
    expect(full.releaseAt).toBe(full.impactAt+base.freeze+base.slowmo);
    expect(full.settleAt).toBeGreaterThan(full.releaseAt);
    expect(full.duration).toBeGreaterThanOrEqual(2000);
    expect(redRushTimeline(base,true)).toBe(base);
    expect(hasPitchVisual({grade:'read'})).toBe(false);
    expect(hasPitchVisual({grade:'solid'})).toBe(true);
    const shot={grade:'solid',motion:base};
    const synchronized=batterMotionV3Timeline(redRushBatterShot(shot));
    expect(synchronized.find(key=>key.pose==='load').at).toBe(full.impactAt-320);
    expect(synchronized.find(key=>key.pose==='contact').at).toBe(full.impactAt);
    expect(synchronized.find(key=>key.pose==='settle').at).toBe(full.settleAt);
    expect(redRushBatterShot(shot,true)).toBe(shot);
  });
});
