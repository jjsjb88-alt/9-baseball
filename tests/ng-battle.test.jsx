// @vitest-environment happy-dom
import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import Duel from '../src/duel/App.jsx';
import {createV10Duel,enterV10Node,saveV10Duel,readV10Duel} from '../src/duel/engine.js';
import {BUILDS,CARDS} from '../src/duel/cards.js';
import {intentLines,hpTicks} from '../src/duel/nightgame-copy.js';

// V13 NG-1 — the night-game battle screen (docs/design/v13/NIGHTGAME.md), opt-in with ?ng=1.
beforeEach(()=>{localStorage.clear()});
afterEach(()=>{cleanup()});

function begin(ng=true){
  let s=createV10Duel(1);
  s.build='away';s.deck=BUILDS.away.cards.filter(k=>CARDS[k].type!=='skill').map((kind,i)=>({id:'c'+i,kind}));
  s.nextId=s.deck.length;
  s=enterV10Node(s,'a1-entry');
  saveV10Duel(localStorage,s);
  if(ng)localStorage.setItem('9zone-ng','1');
  render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'MAIN RUN 이어하기',exact:true}));
  return s;
}
const swingBtn=()=>screen.getByTestId('ng-swing');
const cells=()=>[...document.querySelectorAll('.ng-cell')];
const cards=()=>[...document.querySelectorAll('.ng-hand .ng-card:not(.basic)')];

const topLevel=sel=>{const out=[];let d=0,cur='';for(const ch of sel){if(ch==='(')d++;if(ch===')')d--;if(ch===','&&!d){out.push(cur);cur='';}else cur+=ch;}out.push(cur);return out;};

describe('V13 NG-1 night-game battle',()=>{
  it('stays off unless the flag is on: the legacy battle is untouched',()=>{
    begin(false);
    expect(document.querySelector('.ng-battle')).toBeNull();
    expect(document.querySelector('.duel-combat')).not.toBeNull();
  });

  it('opens on the scene: nine zones, the hand, two verbs, and nothing to swing yet',()=>{
    begin();
    expect(document.querySelector('.ng-battle')).not.toBeNull();
    expect(document.querySelector('.duel-combat')).toBeNull();
    expect(cells()).toHaveLength(9);
    expect(cards().length).toBeGreaterThan(0);
    expect(swingBtn().disabled).toBe(true);
    expect(screen.getByTestId('ng-take').textContent).toBe('지켜본다');
  });

  it('speaks in short lines, not rules',()=>{
    const s=begin();
    const lines=intentLines(s.battle.intent);
    expect(document.querySelector('.ng-coach').textContent).toBe(lines.coach);
    expect(lines.coach.length).toBeLessThan(30);
  });

  it('card then zone aims the swing through the engine and saves it',()=>{
    begin();
    fireEvent.click(cards()[0]);
    fireEvent.click(cells()[5]);
    expect(readV10Duel(localStorage).battle.aimZone).toBe(5);
    expect(swingBtn().disabled).toBe(false);
    expect(swingBtn().textContent).toContain('바깥쪽');
    expect(cells()[5].classList.contains('aim')).toBe(true);
  });

  it('a second card waits for its own zone and joins as support ②',()=>{
    begin();
    fireEvent.click(cards()[0]);fireEvent.click(cells()[4]);
    fireEvent.click(cards()[1]);
    expect(cards()[1].classList.contains('armed')).toBe(true);
    fireEvent.click(cells()[2]);
    expect(cards()[1].classList.contains('support')).toBe(true);
    expect([...cells()[2].querySelectorAll('.ng-token')].map(t=>t.textContent)).toEqual(['2']);
    expect(readV10Duel(localStorage).battle.aimZone).toBe(4);
    expect(swingBtn().textContent).toContain('외 1장');
  });

  it('tapping the main card again clears the board',()=>{
    begin();
    fireEvent.click(cards()[0]);fireEvent.click(cells()[4]);
    fireEvent.click(cards()[0]);
    expect(swingBtn().disabled).toBe(true);
    expect(document.querySelectorAll('.ng-token')).toHaveLength(0);
  });

  it('swinging plays one pitch; watching plays one pitch',()=>{
    const s=begin();
    fireEvent.click(cards()[0]);fireEvent.click(cells()[4]);
    fireEvent.click(swingBtn());
    expect(readV10Duel(localStorage).stats.pitches).toBe(s.stats.pitches+1);
    cleanup();
    const t=begin();
    fireEvent.click(screen.getByTestId('ng-take'));
    expect(readV10Duel(localStorage).stats.pitches).toBe(t.stats.pitches+1);
  });

  it('keeps every style under .ng-battle',()=>{
    const css=fs.readFileSync(path.resolve('src/duel/nightgame.css'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
    const sels=[...css.matchAll(/([^{}]+)\{[^{}]*\}/g)].map(m=>m[1].trim()).filter(x=>!x.startsWith('@')&&!/^(to|from|\d+%)$/.test(x));
    for(const sel of sels.map(x=>x.replace(/^@media[^{]*\{/,'').trim()))for(const part of topLevel(sel))
      expect(part.trim()).toMatch(/^\.ng-/);
    expect(css).not.toMatch(/(^|[},])\s*(html|body|#root|\.duel-app|\.duel-combat)\b/);
  });
});

describe('V13 night-game copy helpers',()=>{
  it('hp ticks keep one lit while the pitcher stands',()=>{
    expect(hpTicks(72,72)).toBe(12);
    expect(hpTicks(1,124)).toBe(1);
    expect(hpTicks(0,72)).toBe(0);
    expect(hpTicks(36,72)).toBe(6);
  });
  it('unknown intents fall back to the engine words',()=>{
    expect(intentLines({name:'새 패턴',detail:'설명'})).toEqual({whisper:'새 패턴',coach:'설명'});
  });
});
