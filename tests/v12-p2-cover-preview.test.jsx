// @vitest-environment happy-dom
import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import Duel from '../src/duel/App.jsx';
import {createV10Duel,enterV10Node,saveV10Duel,coverageAt} from '../src/duel/engine.js';
import {BUILDS} from '../src/duel/cards.js';
import {installCoverPreview,coverMapOf,parseCoverMap} from '../src/duel/cover-preview.js';

// V12 P2-2 — exact cover preview (C1): what a card would cover at a zone comes only from
// coverageAt(s,id,zone), never from its shape name. A cross in a corner covers 3 zones, not 5.
beforeEach(()=>{localStorage.clear()});
afterEach(()=>{cleanup()});

function v10(){
  let s=createV10Duel(1);
  s.build='away';s.deck=['defend',...BUILDS.away.cards].map((kind,i)=>({id:'c'+i,kind}));s.nextId=s.deck.length;
  return enterV10Node(s,'a1-entry');
}

describe('V12 P2-2 cover map from the engine',()=>{
  it('is coverageAt for each of the nine zones',()=>{
    const s=v10();
    for(const id of ['basic',...s.battle.hand]){
      const map=parseCoverMap(coverMapOf(s,id));
      if(!map){expect(coverageAt(s,id,0)).toEqual([]);continue;}
      expect(map).toHaveLength(9);
      for(let z=0;z<9;z++)expect(map[z]).toEqual(coverageAt(s,id,z));
    }
  });
  it('follows engine state that changes coverage (expanded)',()=>{
    const s=v10();const id=s.battle.hand.find(h=>coverageAt(s,h,0).length===1)||'basic';
    const before=parseCoverMap(coverMapOf(s,id))[0];
    s.battle.expanded=true;
    const after=parseCoverMap(coverMapOf(s,id))[0];
    expect(after).toEqual(coverageAt(s,id,0));
    expect(after.length).toBeGreaterThan(before.length);
  });
  it('has no map for a prepare card',()=>{
    const s=v10();s.deck.push({id:'x1',kind:'scout'});s.battle.hand.push('x1');
    expect(coverMapOf(s,'x1')).toBeNull();
  });
});

describe('V12 P2-2 hand cards carry the map',()=>{
  it('marks swing cards with the engine cover map',()=>{
    const s=v10();saveV10Duel(localStorage,s);
    render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'MAIN RUN 이어하기',exact:true}));
    fireEvent.click(screen.getByRole('button',{name:'스윙하기',exact:true}));
    const cards=[...document.querySelectorAll('.duel-hand .duel-card.attack')];
    expect(cards.length).toBeGreaterThan(1);
    for(const c of cards){
      const id=c.classList.contains('basic-card')?'basic':null;
      const map=parseCoverMap(c.dataset.coverMap);
      expect(map).toHaveLength(9);
      if(id)for(let z=0;z<9;z++)expect(map[z]).toEqual([z]);
    }
  });
});

function board(mainPlaced=false){
  const cells=Array.from({length:9},(_,i)=>`<button class="zone-cell" data-z="${i}"></button>`).join('');
  // a cross card: its map is whatever the engine said — here a corner-clipped cross at zone 0
  const map='0.1.3|0.1.2.4|1.2.5|0.3.4.6|1.3.4.5.7|2.4.5.8|3.6.7|4.6.7.8|5.7.8';
  document.body.innerHTML=`<main class="duel-combat"><section class="zone-panel zone-card-board-active ${mainPlaced?'':'board-empty'}"><div class="zone-grid">${cells}</div></section>
    <section class="card-drawer"><div class="duel-hand"><button class="duel-card attack" data-cover-map="${map}"><strong>X</strong></button></div></section></main>`;
  return {cells:[...document.querySelectorAll('.zone-cell')],card:document.querySelector('.duel-card')};
}
const marked=cells=>cells.map((c,i)=>c.classList.contains('cover-preview')?i:null).filter(x=>x!=null);

