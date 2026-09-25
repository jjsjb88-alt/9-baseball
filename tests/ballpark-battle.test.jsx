// @vitest-environment happy-dom
import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {act} from 'react';
import fs from 'node:fs';
import path from 'node:path';
import Duel from '../src/duel/App.jsx';
import {createV10Duel,enterV10Node,saveV10Duel,readV10Duel} from '../src/duel/engine.js';
import {BUILDS,CARDS,LINEUP} from '../src/duel/cards.js';
import {intentLines,hpTicks} from '../src/duel/ballpark-copy.js';

// V13 BALLPARK — the ballpark battle screen (docs/design/v13/BALLPARK.md), opt-in with ?park=1.
beforeEach(()=>{localStorage.clear()});
afterEach(()=>{cleanup()});

function begin(ng=true){
  let s=createV10Duel(1);
  s.build='away';s.deck=BUILDS.away.cards.filter(k=>CARDS[k].type!=='skill').map((kind,i)=>({id:'c'+i,kind}));
  s.nextId=s.deck.length;
  s=enterV10Node(s,'a1-entry');
  saveV10Duel(localStorage,s);
  if(ng)localStorage.setItem('9zone-park','1');
  render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'MAIN RUN 이어하기',exact:true}));
  return s;
}
const swingBtn=()=>screen.getByTestId('bp-swing');
const cells=()=>[...document.querySelectorAll('.bp-cell')];
const cards=()=>[...document.querySelectorAll('.bp-hand .bp-card:not(.basic)')];

const topLevel=sel=>{const out=[];let d=0,cur='';for(const ch of sel){if(ch==='(')d++;if(ch===')')d--;if(ch===','&&!d){out.push(cur);cur='';}else cur+=ch;}out.push(cur);return out;};

