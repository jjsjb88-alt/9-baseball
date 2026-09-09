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
describe('DUGOUT interface',()=>{
  it('plays all four fights and three rewards using the same engine through clicks',()=>{
    saveDuel(localStorage,createDuel(42));render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'이어하기'}));let guard=0;
    while(guard++<200){let s=readDuel(localStorage);if(['won','lost'].includes(s.phase))break;
      if(s.phase==='map')fireEvent.click(screen.getByRole('button',{name:'승부 시작'}));
      else if(s.phase==='reward'){
        fireEvent.click(screen.getByRole('button',{name:CARDS[['lure','scout','slug'][s.stage]].name,exact:true}));
        fireEvent.click(screen.getByRole('button',{name:'선택한 카드 획득'}));
      }else{
        const path=planTurn(s);
        for(const id of path){s=readDuel(localStorage);const name=CARDS[s.deck.find(c=>c.id===id).kind].name;
          fireEvent.click(screen.getAllByRole('button',{name,exact:true})[0]);fireEvent.click(screen.getByRole('button',{name:'카드 사용'}));finish();
        }
        if(readDuel(localStorage).phase==='battle'){fireEvent.click(screen.getByRole('button',{name:/턴 종료/}));finish();}
      }
    }
    expect(readDuel(localStorage).phase).toBe('won');expect(screen.getByText('이 승부는 네가 만들었다.')).toBeTruthy();
  });
  it('locks duplicate actions during effects and restores a resolved save',()=>{
    saveDuel(localStorage,createDuel(42));const view=render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'이어하기'}));fireEvent.click(screen.getByRole('button',{name:'승부 시작'}));
    fireEvent.click(screen.getByRole('button',{name:/턴 종료/}));fireEvent.click(screen.getByRole('button',{name:/턴 종료/}));expect(readDuel(localStorage).stats.turns).toBe(1);finish();
    const saved=readDuel(localStorage);view.unmount();render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'이어하기'}));expect(readDuel(localStorage)).toEqual(saved);expect(screen.getByText('몸쪽 직구')).toBeTruthy();
  });
  it('offers help and never silently overwrites an existing run',()=>{
    saveDuel(localStorage,createDuel(42));render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'새 런 시작'}));expect(screen.getByText('진행 중인 런을 새로 시작할까요?')).toBeTruthy();expect(readDuel(localStorage).seed).toBe(42);
    fireEvent.click(screen.getByRole('button',{name:'닫기'}));fireEvent.click(screen.getByRole('button',{name:'플레이 방법'}));expect(screen.getByText('코스를 찍는 게임이 아닙니다.')).toBeTruthy();
  });
});
