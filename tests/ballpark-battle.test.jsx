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

// V13 BALLPARK — the ballpark battle screen (docs/design/v13/BALLPARK.md).
beforeEach(()=>{localStorage.clear()});
afterEach(()=>{cleanup()});

function begin(ng=true){
  let s=createV10Duel(1);
  s.build='away';s.deck=BUILDS.away.cards.filter(k=>CARDS[k].type!=='skill').map((kind,i)=>({id:'c'+i,kind}));
  s.nextId=s.deck.length;
  s=enterV10Node(s,'a1-entry');
  saveV10Duel(localStorage,s);
  
  render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'MAIN RUN 이어하기',exact:true}));
  return s;
}
const swingBtn=()=>screen.getByTestId('bp-swing');
const cells=()=>[...document.querySelectorAll('.bp-cell')];
const cards=()=>[...document.querySelectorAll('.bp-hand .bp-card:not(.basic)')];

const topLevel=sel=>{const out=[];let d=0,cur='';for(const ch of sel){if(ch==='(')d++;if(ch===')')d--;if(ch===','&&!d){out.push(cur);cur='';}else cur+=ch;}out.push(cur);return out;};

describe('V13 BALLPARK battle',()=>{
  it('the main run always plays on the ballpark; there is no legacy switch left',()=>{
    localStorage.setItem('9zone-park','0');
    begin();
    expect(document.querySelector('.bp-battle')).not.toBeNull();
    expect(document.querySelector('.duel-combat')).toBeNull();
    const app=fs.readFileSync(path.resolve('src/duel/App.jsx'),'utf8');
    expect(app).not.toMatch(/parkOn|9zone-park/);
  });
  it('opens on the scene: nine zones, the hand, two verbs, and nothing to swing yet',()=>{
    begin();
    expect(document.querySelector('.bp-battle')).not.toBeNull();
    expect(document.querySelector('.duel-combat')).toBeNull();
    expect(cells()).toHaveLength(9);
    expect(cards().length).toBeGreaterThan(0);
    expect(swingBtn().disabled).toBe(true);
    expect(screen.getByTestId('bp-take').textContent).toMatch(/^지켜본다/);
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
      expect(part.trim()).toMatch(/^(\.bp-|:is\(\.bp-battle,\.bp-map,\.bp-stop\))/);
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
    else{expect(document.querySelector('.bp-pitch-mark.outside')).not.toBeNull();expect(document.querySelector('.bp-band.hit')).not.toBeNull();}
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
});

describe('V13 BALLPARK playtest feedback 2026-09-25',()=>{
  afterEach(()=>{vi.useRealTimers()});
  it('cells the pitcher does not use say so instead of a hatch',()=>{
    const s=begin();
    const dead=[0,1,2,3,4,5,6,7,8].filter(z=>!s.battle.intent.repertoire.includes(z));
    for(const z of dead)expect(cells()[z].querySelector('.bp-dead')?.textContent).toBe('안 던짐');
    const css=fs.readFileSync(path.resolve('src/duel/ballpark.css'),'utf8');
    expect(css).not.toMatch(/\.bp-cell\.dead\{[^}]*repeating-linear-gradient/);
  });
  it('a chosen card lights every covered cell and dims the rest',()=>{
    begin();
    const col=cards().find(c=>c.dataset.cardKind&&CARDS[c.dataset.cardKind].shape==='column');
    if(!col)return;
    fireEvent.click(col);fireEvent.click(cells()[4]);
    expect([1,4,7].every(z=>cells()[z].classList.contains('cover'))).toBe(true);
    expect(document.querySelector('.bp-zone').classList.contains('has-cover')).toBe(true);
  });
  it('balls have a place: a band around the zone, and the watch button says the ball chance',()=>{
    begin();
    expect(document.querySelector('.bp-zone .bp-band em').textContent).toBe('바깥 띠 = 볼');
    expect(screen.getByTestId('bp-take').textContent).toMatch(/^지켜본다볼일 확률 \d+%$/);
  });
  it('the verdict leads with the baseball call',()=>{
    vi.useFakeTimers();
    begin();
    fireEvent.click(cards()[0]);fireEvent.click(cells()[4]);fireEvent.click(swingBtn());
    act(()=>{vi.advanceTimersByTime(6000)});
    const call=document.querySelector('.bp-verdict strong').textContent;
    expect(['안타','장타','홈런','만루 홈런','헛스윙','스트라이크','파울','볼','볼넷','아웃','희생타','삼진']).toContain(call);
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
