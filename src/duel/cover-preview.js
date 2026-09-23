import {coverageAt} from './engine.js';
import './cover-preview.css';

/*
 * V12 P2-2 — exact cover preview (contract C1).
 * While a card is in hand-to-board placement (armed by a tap, or dragged), the zone under the pointer
 * or keyboard focus previews exactly the cells that card would cover there. The cells come only from
 * the engine — App writes coverageAt(s,id,zone) for all nine zones onto each swing card as
 * data-cover-map — so a cross in a corner previews 3 cells, `expanded` widens it and patience narrows it.
 * This layer never guesses from the card's shape and never changes game state: it only toggles classes.
 * First placed card = main (solid), later cards = support (dashed), matching the committed cover.
 */
export function coverMapOf(s,id){
  const zones=Array.from({length:9},(_,z)=>coverageAt(s,id,z));
  return zones.every(z=>!z.length)?null:zones.map(z=>z.join('.')).join('|');
}
export function parseCoverMap(text){
  if(!text)return null;
  const parts=String(text).split('|');
  return parts.length===9?parts.map(p=>p?p.split('.').map(Number):[]):null;
}

const CELL='.zone-grid .zone-cell';
const MOVING='.duel-hand .duel-card.board-drag-source[data-cover-map], .duel-hand .duel-card.board-card-armed[data-cover-map]';
const CLASSES=['cover-preview','cover-preview-anchor','cover-preview-main','cover-preview-support'];

export function installCoverPreview(root=document){
  let hover=null,focus=null,frame=0;
  const win=root.defaultView||window;
  const cells=()=>[...root.querySelectorAll(CELL)];
  const clear=()=>{
    for(const c of root.querySelectorAll('.cover-preview,.cover-preview-anchor'))c.classList.remove(...CLASSES);
    const panel=root.querySelector('.zone-panel[data-cover-preview]');if(panel)delete panel.dataset.coverPreview;
  };
  const update=()=>{
    const card=root.querySelector(MOVING),list=cells();
    const hot=list.find(c=>c.classList.contains('board-drop-hot'));
    const at=card?(hot||(card.classList.contains('board-drag-source')?null:hover||focus)):null;
    const zone=at?list.indexOf(at):-1,map=card&&zone>=0?parseCoverMap(card.dataset.coverMap):null;
    if(!map){clear();return;}
    const panel=at.closest('.zone-panel'),role=panel?.classList.contains('board-empty')?'main':'support';
    const want=new Set(map[zone]);
    list.forEach((c,i)=>{
      const on=want.has(i);
      c.classList.toggle('cover-preview',on);c.classList.toggle('cover-preview-main',on&&role==='main');
      c.classList.toggle('cover-preview-support',on&&role==='support');c.classList.toggle('cover-preview-anchor',i===zone);
    });
    if(panel)panel.dataset.coverPreview=role+' '+want.size;
  };
  const later=()=>{win.cancelAnimationFrame?.(frame);frame=win.requestAnimationFrame?.(()=>{frame=win.requestAnimationFrame(update);})||0;};
  const over=e=>{const c=e.target?.closest?.(CELL);if(c){hover=c;update();}};
  const out=e=>{
    const c=e.target?.closest?.(CELL);if(!c||c!==hover)return;
    if(e.relatedTarget&&c.contains(e.relatedTarget))return;
    hover=null;update();
  };
  const focusIn=e=>{const c=e.target?.closest?.(CELL);focus=c||null;update();};
  const settle=()=>{update();later();};
  const opts={capture:true,passive:true};
  root.addEventListener('pointerover',over,opts);root.addEventListener('pointerout',out,opts);
  root.addEventListener('focusin',focusIn,opts);root.addEventListener('pointermove',update,opts);
  root.addEventListener('pointerup',settle,opts);root.addEventListener('pointercancel',settle,opts);
  root.addEventListener('click',settle,opts);root.addEventListener('keyup',settle,opts);
  return ()=>{
    win.cancelAnimationFrame?.(frame);clear();
    root.removeEventListener('pointerover',over,opts);root.removeEventListener('pointerout',out,opts);
    root.removeEventListener('focusin',focusIn,opts);root.removeEventListener('pointermove',update,opts);
    root.removeEventListener('pointerup',settle,opts);root.removeEventListener('pointercancel',settle,opts);
    root.removeEventListener('click',settle,opts);root.removeEventListener('keyup',settle,opts);
  };
}
