/** @vitest-environment happy-dom */
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { it, expect, vi, afterEach } from 'vitest';
import BaseballSim from '../BaseballSim-deck-5.jsx';
import { RUN_SAVE_KEY } from '../src/game/run-session.js';
import * as contactEngine from '../src/game/showdown-engine.js';
vi.mock('tone',()=>({}));
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();window.localStorage.clear();});
const tick=async(ms=1200)=>{await act(async()=>{await vi.advanceTimersByTimeAsync(ms);});};
const click=(name)=>fireEvent.click(screen.getByRole('button',{name}));
const saved=()=>JSON.parse(window.localStorage.getItem(RUN_SAVE_KEY));
it('plays 48 at-bats through the real UI, resumes mid-count and wins the final',async()=>{
  vi.useFakeTimers(); vi.spyOn(Math,'random').mockReturnValue(0);
  vi.spyOn(window,'requestAnimationFrame').mockImplementation(cb=>window.setTimeout(()=>cb(Date.now()),16));
  let view=render(<BaseballSim/>);
  click('건너뛰기'); click(/30분 쇼다운 런 시작/);
  expect(saved().status).toBe('intro');
  expect(screen.queryByRole('button',{name:'지켜보기'})).toBeNull();
  for(let stage=0;stage<6;stage++){
    click(/타석에 들어서기/); await tick();
    for(let pa=0;pa<8;pa++){
      for(let p=0;p<4;p++){
        expect(screen.getByRole('button',{name:'지켜보기'}).disabled).toBe(false);
        click('지켜보기');
        if(stage===0 && pa===0 && p===0){
          expect(saved().balls).toBe(1); const hand=saved().checkpoint.hand;
          click('저장하고 나가기'); view.unmount(); view=render(<BaseballSim/>);
          click('건너뛰기'); click(/저장된 런 이어하기/); await tick();
          expect(saved().balls).toBe(1); expect(saved().checkpoint.hand).toEqual(hand);
        } else if(p<3){await tick(); click('다음투구'); await tick();}
      }
      await tick(2500);
      expect(saved().pa).toBe(pa+1); expect(saved().points).toBe(pa+1);
      click(pa===7 ? /라운드 결과 확인/ : /다음 타석 →/); await tick();
    }
    if(stage<5){expect(saved().status).toBe('reward'); click(/카드 강화/); expect(saved().stage).toBe(stage+1);}
  }
  expect(saved().status).toBe('won'); expect(saved().pitches).toBe(192);
  expect(screen.getByText('최종전 목표 달성. 쇼다운 런 우승!')).toBeTruthy();
  click(/새 런 시작/); expect(saved().stage).toBe(0); expect(saved().pitches).toBe(0);
},60000);

it('BASIC SWING uses the shared engine, awards home-run points once and consumes no card',async()=>{
  vi.useFakeTimers();
  vi.spyOn(window,'requestAnimationFrame').mockImplementation(cb=>window.setTimeout(()=>cb(Date.now()),16));
  const contact=vi.spyOn(contactEngine,'resolveShowdownContact').mockReturnValue({outcome:'homerun',cq:90,pq:95,power:.95});
  render(<BaseballSim/>); click('건너뛰기'); click(/30분 쇼다운 런 시작/); click(/타석에 들어서기/); await tick();
  const hand=saved().checkpoint.hand;
  const basic=screen.getAllByRole('button',{name:/BASIC SWING/})[0];
  expect(basic.disabled).toBe(false); expect(basic.style.pointerEvents).not.toBe('none');
  fireEvent.click(basic); fireEvent.click(basic); await tick(2500);
  expect(contact).toHaveBeenCalledTimes(1);
  expect(contact.mock.calls[0][0]).toMatchObject({mastered:false,cardTier:1,pitchPower:48});
  expect(saved()).toMatchObject({pa:1,points:4,homeRuns:1,status:'atbat'});
  expect(saved().checkpoint.hand).toEqual(hand);
  expect(screen.getByText('홈런 · 4루 획득')).toBeTruthy();
});

it('keeps a failed save on screen for retry and cancels queued pitches when exiting',async()=>{
  vi.useFakeTimers();
  const original=window.localStorage.setItem.bind(window.localStorage);
  const save=vi.spyOn(window.localStorage,'setItem').mockImplementation((key,value)=>{
    if(key===RUN_SAVE_KEY) throw new Error('storage full');
    original(key,value);
  });
  render(<BaseballSim/>); click('건너뛰기'); click(/30분 쇼다운 런 시작/);
  expect(screen.getByRole('alert').textContent).toContain('런 저장 실패');
  click('저장하고 나가기'); expect(screen.getByRole('button',{name:/타석에 들어서기/})).toBeTruthy();
  save.mockImplementation(original); click('저장 다시 시도');
  expect(screen.queryByRole('alert')).toBeNull();
  click(/타석에 들어서기/); click('저장하고 나가기'); await tick(3000);
  expect(screen.queryByRole('button',{name:'지켜보기'})).toBeNull();
  expect(saved()).toMatchObject({status:'playing',pa:0,pitches:0});
});
