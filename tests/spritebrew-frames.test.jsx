// @vitest-environment happy-dom
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import {render,cleanup,act,fireEvent} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import SpritePlayer from '../src/duel/SpritePlayer.jsx';
import {SPRITEBREW_ANIMS,spriteFramePath,spriteFrames,frameAt,keyOffsetMs,animDurationMs} from '../src/duel/spritebrew-frames.js';

/* manual requestAnimationFrame: step(ts) runs the queued callbacks with that timestamp */
let queue=[];
const step=ts=>act(()=>{const q=queue;queue=[];q.forEach(cb=>cb(ts));});
beforeEach(()=>{
  queue=[];
  vi.stubGlobal('requestAnimationFrame',cb=>{queue.push(cb);return queue.length;});
  vi.stubGlobal('cancelAnimationFrame',()=>{queue=[];});
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

const FRAMES=['/a/frame_00.png','/a/frame_01.png','/a/frame_02.png','/a/frame_03.png'];

describe('spritebrew frame registry',()=>{
  it('builds public/sprites/{character}/{animation}/frame_NN.png under the Vite base',()=>{
    expect(spriteFramePath('batter','swing',3,'/')).toBe('/sprites/batter/swing/frame_03.png');
    expect(spriteFramePath('pitcher','windup',11,'/9-baseball/')).toBe('/9-baseball/sprites/pitcher/windup/frame_11.png');
    expect(spriteFramePath('batter','idle',0,'/x')).toBe('/x/sprites/batter/idle/frame_00.png');
  });

  it('covers the planned animations and returns [] for undelivered ones',()=>{
    expect(Object.keys(SPRITEBREW_ANIMS.batter)).toEqual(['idle','swing','miss','homerun']);
    expect(Object.keys(SPRITEBREW_ANIMS.pitcher)).toEqual(['idle','windup','release']);
    expect(spriteFrames('batter','nope')).toEqual([]);
    expect(spriteFrames('ghost','idle')).toEqual([]);
  });

  it('every counted frame exists in public/ (drop the ZIP in, then set frames)',()=>{
    for(const [character,anims] of Object.entries(SPRITEBREW_ANIMS)){
      for(const [animation,anim] of Object.entries(anims)){
        expect(anim.fps).toBeGreaterThan(0);
        if(anim.keyFrame!=null&&anim.frames>0)expect(anim.keyFrame).toBeLessThan(anim.frames);
        for(const url of spriteFrames(character,animation,'/')){
          expect(fs.existsSync(path.join('public',url)),url).toBe(true);
        }
      }
    }
  });

  it('keys the one-shots to the game clock',()=>{
    const {swing}=SPRITEBREW_ANIMS.batter,{release,windup}=SPRITEBREW_ANIMS.pitcher;
    // contact frame lands within one frame of the 320 ms load→contact of batterMotionV3 (sync)
    expect(Math.abs(keyOffsetMs(swing)-320)).toBeLessThanOrEqual(1000/swing.fps);
    // windup (12 planned frames) hands over to release before the release frame (~1267 ms)
    expect(animDurationMs(12,windup.fps)).toBeLessThanOrEqual(Math.round(76*1000/60)-keyOffsetMs(release)+5);
  });

  it('frameAt loops or holds the last frame',()=>{
    expect(frameAt(0,4,10)).toBe(0);
    expect(frameAt(250,4,10)).toBe(2);
    expect(frameAt(1000,4,10)).toBe(3);
    expect(frameAt(1000,4,10,true)).toBe(2);
    expect(frameAt(NaN,4,10)).toBe(0);
    expect(frameAt(100,0,10)).toBe(0);
  });
});

describe('SpritePlayer',()=>{
  it('renders the fallback while frames are not delivered',()=>{
    const {container,getByTestId}=render(<SpritePlayer character="batter" animation="swing" fallback={<i data-testid="old"/>}/>);
    expect(getByTestId('old')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });

  it('draws pixelated, untouchable frames and advances by fps',()=>{
    const {container}=render(<SpritePlayer frames={FRAMES} fps={10}/>);
    const img=container.querySelector('img');
    expect(img.style.imageRendering).toBe('pixelated');
    expect(img.style.pointerEvents).toBe('none');
    expect(img.getAttribute('src')).toBe(FRAMES[0]);
    step(1000);step(1210);
    expect(container.querySelector('img').getAttribute('src')).toBe(FRAMES[2]);
  });

  it('fires onComplete once for a one-shot and holds the last frame',()=>{
    const done=vi.fn();
    const {container}=render(<SpritePlayer frames={FRAMES} fps={10} onComplete={done}/>);
    step(0);step(200);step(400);step(450);
    expect(done).toHaveBeenCalledTimes(1);
    expect(container.querySelector('img').getAttribute('src')).toBe(FRAMES[3]);
    expect(queue.length).toBe(0);
  });

  it('loops without completing',()=>{
    const done=vi.fn();
    const {container}=render(<SpritePlayer frames={FRAMES} fps={10} loop onComplete={done}/>);
    step(0);step(500);
    expect(container.querySelector('img').getAttribute('src')).toBe(FRAMES[1]);
    expect(done).not.toHaveBeenCalled();
  });

  it('restarts on a new playToken',()=>{
    const {container,rerender}=render(<SpritePlayer frames={FRAMES} fps={10} playToken={1}/>);
    step(0);step(300);
    expect(container.querySelector('img').getAttribute('src')).toBe(FRAMES[3]);
    rerender(<SpritePlayer frames={FRAMES} fps={10} playToken={2}/>);
    expect(container.querySelector('img').getAttribute('src')).toBe(FRAMES[0]);
  });

  it('falls back when a frame fails to load',()=>{
    const {container,getByTestId}=render(<SpritePlayer frames={FRAMES} fps={10} fallback={<i data-testid="old"/>}/>);
    fireEvent.error(container.querySelector('img'));
    expect(getByTestId('old')).toBeTruthy();
  });

  it('reduced motion: a one-shot shows its last frame and completes at once',()=>{
    vi.stubGlobal('matchMedia',q=>({matches:q.includes('reduce'),addEventListener(){},removeEventListener(){}}));
    const done=vi.fn();
    const {container}=render(<SpritePlayer frames={FRAMES} fps={10} onComplete={done}/>);
    expect(container.querySelector('img').getAttribute('src')).toBe(FRAMES[3]);
    expect(done).toHaveBeenCalledTimes(1);
    expect(queue.length).toBe(0);
  });
});
