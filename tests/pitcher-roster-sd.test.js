import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const root=new URL('../assets/pitcher-sd-v2/',import.meta.url);
const roster=JSON.parse(fs.readFileSync(new URL('../assets/pitcher-mobs-v1/roster.json',import.meta.url),'utf8'));
const remaining=roster.filter(entry=>entry.id!=='regular-01-red-rush');

const dimensions=file=>{
  const data=fs.readFileSync(new URL(file,root));
  expect(data.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
  return [data.readUInt32BE(16),data.readUInt32BE(20),data[25]];
};

describe('remaining pitcher SD roster',()=>{
  it('packages every other pitcher with two transparent six-pose sheets',()=>{
    expect(remaining).toHaveLength(11);
    for(const entry of remaining){
      expect(dimensions(`source/${entry.id}-keys.png`)).toEqual([1536,1024,6]);
      expect(dimensions(`source/${entry.id}-bridges.png`)).toEqual([1536,1024,6]);
    }
  });

  it('provides a full 120-frame atlas and synchronized release for every ID',()=>{
    for(const entry of remaining){
      const manifest=JSON.parse(fs.readFileSync(new URL(`${entry.id}-manifest.json`,root),'utf8'));
      expect(manifest.character).toBe(entry.id);
      expect(manifest.facing).toBe('screen-left');
      expect(manifest.throws).toBe('screen-left');
      expect(manifest.frameCount).toBe(120);
      expect(manifest.uniqueFrameCount).toBe(120);
      expect(manifest.authoredPoseCount).toBe(12);
      expect(manifest.fps).toBe(60);
      expect(manifest.releaseFrame).toBe(79);
      expect(manifest.keyPoses.find(pose=>pose.pose==='release')?.frame).toBe(79);
      expect(dimensions(manifest.atlas)).toEqual([2560,3072,6]);
      expect(dimensions(`previews/${entry.id}-poses.png`)).toEqual([1536,512,6]);
    }
  });
});
