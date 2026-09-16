// @vitest-environment happy-dom
import React from 'react';
import {afterEach,beforeEach,describe,it,expect} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import Duel from '../src/duel/App.jsx';
import {createDuel,startBattle,chooseRoute,battleTarget,playCard,saveDuel,readDuel} from '../src/duel/engine.js';
import {DECKBUILDER_BUILD,STAGES,ROUTE_CHOICES} from '../src/duel/cards.js';

const pitch=(s,zone=s.battle.aimZone,roll=.1,powerRoll=.99)=>{
  s.battle.pending={zone,roll,powerRoll};
  return s;
};
function rewardState(){
  let s=createDuel(11,DECKBUILDER_BUILD);
  s=chooseRoute(s,ROUTE_CHOICES[0][0].id);
  s=startBattle(s);
  s.battle.runs=battleTarget(s)-1;
  s.battle.bases=[null,null,'p8'];
  return playCard(pitch(s),'c0');
}
function hitState(){
  let s=createDuel(19,DECKBUILDER_BUILD);
  s=chooseRoute(s,ROUTE_CHOICES[0][0].id);
  s=startBattle(s);
  return playCard(pitch(s),'c0');
}

beforeEach(()=>localStorage.clear());
afterEach(()=>cleanup());

describe('V9 main-run UI',()=>{
  it('presents every V9 deck as a tutorial now that the main run is the pitcher-HP run',()=>{
    render(<Duel/>);
    const starter=screen.getByRole('button',{name:/무명 타선/});
    expect(starter.getAttribute('aria-pressed')).toBe('true');
    expect(within(starter).getByText('튜토리얼 · 덱 만들기')).toBeTruthy();
    for(const name of ['몸쪽 장타','바깥 연결','끈질긴 컨택']){
      const button=screen.getByRole('button',{name:new RegExp(name)});
      expect(within(button).getByText('튜토리얼 · 완성형 체험')).toBeTruthy();
    }
    /* 메인런은 따로, 그리고 제일 밝게 들어간다. */
    const main=screen.getByRole('button',{name:/MAIN RUN 시작/});
    expect(main.classList.contains('primary')).toBe(true);
  });

  it('makes the map an actual opponent choice before a main-run battle',()=>{
    render(<Duel/>);
    fireEvent.click(screen.getByRole('button',{name:'튜토리얼 시작'}));
    const routes=screen.getByRole('region',{name:'상대 경로 선택'});
    expect(routes).toBeTruthy();
    expect(screen.queryByRole('button',{name:'이 상대와 승부 시작'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:/강팀 원정/}));
    expect(screen.getAllByText(/목표 3점/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button',{name:'이 상대와 승부 시작'})).toBeTruthy();
  });

  it('turns a combat win into a direct three-card draft with no mandatory growth choice',()=>{
    const s=rewardState();
    expect(s.phase).toBe('reward');
    saveDuel(localStorage,s);
    render(<Duel/>);
    fireEvent.click(screen.getByRole('button',{name:'이어하기'}));
    expect(screen.getByRole('group',{name:'덱 빌딩 카드 선택'})).toBeTruthy();
    for(const name of ['당겨 넘기기','주자 연결','커트 스윙'])expect(screen.getByRole('button',{name})).toBeTruthy();
    expect(screen.queryByRole('button',{name:'끝까지 기다린 한 공'})).toBeNull();

    fireEvent.click(screen.getByRole('button',{name:'당겨 넘기기'}));
    fireEvent.click(screen.getByRole('button',{name:'이 덱으로 다음 경기'}));
    const saved=readDuel(localStorage);
    expect(saved.stage).toBe(1);
    expect(saved.deck).toHaveLength(10);
    expect(saved.deck.at(-1).kind).toBe('slug');
    expect(saved.growth).toEqual({patience:0,relay:0,fortune:0});
    expect(saved.phase).toBe('facility');
    expect(screen.getByRole('group',{name:'다음 경기 준비 선택'})).toBeTruthy();
    expect(screen.getByRole('button',{name:/타격 훈련/})).toBeTruthy();
    expect(screen.getByRole('button',{name:/스카우팅/})).toBeTruthy();

    fireEvent.click(screen.getByRole('button',{name:/스카우팅/}));
    fireEvent.click(screen.getByRole('button',{name:'이 준비로 다음 경기'}));
    const routed=readDuel(localStorage);
    expect(routed.phase).toBe('map');
    expect(routed.facilities).toEqual([{type:'scouting'}]);
    expect(screen.getByText(/스카우팅 적용/)).toBeTruthy();
  });

  it('shows live deck synergy when a reward candidate is selected',()=>{
    const s=rewardState();
    saveDuel(localStorage,s);
    render(<Duel/>);
    fireEvent.click(screen.getByRole('button',{name:'이어하기'}));
    fireEvent.click(screen.getByRole('button',{name:'주자 연결'}));
    const synergy=screen.getByRole('region',{name:'카드 시너지'});
    expect(synergy.textContent).toContain('주자 연결');
    expect(synergy.textContent).toContain('릴리스 간파');
    expect(synergy.textContent).toContain('연계');
  });

  it('makes contact quality the dominant result instead of a generic hit log',()=>{
    const s=hitState();
    expect(s.phase).toBe('between');
    saveDuel(localStorage,s);
    render(<Duel/>);
    fireEvent.click(screen.getByRole('button',{name:'이어하기'}));
    const result=screen.getByLabelText('타석 종료 결과');
    expect(result.querySelector('.result-call')?.textContent).toBe('정확히 맞혔다');
    expect(result.className).toContain('result-hit');
    expect(within(result).getByRole('heading',{level:2}).textContent).toContain('안타');
  });
});
