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
describe('HOMEBOUND interface',()=>{
  it('shows the strong card on second, then pinches it back into the hand',()=>{
    begin();clickCard('setup');clickCard('slug');expect(readDuel(localStorage).battle.bases[1]).toBe('c1');expect(screen.getByLabelText('베이스에 묶인 카드').textContent).toContain('담장 넘기기');clickCard('calm');expect(readDuel(localStorage).battle.hand).toContain('c1');expect(readDuel(localStorage).battle.bases[1]).toBe('c4');
  });
  it('plays four innings and three rewards with actual React clicks',()=>{
    begin();let guard=0;while(guard++<160){const s=readDuel(localStorage);if(['won','lost'].includes(s.phase))break;
      if(s.phase==='map')fireEvent.click(screen.getByRole('button',{name:'승부 시작'}));
      else if(s.phase==='reward'){const kind=['flow','lure','finisher'][s.stage];fireEvent.click(screen.getByRole('button',{name:CARDS[kind].name,exact:true}));fireEvent.click(screen.getByRole('button',{name:'선택한 카드 획득'}));}
      else {const id=planTurn(s)[0];if(id)clickCard(s.deck.find(c=>c.id===id).kind);else {fireEvent.click(screen.getByRole('button',{name:/한 구 지켜보기/}));finish();}}
    }
    expect(readDuel(localStorage).phase).toBe('won');expect(screen.getByText('덱이 한 바퀴, 경기가 뒤집혔다.')).toBeTruthy();
  });
  it('locks repeated input and resumes a saved count',()=>{
    begin();fireEvent.click(screen.getByRole('button',{name:/한 구 지켜보기/}));fireEvent.click(screen.getByRole('button',{name:/한 구 지켜보기/}));expect(readDuel(localStorage).battle.strikes).toBe(1);finish();const saved=readDuel(localStorage);cleanup();render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'이어하기'}));expect(readDuel(localStorage)).toEqual(saved);
  });
  it('asks before replacing a run and explains the card circuit',()=>{
    saveDuel(localStorage,createDuel(1));render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'새 런 시작'}));expect(screen.getByText('진행 중인 런을 새로 시작할까요?')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'닫기'}));fireEvent.click(screen.getByRole('button',{name:'규칙'}));expect(screen.getByText('베이스에 묶인 카드가 다음 선택을 바꾼다.')).toBeTruthy();
  });
});
