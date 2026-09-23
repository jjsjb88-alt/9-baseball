// @vitest-environment happy-dom
import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ZoneLinks,{linkSummary,linkGeometry} from '../src/duel/ZoneLinks.jsx';
import Duel from '../src/duel/App.jsx';
import {createV10Duel,enterV10Node,saveV10Duel,v11StackPlan} from '../src/duel/engine.js';
import {CARDS,ZONES} from '../src/duel/cards.js';

// V12 P3-2 — order links on the 9ZONE (C2): one link per stackPlan.links entry, connected or not as the
// engine says — never from touching corners or overlapping cover. Same-zone links stay visible.
beforeEach(()=>{localStorage.clear()});
afterEach(()=>{cleanup()});

const links=[
  {fromOrder:1,toOrder:2,fromZone:2,toZone:5,connected:true},
  {fromOrder:2,toOrder:3,fromZone:5,toZone:0,connected:false},
  {fromOrder:3,toOrder:4,fromZone:0,toZone:0,connected:true},
];

describe('V12 P3-2 link data',()=>{
  it('summarises each link in order with the engine verdict',()=>{
    expect(linkSummary(links)).toBe('순서 연결 · ①→② 연결 · ②→③ 끊김 · ③→④ 같은 존 연결');
    expect(linkSummary([])).toBe('');
  });
  it('places lines between cell centres, a gap on broken links and a ring for the same zone',()=>{
    const centres=Array.from({length:9},(_,z)=>({x:(z%3)*100+50,y:Math.floor(z/3)*100+50}));
    const g=linkGeometry(links,centres);
    expect(g[0]).toMatchObject({kind:'line',connected:true,x1:250,y1:50,x2:250,y2:150});
    expect(g[1].kind).toBe('gap');expect(g[1].parts).toHaveLength(2);
    const [a,b]=g[1].parts;expect(a.x1).toBe(250);expect(b.x2).toBe(50);
    expect(Math.hypot(b.x1-a.x2,b.y1-a.y2)).toBeGreaterThan(10);
    expect(g[2]).toMatchObject({kind:'ring',cx:50,cy:50});
  });
  it('follows the engine: a diagonal neighbour is connected, a far zone is not',()=>{
    const s=createV10Duel(1);s.deck=[{id:'a',kind:'strike'},{id:'b',kind:'place'},{id:'c',kind:'place'}];
    s.battle={aimZone:0,hand:['a','b','c']};
    const plan=v11StackPlan(s,'a',[{id:'b',aimZone:4},{id:'c',aimZone:8}]);
    expect(plan.links.map(l=>l.connected)).toEqual([true,true]);
    const far=v11StackPlan(s,'a',[{id:'b',aimZone:2}]);
    expect(far.links[0].connected).toBe(false);
  });
});

describe('V12 P3-2 ZoneLinks',()=>{
  it('draws one mark per link, hidden from assistive tech, with a text summary',()=>{
    render(<div className="zone-grid"><ZoneLinks links={links}/></div>);
    const svg=document.querySelector('svg.zone-links');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.querySelectorAll('[data-link]')).toHaveLength(3);
    expect([...svg.querySelectorAll('[data-link]')].map(e=>e.dataset.connected)).toEqual(['1','0','1']);
    expect(document.querySelector('.zone-links-summary').textContent).toBe(linkSummary(links));
  });
  it('renders nothing without links',()=>{
    const {container}=render(<ZoneLinks links={[]}/>);
    expect(container.innerHTML).toBe('');
  });
});

describe('V12 P3-2 on the battle board',()=>{
  it('shows the stack links from the engine plan',()=>{
    let s=createV10Duel(1);
    s.build='away';s.deck=['strike','place','place','place','strike','place','place','place'].map((kind,i)=>({id:'c'+i,kind}));s.nextId=s.deck.length;
    s=enterV10Node(s,'a1-entry');saveV10Duel(localStorage,s);
    render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'MAIN RUN 이어하기',exact:true}));
    fireEvent.click(screen.getByRole('button',{name:'스윙하기',exact:true}));
    fireEvent.click(screen.getAllByRole('button',{name:CARDS.strike.name,exact:true})[0]);
    fireEvent.click(screen.getByRole('button',{name:ZONES[2],exact:true}));
    expect(document.querySelector('.zone-grid svg.zone-links')).toBeNull();
    fireEvent.click([...document.querySelectorAll('.stack-candidates > button')].find(b=>!b.disabled));
    const marks=[...document.querySelectorAll('.zone-grid svg.zone-links [data-link]')];
    expect(marks).toHaveLength(1);
    expect(marks[0].dataset.connected).toBe('1');
    expect(document.querySelector('.zone-links-summary').textContent).toBe('순서 연결 · ①→② 같은 존 연결');
  });
});

describe('V12 P3-2 link styles',()=>{
  const css=fs.readFileSync(path.resolve(process.cwd(),'src/duel/zone-links.css'),'utf8');
  it('never takes the pointer and tells connected from broken by line, not only colour',()=>{
    expect(css).toMatch(/\.zone-links\{[^}]*pointer-events:none/);
    expect(css).toMatch(/\[data-connected="0"\][^{]*\{[^}]*stroke-dasharray/);
  });
});