describe('V12 P2-2 preview on the board',()=>{
  it('shows exactly the mapped cells for an armed card over a zone, and clears on leave',()=>{
    const {cells,card}=board();const off=installCoverPreview(document);
    card.classList.add('board-card-armed');
    cells[0].dispatchEvent(new Event('pointerover',{bubbles:true}));
    expect(marked(cells)).toEqual([0,1,3]);
    expect(cells[0].classList.contains('cover-preview-anchor')).toBe(true);
    expect(document.querySelector('.zone-panel').dataset.coverPreview).toBe('main 3');
    cells[4].dispatchEvent(new Event('pointerover',{bubbles:true}));
    expect(marked(cells)).toEqual([1,3,4,5,7]);
    cells[4].dispatchEvent(new Event('pointerout',{bubbles:true}));
    expect(marked(cells)).toEqual([]);
    off();
  });
  it('marks a later card as support and follows the drag hot cell',()=>{
    const {cells,card}=board(true);const off=installCoverPreview(document);
    card.classList.add('board-drag-source');cells[8].classList.add('board-drop-hot');
    document.dispatchEvent(new Event('pointermove',{bubbles:true}));
    expect(marked(cells)).toEqual([5,7,8]);
    expect(cells[5].classList.contains('cover-preview-support')).toBe(true);
    card.classList.remove('board-drag-source');cells[8].classList.remove('board-drop-hot');
    document.dispatchEvent(new Event('pointerup',{bubbles:true}));
    expect(marked(cells)).toEqual([]);
    off();
  });
  it('previews for the keyboard on a focused zone and ignores an unarmed hover',()=>{
    const {cells,card}=board();const off=installCoverPreview(document);
    cells[2].dispatchEvent(new Event('pointerover',{bubbles:true}));
    expect(marked(cells)).toEqual([]);
    card.classList.add('board-card-armed');
    cells[2].dispatchEvent(new FocusEvent('focusin',{bubbles:true}));
    expect(marked(cells)).toEqual([1,2,5]);
    off();
    expect(marked(cells)).toEqual([]);
  });
});

describe('V12 P2-2 preview styles',()=>{
  const css=fs.readFileSync(path.resolve(process.cwd(),'src/duel/cover-preview.css'),'utf8');
  it('stays on the battle board and draws main solid / support dashed',()=>{
    const sels=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/@media[^{]*\{/g,'').split('}').map(r=>r.split('{')[0].trim()).filter(Boolean);
    for(const sel of sels)for(const p of sel.split(','))expect(p.trim()).toMatch(/^\.duel-combat \.zone-panel/);
    expect(css).toMatch(/cover-preview-support[^{]*\{[^}]*dashed/);
    expect(css).toMatch(/cover-preview[^{]*\{[^}]*solid/);
    for(const m of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g))expect(Number(m[1])).toBeGreaterThanOrEqual(12);
  });
});

describe('V12 P2-4 a card that replaces the main previews as main',()=>{
  const setup=(extra='')=>{const r=board(true);document.querySelector('.duel-hand').insertAdjacentHTML('beforeend',extra);return r;};
  it('BASIC and bunt replace the main instead of stacking',()=>{
    for(const kind of ['basic','bunt']){
      const {cells,card}=setup();card.dataset.cardKind=kind;const off=installCoverPreview(document);
      card.classList.add('board-card-armed');cells[4].dispatchEvent(new Event('pointerover',{bubbles:true}));
      expect(cells[4].classList.contains('cover-preview-main')).toBe(true);
      expect(document.querySelector('.zone-panel').dataset.coverPreview).toMatch(/^main/);
      off();
    }
  });
  it('anything placed on a bunt main replaces it',()=>{
    const {cells,card}=setup();document.querySelector('.card-drawer').dataset.mainExclusive='1';
    const off=installCoverPreview(document);
    card.classList.add('board-card-armed');cells[4].dispatchEvent(new Event('pointerover',{bubbles:true}));
    expect(cells[4].classList.contains('cover-preview-support')).toBe(false);
    expect(cells[4].classList.contains('cover-preview-main')).toBe(true);
    off();
  });
});
