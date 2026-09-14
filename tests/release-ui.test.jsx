// @vitest-environment happy-dom
import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import Duel from '../src/duel/App.jsx';
import {createDuel,startBattle,playCard,saveDuel,readDuel} from '../src/duel/engine.js';
beforeEach(()=>{localStorage.clear();localStorage.setItem('9zone-zones-tour-v5','done');vi.useFakeTimers();});
afterEach(()=>{cleanup();vi.useRealTimers();});
function loadReward(){let s=startBattle(createDuel(1));s.battle.runs=1;s.battle.bases[2]='p8';s.battle.pending={zone:5,roll:.5,powerRoll:.99};s=playCard(s,'c0');saveDuel(localStorage,s);render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'이어하기'}));return s;}
it.each([['카드 추가','주자 연결','add'],['카드 제거','밀어치기','remove'],['카드 강화','희생 번트','upgrade'],['유물 획득','낡은 망원경','relic'],['덱 그대로',null,'skip']])('commits %s through actual controls and restores it', (action,target,type)=>{
  const before=loadReward();
  expect(screen.getByRole('region',{name:'다음 상대 리포트'}).textContent).toContain('낮게 가라앉는 공');
  expect(screen.getByText(/현재 덱 · 12장/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'다음 타자를 믿는다',exact:true}));
  fireEvent.click(screen.getByRole('button',{name:action,exact:true}));
  if(target)fireEvent.click(screen.getAllByRole('button',{name:target,exact:true})[0]);
  const confirm=screen.getByRole('button',{name:/이 덱으로 확정/});
  expect(confirm.disabled).toBe(false);fireEvent.click(confirm);fireEvent.click(confirm);
  const s=readDuel(localStorage);expect(s.phase).toBe('map');expect(s.stage).toBe(1);expect(s.rewards[0].type).toBe(type);expect(s.growth.relay).toBe(1);
  expect(s.deck.length).toBe(before.deck.length+(type==='add'?1:type==='remove'?-1:0));
  if(type==='relic')expect(s.relics).toEqual(['scope']);
  if(type==='upgrade')expect(s.deck.find(c=>c.kind==='bunt').plus).toBe(true);
  cleanup();render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'이어하기'}));expect(screen.getByText(/내가 만든 덱 · 지난 선택/)).toBeTruthy();
});
it('watch selection does not consume a pitch and explicit execution does',()=>{
 const s=startBattle(createDuel(1));saveDuel(localStorage,s);render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'이어하기'}));
 fireEvent.click(screen.getByRole('button',{name:'한 구 지켜보기',exact:true}));expect(readDuel(localStorage)).toEqual(s);
 fireEvent.click(screen.getByRole('button',{name:'지켜보기 · 공 진행'}));expect(readDuel(localStorage).stats.pitches).toBe(1);
});
it('keeps batter and impact animation keys distinct on the first hit',()=>{
 const error=vi.spyOn(console,'error').mockImplementation(()=>{});
 try{
  const s=startBattle(createDuel(1));s.battle.pending={zone:5,roll:.5,powerRoll:.99};saveDuel(localStorage,s);render(<Duel/>);
  fireEvent.click(screen.getByRole('button',{name:'이어하기'}));fireEvent.click(screen.getByRole('button',{name:'스윙하기',exact:true}));
  fireEvent.click(screen.getByRole('button',{name:'밀어치기',exact:true}));fireEvent.click(screen.getByTestId('execute-action'));
  expect(readDuel(localStorage).stats.hits).toBe(1);
  expect(error.mock.calls.some(args=>args.join(' ').includes('same key'))).toBe(false);
 }finally{error.mockRestore();}
});
