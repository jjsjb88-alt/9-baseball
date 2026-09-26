// @vitest-environment happy-dom
import React from 'react';
import fs from 'node:fs';
import {render,cleanup} from '@testing-library/react';
import {afterEach,describe,it,expect} from 'vitest';
import BallparkBattle,{CAMERA} from '../src/duel/BallparkBattle.jsx';
import {SLOW_RATE,CATCH_RATE} from '../src/duel/BallparkActors.jsx';
import {createV10Duel,enterV10Node} from '../src/duel/engine.js';

// V13 BALLPARK BP-9 — camera: homer/extra push the lens in on the bat, a one-zone miss goes slow with letterbox.
afterEach(()=>cleanup());
const css=fs.readFileSync('src/duel/ballpark.css','utf8');
function scene(fxStage,grade){
  let s=createV10Duel(0);s=enterV10Node(s,'a1-entry');
  render(<BallparkBattle s={s} hand={[]} fxStage={fxStage} shot={fxStage?{grade,kind:grade,title:'',motion:{slowmo:300}}:null} playToken={1} pitcher={s.pitcher}/>);
  return document.querySelector('.bp-scene');
}

describe('V13 camera',()=>{
  it('maps results to lens moves',()=>{
    expect(CAMERA.homer).toBe('big');expect(CAMERA['grand-slam']).toBe('big');
    expect(CAMERA.extra).toBe('mid');expect(CAMERA['near-miss']).toBe('near');expect(CAMERA['near-miss-k']).toBe('near');
    expect(CAMERA.pitch).toBeUndefined();expect(CAMERA.ball).toBeUndefined();
  });
  it('a homer zooms the world layers around the bat, never the zone or HUD',()=>{
    const el=scene('impact','homer');
    expect(el.classList.contains('cam-big')).toBe(true);
    expect(el.style.getPropertyValue('--cam-x')).toMatch(/px$/);
    for(const sel of ['.bp-bg','.bp-batter','.bp-pitcher'])expect(el.querySelector(sel).classList.contains('bp-cam'),sel).toBe(true);
    for(const sel of ['.bp-zone','.bp-ptag','.bp-verdict'])expect(el.querySelector(sel)?.classList.contains('bp-cam')??false,sel).toBe(false);
  });
  it('no lens move while deciding or on a plain pitch',()=>{
    expect(scene(null).className).not.toMatch(/cam-/);cleanup();
    expect(scene('impact','pitch').className).not.toMatch(/cam-/);
  });
  it('a one-zone miss drops the letterbox only in the slow beat',()=>{
    expect(scene('slowmo','near-miss').querySelector('.bp-letterbox')).toBeTruthy();cleanup();
    expect(scene('impact','near-miss').querySelector('.bp-letterbox')).toBeNull();cleanup();
    expect(scene('slowmo','homer').querySelector('.bp-letterbox')).toBeNull();
  });
  it('Pixi actors slow down in the slow beat and catch up after',()=>{
    expect(SLOW_RATE).toBeLessThan(.5);expect(CATCH_RATE).toBeGreaterThan(1);
    expect(fs.readFileSync('src/duel/BallparkActors.jsx','utf8')).toMatch(/className="bp-pixi bp-cam"/);
  });
  it('css: hidden DOM actors under Pixi never zoom, reduced motion turns the lens off',()=>{
    expect(css).toMatch(/\.bp-scene\.pixi-batter \.bp-batter\.bp-cam,\.bp-scene\.pixi-pitcher \.bp-pitcher\.bp-cam\{animation:none!important\}/);
    expect(css).toMatch(/@media \(prefers-reduced-motion:reduce\)\{\.bp-scene\[class\*="cam-"\] \.bp-cam/);
  });
});
