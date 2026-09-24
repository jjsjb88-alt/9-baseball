// @vitest-environment happy-dom
import {describe,expect,it} from 'vitest';
import {resolveTourTarget} from '../src/duel/tour-target.js';

// V12 P7-2 — the guide spotlights a control that is actually on screen.
const box=(el,w,h)=>{el.getBoundingClientRect=()=>({left:0,top:0,width:w,height:h,right:w,bottom:h});return el;};
function dom(){
  box(document.documentElement,390,844);
  document.body.innerHTML=`<button id="hub"></button><section class="card-drawer"><div class="duel-hand"><button class="duel-card skill"></button></div><div class="drawer-watch"></div></section><section class="zone-panel"><div class="zone-grid"></div></section><div class="pitch-read"></div><div class="diamond-events"></div>`;
  for(const q of ['.duel-hand','.duel-card.skill','.drawer-watch','.zone-grid','.pitch-read'])box(document.querySelector(q),120,60);
  box(document.querySelector('.diamond-events'),0,0);
  return document.getElementById('hub');
}
describe('V12 P7-2 tour target',()=>{
  it('keeps the own target when nothing can be measured',()=>{
    document.documentElement.getBoundingClientRect=()=>({width:0,height:0});
    const own=document.createElement('button');
    expect(resolveTourTarget('watch',{watch:{current:own}})).toBe(own);
  });
  it('uses the step’s own target when it is visible',()=>{
    const hub=box(dom(),100,50);
    expect(resolveTourTarget('prepare',{prepare:{current:hub}})).toBe(hub);
  });
  it('falls back to the control doing the same job when the hub is gone',()=>{
    dom();
    expect(resolveTourTarget('prepare',{prepare:{current:null}}).className).toBe('duel-card skill');
    expect(resolveTourTarget('swing',{}).className).toBe('zone-grid');
    expect(resolveTourTarget('watch',{}).className).toBe('drawer-watch');
    expect(resolveTourTarget('events',{events:{current:document.querySelector('.diamond-events')}}).className).toBe('pitch-read');
  });
  it('returns nothing rather than a zero-size box',()=>{
    box(document.documentElement,390,844);document.body.innerHTML='<div class="drawer-watch"></div>';box(document.querySelector('.drawer-watch'),0,0);
    expect(resolveTourTarget('watch',{})).toBeNull();
  });
});
