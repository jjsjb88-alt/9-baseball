// @vitest-environment happy-dom
import React from 'react';
import {afterEach,describe,it,expect} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import Duel from '../src/duel/App.jsx';

describe('strategy to autobattle tutorial',()=>{
  afterEach(()=>{cleanup();localStorage.clear();});
  it('enters the real V10 ballpark immediately and does not replace the main save',()=>{
    render(<Duel/>);
    fireEvent.click(screen.getByRole('button',{name:'전략 → 자동전투 체험'}));
    expect(screen.getByTestId('bp-auto-lesson')).toBeTruthy();
    expect(screen.getByText('BUILD → BATTLE')).toBeTruthy();
    expect(screen.getByText('설계')).toBeTruthy();
    // The sandbox intentionally starts unsaved; actual V10 actions also bypass persistence while active.
    expect(localStorage.length).toBe(0);
  });
  it('can leave the experiment and return to the title without touching the run',()=>{
    render(<Duel/>);
    fireEvent.click(screen.getByRole('button',{name:'전략 → 자동전투 체험'}));
    fireEvent.click(screen.getByRole('button',{name:'체험 종료'}));
    expect(screen.getByRole('button',{name:'MAIN RUN 시작 · 투수 HP'})).toBeTruthy();
    expect(screen.queryByTestId('bp-auto-lesson')).toBeNull();
  });
});