describe('V13 BALLPARK battle',()=>{
  it('stays off unless the flag is on: the legacy battle is untouched',()=>{
    begin(false);
    expect(document.querySelector('.bp-battle')).toBeNull();
    expect(document.querySelector('.duel-combat')).not.toBeNull();
  });

  it('opens on the scene: nine zones, the hand, two verbs, and nothing to swing yet',()=>{
    begin();
    expect(document.querySelector('.bp-battle')).not.toBeNull();
    expect(document.querySelector('.duel-combat')).toBeNull();
    expect(cells()).toHaveLength(9);
    expect(cards().length).toBeGreaterThan(0);
    expect(swingBtn().disabled).toBe(true);
    expect(screen.getByTestId('bp-take').textContent).toBe('지켜본다');
  });

  it('speaks in short lines, not rules',()=>{
    const s=begin();
    const lines=intentLines(s.battle.intent);
    expect(document.querySelector('.bp-coach').textContent).toBe(lines.coach);
    expect(lines.coach.length).toBeLessThan(30);
  });

  it('card then zone aims the swing through the engine and saves it',()=>{
    begin();
    fireEvent.click(cards()[0]);
    fireEvent.click(cells()[5]);
    expect(readV10Duel(localStorage).battle.aimZone).toBe(5);
    expect(swingBtn().disabled).toBe(false);
    expect(swingBtn().textContent).toMatch(/^휘두른다피해 ×/);
    expect(cells()[5].classList.contains('aim')).toBe(true);
  });

  it('a second card waits for its own zone and joins as support ②',()=>{
    begin();
    fireEvent.click(cards()[0]);fireEvent.click(cells()[4]);
    fireEvent.click(cards()[1]);
    expect(cards()[1].classList.contains('armed')).toBe(true);
    fireEvent.click(cells()[2]);
    expect(cards()[1].classList.contains('support')).toBe(true);
    expect([...cells()[2].querySelectorAll('.bp-token')].map(t=>t.textContent)).toEqual(['2']);
    expect(readV10Duel(localStorage).battle.aimZone).toBe(4);
    expect(swingBtn().textContent).toMatch(/피해 ×0\.\d/);
  });

  it('tapping the main card again clears the board',()=>{
    begin();
    fireEvent.click(cards()[0]);fireEvent.click(cells()[4]);
    fireEvent.click(cards()[0]);
    expect(swingBtn().disabled).toBe(true);
    expect(document.querySelectorAll('.bp-token')).toHaveLength(0);
  });

  it('swinging plays one pitch; watching plays one pitch',()=>{
    const s=begin();
    fireEvent.click(cards()[0]);fireEvent.click(cells()[4]);
    fireEvent.click(swingBtn());
    expect(readV10Duel(localStorage).stats.pitches).toBe(s.stats.pitches+1);
    cleanup();
    const t=begin();
    fireEvent.click(screen.getByTestId('bp-take'));
    expect(readV10Duel(localStorage).stats.pitches).toBe(t.stats.pitches+1);
  });

  it('keeps every style under the ballpark screens (.bp-*)',()=>{
    const css=fs.readFileSync(path.resolve('src/duel/ballpark.css'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
    const sels=[...css.matchAll(/([^{}]+)\{[^{}]*\}/g)].map(m=>m[1].trim()).filter(x=>!x.startsWith('@')&&!/^(to|from|\d+%)$/.test(x));
    for(const sel of sels.map(x=>x.replace(/^@media[^{]*\{/,'').trim()))for(const part of topLevel(sel))
      expect(part.trim()).toMatch(/^(\.bp-|:is\(\.bp-battle,\.bp-map\))/);
    expect(css).not.toMatch(/(^|[},])\s*(html|body|#root|\.duel-app|\.duel-combat)\b/);
  });
});

describe('V13 BALLPARK lean text',()=>{
  it('shows no batter name, no whisper, no restated coverage; the pitcher keeps his name',()=>{
    const s=begin();
    const text=document.querySelector('.bp-battle').textContent;
    for(const p of LINEUP)expect(text).not.toContain(p.name);
    expect(document.querySelector('.bp-whisper')).toBeNull();
    expect(document.querySelector('.bp-ptag').textContent).toContain(s.pitcher.name);
    for(const span of document.querySelectorAll('.bp-card span'))expect(span.textContent).not.toMatch(/커버$/);
    expect(swingBtn().textContent).toBe('휘두른다');
  });
});

describe('V13 BALLPARK BP-2 pitch in the scene',()=>{
  afterEach(()=>{vi.useRealTimers()});
  it('plays the pitch on the same screen: verdict word, the real ball on the zone, one button on',()=>{
    vi.useFakeTimers();
    begin();
    fireEvent.click(cards()[0]);fireEvent.click(cells()[4]);
    fireEvent.click(swingBtn());
    expect(document.querySelector('.bp-battle')).not.toBeNull();
    act(()=>{vi.advanceTimersByTime(6000)});
    expect(document.querySelector('.duel-combat')).toBeNull();
    const s=readV10Duel(localStorage),r=s.battle.revealed;
    expect(document.querySelector('.bp-verdict strong').textContent.length).toBeGreaterThan(0);
    if(r.zone<9)expect(cells()[r.zone].classList.contains('actual')).toBe(true);
    else expect(document.querySelector('.bp-ball.actual')).not.toBeNull();
    const next=screen.getByTestId('bp-next');
    expect(['다음 공','다음 타자']).toContain(next.textContent);
    expect(next.disabled).toBe(false);
    expect(document.querySelector('[data-testid=bp-swing]')).toBeNull();
    fireEvent.click(next);
    act(()=>{vi.advanceTimersByTime(100)});
    if(readV10Duel(localStorage).phase==='battle'){
      expect(swingBtn()).not.toBeNull();
      expect(document.querySelector('.bp-verdict')).toBeNull();
    }
  });
  it('remembers the first flag name',()=>{
    localStorage.setItem('9zone-ng','1');
    let s=createV10Duel(1);s=enterV10Node(s,'a1-entry');saveV10Duel(localStorage,s);
    render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'MAIN RUN 이어하기',exact:true}));
    expect(document.querySelector('.bp-battle')).not.toBeNull();
    expect(localStorage.getItem('9zone-park')).toBe('1');
  });
});

describe('V13 ballpark copy helpers',()=>{
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
