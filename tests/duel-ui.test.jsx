// @vitest-environment happy-dom
import React from 'react';
import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import Duel from '../src/duel/App.jsx';
import {createDuel,readDuel,saveDuel} from '../src/duel/engine.js';
import {planTurn} from '../src/duel/policy.js';
import {CARDS} from '../src/duel/cards.js';
beforeEach(()=>{localStorage.clear();vi.useFakeTimers()});afterEach(()=>{cleanup();vi.useRealTimers()});
const finish=()=>act(()=>vi.runAllTimers());
function clickCard(kind){fireEvent.click(screen.getAllByRole('button',{name:CARDS[kind].name,exact:true})[0]);fireEvent.click(screen.getByRole('button',{name:'카드 사용'}));finish();}
function begin(){saveDuel(localStorage,createDuel(1));render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'이어하기'}));fireEvent.click(screen.getByRole('button',{name:'승부 시작'}));}
describe('named batter entry and plate appearance gate',()=>{
  it('shows a named runner, removes attack controls, and explicitly introduces number two',()=>{
    begin();clickCard('setup');clickCard('slug');expect(screen.getByLabelText('베이스 주자').textContent).toContain('강한결');expect(screen.getByText('1번 강한결 · 타석 종료')).toBeTruthy();expect(screen.queryByRole('button',{name:'밀어치기',exact:true})).toBeNull();expect(screen.getByRole('button',{name:/한 구 지켜보기/}).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button',{name:'다음 타자 입장 · 2번 이민준'}));expect(readDuel(localStorage).battle.batterIndex).toBe(1);expect(screen.getByText('2번 이민준 타석 입장')).toBeTruthy();
  });
  it('reload at the result does not skip the batter-entry gate',()=>{
    begin();clickCard('strike');const saved=readDuel(localStorage);cleanup();render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'이어하기'}));expect(readDuel(localStorage)).toEqual(saved);expect(screen.getByRole('button',{name:'다음 타자 입장 · 2번 이민준'})).toBeTruthy();expect(screen.queryByRole('button',{name:'카드 사용'})).toBeNull();
  });
  it('plays a complete run through real result confirmation buttons',()=>{
    begin();let guard=0;while(guard++<200){const s=readDuel(localStorage);if(['won','lost'].includes(s.phase))break;if(s.phase==='map')fireEvent.click(screen.getByRole('button',{name:'승부 시작'}));else if(s.phase==='between')fireEvent.click(screen.getByRole('button',{name:/다음 타자 입장/}));else if(s.phase==='reward'){const kind=['flow','lure','finisher'][s.stage];fireEvent.click(screen.getByRole('button',{name:CARDS[kind].name,exact:true}));fireEvent.click(screen.getByRole('button',{name:'선택한 카드 획득'}));}else {const id=planTurn(s)[0];if(id)clickCard(s.deck.find(c=>c.id===id).kind);else {fireEvent.click(screen.getByRole('button',{name:/한 구 지켜보기/}));finish();}}}
    expect(readDuel(localStorage).phase).toBe('won');expect(screen.getByText('타순을 연결해, 경기를 뒤집었다.')).toBeTruthy();
  });
  it('duplicate clicks during resolution cannot consume another pitch',()=>{
    begin();fireEvent.click(screen.getByRole('button',{name:/한 구 지켜보기/}));fireEvent.click(screen.getByRole('button',{name:/한 구 지켜보기/}));expect(readDuel(localStorage).stats.pitches).toBe(1);finish();
  });
});
