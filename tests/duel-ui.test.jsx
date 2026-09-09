// @vitest-environment happy-dom
import React from 'react';
import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import Duel from '../src/duel/App.jsx';
import {createDuel,readDuel,saveDuel} from '../src/duel/engine.js';
import {planTurn} from '../src/duel/policy.js';
import {CARDS} from '../src/duel/cards.js';

beforeEach(()=>{localStorage.clear();vi.useFakeTimers()});
afterEach(()=>{cleanup();vi.useRealTimers()});
const finish=()=>act(()=>vi.runAllTimers());
function dismissTour(){const skip=screen.queryByRole('button',{name:'건너뛰기'});if(skip)fireEvent.click(skip);}
function clickCard(kind){
  if(!screen.queryByRole('button',{name:CARDS[kind].name,exact:true})){
    fireEvent.click(screen.getByRole('button',{name:CARDS[kind].type==='skill'?'준비하기':'스윙하기'}));
  }
  fireEvent.click(screen.getAllByRole('button',{name:CARDS[kind].name,exact:true})[0]);
  fireEvent.click(screen.getByRole('button',{name:'카드 사용'}));
  finish();
}
function begin(){saveDuel(localStorage,createDuel(1));render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'이어하기'}));fireEvent.click(screen.getByRole('button',{name:'승부 시작'}));dismissTour();}

describe('named batter entry and plate appearance gate',()=>{
  it('shows a welcome guide on the first battle and remembers dismissal',()=>{
    saveDuel(localStorage,createDuel(1));render(<Duel/>);
    fireEvent.click(screen.getByRole('button',{name:'이어하기'}));
    fireEvent.click(screen.getByRole('button',{name:'승부 시작'}));
    expect(screen.getByRole('dialog',{name:'온보딩 가이드'})).toBeTruthy();
    expect(screen.getByText('먼저 전광판을 봅니다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'다음 설명'}));
    expect(screen.getByText('가운데는 투수와 주자 상황입니다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'다음 설명'}));
    expect(screen.getByText('행동은 세 가지만 기억하면 됩니다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'다음 설명'}));
    expect(screen.getByText('마지막은 결과 확인과 다음 타자입니다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'바로 플레이 시작'}));
    expect(screen.getByRole('button',{name:'준비하기'})).toBeTruthy();
    cleanup();render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'이어하기'}));
    expect(screen.queryByRole('dialog',{name:'온보딩 가이드'})).toBeNull();
  });

  it('reveals cards only after the player picks prepare or swing',()=>{
    begin();
    expect(screen.queryByRole('button',{name:'타이밍 맞추기',exact:true})).toBeNull();
    expect(screen.queryByRole('button',{name:'담장 넘기기',exact:true})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'준비하기'}));
    expect(screen.getByRole('button',{name:'타이밍 맞추기',exact:true})).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'← 상황으로'}));
    fireEvent.click(screen.getByRole('button',{name:'스윙하기'}));
    expect(screen.getByRole('button',{name:'담장 넘기기',exact:true})).toBeTruthy();
  });

  it('shows a named runner, removes attack controls, and explicitly introduces number two',()=>{
    begin();clickCard('setup');clickCard('slug');expect(screen.getByLabelText('베이스 주자').textContent).toContain('강한결');expect(screen.getByText('1번 강한결 · 타석 종료')).toBeTruthy();expect(screen.queryByRole('button',{name:'담장 넘기기',exact:true})).toBeNull();expect(screen.queryByRole('button',{name:'카드 사용'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'다음 타자 입장 · 2번 이민준'}));expect(readDuel(localStorage).battle.batterIndex).toBe(1);expect(screen.getByText('2번 이민준 타석 입장')).toBeTruthy();expect(screen.getByRole('button',{name:'준비하기'})).toBeTruthy();
  });

  it('reload at the result does not skip the batter-entry gate',()=>{
    begin();clickCard('strike');const saved=readDuel(localStorage);cleanup();render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'이어하기'}));expect(readDuel(localStorage)).toEqual(saved);expect(screen.getByRole('button',{name:'다음 타자 입장 · 2번 이민준'})).toBeTruthy();expect(screen.queryByRole('button',{name:'카드 사용'})).toBeNull();
  });

  it('plays a complete run through real result confirmation buttons',()=>{
    begin();let guard=0;while(guard++<200){const s=readDuel(localStorage);if(['won','lost'].includes(s.phase))break;if(s.phase==='map'){fireEvent.click(screen.getByRole('button',{name:'승부 시작'}));dismissTour();}else if(s.phase==='between')fireEvent.click(screen.getByRole('button',{name:/다음 타자 입장/}));else if(s.phase==='reward'){const kind=['flow','lure','finisher'][s.stage];fireEvent.click(screen.getByRole('button',{name:CARDS[kind].name,exact:true}));fireEvent.click(screen.getByRole('button',{name:'선택한 카드 획득'}));}else {const id=planTurn(s)[0];if(id)clickCard(s.deck.find(c=>c.id===id).kind);else {fireEvent.click(screen.getByRole('button',{name:'한 구 지켜보기'}));finish();}}}
    expect(readDuel(localStorage).phase).toBe('won');expect(screen.getByText('타순을 연결해, 경기를 뒤집었다.')).toBeTruthy();
  });

  it('duplicate clicks during resolution cannot consume another pitch',()=>{
    begin();fireEvent.click(screen.getByRole('button',{name:'한 구 지켜보기'}));fireEvent.click(screen.getByRole('button',{name:'한 구 지켜보기'}));expect(readDuel(localStorage).stats.pitches).toBe(1);finish();
  });
});
