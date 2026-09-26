// @vitest-environment happy-dom
import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect} from 'vitest';
import Duel from '../src/duel/App.jsx';
import {createV10Duel,enterV10Node,saveV10Duel} from '../src/duel/engine.js';

// 흔들림 게이지 + 주자 압박 칩 (투수 HP 태그 안).
beforeEach(()=>{localStorage.clear()});
afterEach(()=>{cleanup()});
const clone=x=>JSON.parse(JSON.stringify(x));
function open({act=1,shaken,bases=[null,null,null]}={}){
  let s=createV10Duel(1);s=clone(enterV10Node(s,'a1-entry'));
  s.v10.opponent.act=act;s.battle.bases=bases;if(shaken!==undefined)s.battle.shaken=shaken;
  saveV10Duel(localStorage,s);
  render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'MAIN RUN 이어하기',exact:true}));
}
const gauge=()=>screen.getByTestId('bp-mental');

describe('ballpark mental HUD',()=>{
  it('calm pitcher: empty pips, one per act cap',()=>{
    open();
    expect(gauge().dataset.shaken).toBe('0');expect(gauge().dataset.cap).toBe('3');
    expect(gauge().querySelectorAll('i').length).toBe(3);
    expect(gauge().querySelectorAll('i.on').length).toBe(0);
    expect(screen.queryByTestId('bp-press')).toBeNull();
  });
  it('shaken pitcher lights pips and says what it does',()=>{
    open({act:2,shaken:1});
    expect(gauge().querySelectorAll('i').length).toBe(2);
    expect(gauge().querySelectorAll('i.on').length).toBe(1);
    expect(gauge().getAttribute('aria-label')).toContain('읽기 +1');
  });
  it('act 3 shows a single pip and clamps stored values',()=>{
    open({act:3,shaken:3});
    expect(gauge().querySelectorAll('i').length).toBe(1);
    expect(gauge().dataset.shaken).toBe('1');
  });
  it('runners on base show the hit damage bonus',()=>{
    open({bases:['p5',null,'p6']});
    expect(screen.getByTestId('bp-press').textContent).toContain('+20%');
  });
});
