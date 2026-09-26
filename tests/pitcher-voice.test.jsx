// @vitest-environment happy-dom
import React from 'react';
import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import Duel from '../src/duel/App.jsx';
import {createV10Duel,enterV10Node,saveV10Duel} from '../src/duel/engine.js';
import {pitcherPortraits} from '../src/duel/pitcher-visuals.js';
import {PITCHER_VOICE,pitcherLine,momentOf} from '../src/duel/pitcher-voice.js';

// V13 — pitchers speak in their own voice (user 2026-09-26).
const MOMENTS=['entry','chase','whiff','strikeout','looking','walk','foul','out','hit','extra','homer','knockout'];
beforeEach(()=>{localStorage.clear()});
afterEach(()=>{cleanup();vi.useRealTimers()});

describe('pitcher voice lines',()=>{
  it('every pitcher with art has a line for every moment, short enough for a phone',()=>{
    for(const id of Object.keys(pitcherPortraits)){
      expect(PITCHER_VOICE[id],id).toBeTruthy();
      for(const m of MOMENTS){
        expect(PITCHER_VOICE[id][m]?.length,id+' '+m).toBeGreaterThan(0);
        for(const line of PITCHER_VOICE[id][m])expect(line.length,line).toBeLessThanOrEqual(34);
      }
    }
  });
  it('picks the same line for the same pitch and maps results to moments',()=>{
    expect(pitcherLine('regular-01-red-rush','whiff',3)).toBe(pitcherLine('regular-01-red-rush','whiff',3));
    expect(pitcherLine('unknown','whiff',0)).toBe('');
    expect(momentOf({call:'헛스윙',chased:true})).toBe('chase');
    expect(momentOf({call:'홈런',knockedOut:true})).toBe('knockout');
    expect(momentOf({call:'삼진'})).toBe('strikeout');
    expect(momentOf({call:'볼'})).toBe(null);
  });
  it('she greets the batter on the first pitch and answers the result',()=>{
    vi.useFakeTimers();
    let s=createV10Duel(1);s=enterV10Node(s,'a1-entry');s.battle.pending={zone:9,roll:.5,powerRoll:.5};saveV10Duel(localStorage,s);
    render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'MAIN RUN 이어하기',exact:true}));
    const id=s.v10.opponent.artId;
    expect(PITCHER_VOICE[id].entry).toContain(screen.getByTestId('bp-voice').textContent);
    fireEvent.click(document.querySelector('.bp-card.basic'));fireEvent.click(document.querySelectorAll('.bp-cell')[4]);
    fireEvent.click(screen.getByTestId('bp-swing'));
    act(()=>{vi.advanceTimersByTime(6000)});
    expect(PITCHER_VOICE[id].chase).toContain(screen.getByTestId('bp-voice').textContent);
  });
});
