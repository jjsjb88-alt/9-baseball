// @vitest-environment happy-dom
import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import Duel from '../src/duel/App.jsx';
import {createV10Duel,saveV10Duel,readV10Duel,selectV10Map} from '../src/duel/engine.js';

// V13 BALLPARK BP-3 — the run map as silhouettes (docs/design/v13/BALLPARK.md).
beforeEach(()=>{localStorage.clear()});
afterEach(()=>{cleanup()});

function open(park=true){
  const s=createV10Duel(7);saveV10Duel(localStorage,s);
  
  render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'MAIN RUN 이어하기',exact:true}));
  return s;
}
const go=()=>screen.getByTestId('bp-map-go');

describe('V13 BALLPARK map',()=>{
  it('shows the current act only, the reachable node lit and chosen',()=>{
    const s=open(),m=selectV10Map(s);
    const act1=m.nodes.filter(n=>n.act===1);
    expect(document.querySelectorAll('.bp-node')).toHaveLength(act1.length);
    const lit=[...document.querySelectorAll('.bp-node.reach')].map(n=>n.dataset.node);
    expect(lit).toEqual(m.reachableIds);
    expect(document.querySelector('.bp-node.sel').dataset.node).toBe(m.reachableIds[0]);
    expect(go().disabled).toBe(false);
  });
  it('a node you cannot reach yet can be looked at, not entered',()=>{
    open();
    fireEvent.click(document.querySelector('.bp-node.boss'));
    expect(document.querySelector('.bp-mname').textContent.length).toBeGreaterThan(0);
    expect(go().disabled).toBe(true);
    expect(go().textContent).toBe('아직 길이 없다');
  });
  it('entering goes through the engine into the ballpark battle',()=>{
    open();
    fireEvent.click(go());
    expect(readV10Duel(localStorage).phase).toBe('battle');
    expect(document.querySelector('.bp-battle')).not.toBeNull();
  });
  it('the map CSS stays under .bp-map and the battle grid areas do not leak into it',()=>{
    const css=fs.readFileSync(path.resolve('src/duel/ballpark.css'),'utf8');
    expect(css).toMatch(/\.bp-battle>\.bp-bar\{grid-area:bar\}/);
    expect(css).not.toMatch(/(^|[;{}\s])\.bp-bar\{grid-area/);
  });
});
