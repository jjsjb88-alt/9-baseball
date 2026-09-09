/** @vitest-environment happy-dom */
import React from 'react';
import {render,screen,fireEvent,act,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import LastLight from '../src/reboot/App.jsx';
import {newRun,readRun,serializeRun} from '../src/reboot/engine.js';
import {publicView,policyAction} from '../src/reboot/policy.js';
import {ZONES,CARDS,SAVE_KEY} from '../src/reboot/data.js';
vi.mock('../src/reboot/audio.js',()=>({playCue:vi.fn()}));
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();window.localStorage.clear();});
const click=name=>fireEvent.click(screen.getByRole('button',{name}));
const tick=async()=>{await act(async()=>{await vi.advanceTimersByTimeAsync(1800);});};
const saved=()=>readRun(window.localStorage);

it('plays a complete seeded three-opponent run through the UI without reading hidden intent',async()=>{
  vi.useFakeTimers();window.localStorage.setItem(SAVE_KEY,serializeRun(newRun(1118527)));
  let view=render(<LastLight/>);click(/이어하기/);let resumed=false,steps=0;
  while(saved().phase!=='finished'&&steps++<1000){
    const s=saved();
    if(s.phase==='brief')click(/플레이 볼/);
    else if(s.phase==='pitch'){
      const action=policyAction(publicView(s));
      if(action.take)click(/지켜보기/);
      else{
        click(`${ZONES[action.zone]} 코스`);
        if(action.cardIndex!==null)click(`${CARDS[s.hand[action.cardIndex]].name} 카드 ${action.cardIndex+1}`);
        if(action.wager)click(`+${action.wager} 건다`);
        click(/스윙 확정/);
      }
      const pitches=saved().stats.pitches;expect(pitches).toBe(s.stats.pitches+1);
      expect(screen.getByRole('button',{name:/승부 중/}).disabled).toBe(true);
      await tick();expect(saved().stats.pitches).toBe(pitches);
      if(!resumed){
        click('일시정지');click(/저장하고 메인으로/);view.unmount();view=render(<LastLight/>);click(/이어하기/);
        expect(saved().stats.pitches).toBe(pitches);resumed=true;
      }
    }else if(s.phase==='result')click(/다음 공 준비|이닝 결과 확인/);
    else if(s.phase==='bench')click(/새로운 핫존|스윙 궤도/);
  }
  expect(saved().phase).toBe('finished');expect(resumed).toBe(true);
  expect(saved().matches).toHaveLength(3);expect(saved().won).toBe(true);
  click(/다시 도전/);expect(saved().phase).toBe('brief');expect(saved().stats.pitches).toBe(0);
},60000);

it('requires a zone, leaves cards intact on take, restores an identical pending pitch and retries failed saves',async()=>{
  vi.useFakeTimers();render(<LastLight/>);click(/새로운 런 시작/);click(/플레이 볼/);
  expect(screen.getByRole('button',{name:/코스를 선택하세요/}).disabled).toBe(true);
  const hand=saved().hand;click(/지켜보기/);await tick();expect(saved().hand).toEqual(hand);
  click(/다음 공 준비/);const pitch=saved().pitch;
  click('일시정지');click(/저장하고 메인으로/);click(/이어하기/);expect(saved().pitch).toEqual(pitch);
  const original=window.localStorage.setItem.bind(window.localStorage);
  const spy=vi.spyOn(window.localStorage,'setItem').mockImplementation(()=>{throw new Error('quota');});
  click('일시정지');click(/저장하고 메인으로/);expect(screen.getByRole('dialog',{name:'일시정지'})).toBeTruthy();
  spy.mockImplementation(original);click(/저장 다시 시도/);expect(screen.queryByRole('alert')).toBeNull();
  click(/저장하고 메인으로/);expect(screen.getByRole('button',{name:/이어하기/})).toBeTruthy();
});

it('asks before overwriting a live run and provides accessible help',()=>{
  window.localStorage.setItem(SAVE_KEY,serializeRun(newRun(7)));render(<LastLight/>);
  click(/새로운 런 시작/);expect(screen.getByRole('dialog',{name:'새 런 확인'})).toBeTruthy();
  click('취소');expect(saved().seed).not.toBeUndefined();click('플레이 방법');
  expect(screen.getByRole('dialog',{name:'플레이 방법'})).toBeTruthy();click(/알겠어/);
  expect(screen.queryByRole('dialog')).toBeNull();
});
