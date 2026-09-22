// @vitest-environment happy-dom
import React from 'react';
import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import Duel from '../src/duel/App.jsx';
import {createDuel,startBattle,chooseRoute,playCard,advanceBatter,readDuel,saveDuel,createV10Duel,enterV10Node,saveV10Duel,readV10Duel} from '../src/duel/engine.js';
import {planAction} from '../src/duel/policy.js';
import {presentationFor,presentationTimeline} from '../src/duel/presentation.js';
import {batterMotionV3Timeline} from '../src/duel/batterMotionV3.js';
import {BUILDS,CARDS,ZONES,DECKBUILDER_BUILD,ROUTE_CHOICES} from '../src/duel/cards.js';
beforeEach(()=>{localStorage.clear();vi.useFakeTimers()});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals()});
const finish=()=>act(()=>vi.runAllTimers());
const fakeAnimationFrame=()=>{vi.stubGlobal('requestAnimationFrame',cb=>setTimeout(()=>cb(performance.now()),0));vi.stubGlobal('cancelAnimationFrame',id=>clearTimeout(id));};
function dismiss(){const skip=screen.queryByRole('button',{name:'건너뛰기',exact:true});if(skip)fireEvent.click(skip);}
function begin(zone=5,roll=.5){
  const s=startBattle(createDuel(1,'away'));s.battle.pending={zone,roll,powerRoll:.95};
  saveDuel(localStorage,s);render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'이어하기'}));dismiss();
}
/* 연출을 다 쓰는 건 이제 메인런, 곧 투수 HP 런뿐이다. 시네마 계약은 그쪽에서 확인한다.
   덱은 같은 카드를 쓰려고 완성형 체험 덱으로 갈아 끼운다. */
function beginV10(zone=5,roll=.5,build='away'){
  let s=createV10Duel(1);
  s.build=build;s.deck=BUILDS[build].cards.map((kind,i)=>({id:'c'+i,kind}));s.nextId=BUILDS[build].cards.length;
  s=enterV10Node(s,'a1-entry');
  s.battle.pending={zone,roll,powerRoll:.95};
  saveV10Duel(localStorage,s);
  render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'MAIN RUN 이어하기',exact:true}));
}
function useCard(kind){fireEvent.click(screen.getByRole('button',{name:CARDS[kind].type==='skill'?'준비하기':'스윙하기',exact:true}));fireEvent.click(screen.getAllByRole('button',{name:CARDS[kind].name,exact:true})[0]);fireEvent.click(screen.getByTestId('execute-action'));finish();}
describe('9-zone strategic UI',()=>{
  it('selects a distinct starter deck and trial seed without overwriting legacy saves',()=>{
    localStorage.setItem('9zone-lineup-v3','legacy');render(<Duel/>);
    fireEvent.click(screen.getByRole('button',{name:/몸쪽 장타/}));
    fireEvent.change(screen.getByLabelText('비교용 시드'),{target:{value:'42'}});
    fireEvent.click(screen.getByRole('button',{name:'튜토리얼 시작'}));
    expect(readDuel(localStorage).build).toBe('pull');expect(readDuel(localStorage).initialSeed).toBe(42);expect(localStorage.getItem('9zone-lineup-v3')).toBe('legacy');
  });
  it('tour walks six real targets; escape dismisses and does not reopen',()=>{
    const s=startBattle(createDuel(1));saveDuel(localStorage,s);render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'이어하기'}));
    const targets=['scoreboard','arena','prepare','swing','watch','events'];
    for(let i=0;i<targets.length;i++){expect(document.querySelector('.tour-spotlight')?.dataset.tourTarget).toBe(targets[i]);if(i<5)fireEvent.click(screen.getByRole('button',{name:'다음 설명'}));}
    fireEvent.keyDown(window,{key:'Escape'});expect(screen.queryByRole('dialog',{name:'온보딩 가이드'})).toBeNull();
    expect(localStorage.getItem('9zone-zones-tour-v5')).toBe('done');
    cleanup();render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'이어하기'}));expect(screen.queryByRole('dialog',{name:'온보딩 가이드'})).toBeNull();
  });
  it('does not offer a targetless tour on the map',()=>{
    saveDuel(localStorage,createDuel(1));render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'이어하기'}));fireEvent.click(screen.getByRole('button',{name:'?',exact:true}));
    expect(screen.getByRole('button',{name:'웰컴 가이드 다시 보기'}).disabled).toBe(true);
  });
  it('shows 9 zones, 4 proficiency markers, stats, and guaranteed-hit promise',()=>{
    begin();expect(screen.getByRole('group',{name:'노릴 코스'}).querySelectorAll('button')).toHaveLength(9);
    expect(screen.getByRole('group',{name:'노릴 코스'}).textContent.match(/★ 숙련/g)).toHaveLength(4);
    expect(screen.getByLabelText('타자 투수 스탯').textContent).toContain('안타 취소 없음');
    fireEvent.click(screen.getByRole('button',{name:'스윙하기',exact:true}));fireEvent.click(screen.getByRole('button',{name:'밀어치기',exact:true}));
    expect(screen.getByText('타격 범위 적중 = 안타 확정')).toBeTruthy();
    const before=readDuel(localStorage).battle.pending;fireEvent.click(screen.getByRole('button',{name:'몸쪽 중간',exact:true}));
    expect(readDuel(localStorage).battle.pending).toEqual(before);expect(readDuel(localStorage).battle.aimZone).toBe(3);
  });
  it('moves and selects the 9-zone grid with arrow, Home, and End keys',()=>{
    begin();const middle=screen.getByRole('button',{name:'한가운데',exact:true});middle.focus();
    fireEvent.keyDown(middle,{key:'ArrowRight'});expect(document.activeElement).toBe(screen.getByRole('button',{name:/바깥 중간/}));
    expect(readDuel(localStorage).battle.aimZone).toBe(5);
    fireEvent.keyDown(document.activeElement,{key:'ArrowUp'});expect(document.activeElement).toBe(screen.getByRole('button',{name:/바깥 높음/}));
    fireEvent.keyDown(document.activeElement,{key:'End'});expect(document.activeElement).toBe(screen.getByRole('button',{name:/바깥 낮음/}));
    expect(readDuel(localStorage).battle.aimZone).toBe(8);
  });
  it('renders an unused zone like a rare zone at read level zero',()=>{
    const s=startBattle(createDuel(1,'away'));
    s.battle.intent.probabilities=[0,.02,.13,.14,.27,.28,.04,.04,.04,.04];
    saveDuel(localStorage,s);render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'이어하기'}));dismiss();
    const unused=screen.getByRole('button',{name:'몸쪽 높음'}),rare=screen.getByRole('button',{name:'가운데 높음'});
    expect(unused.classList.contains('shade-1')).toBe(true);expect(rare.classList.contains('shade-1')).toBe(true);
    expect(unused.title).toBe('드묾');expect(unused.textContent).toContain('드묾');expect(unused.textContent).not.toContain('안 씀');
  });
  it('keeps the four reward stages in screen-reader order',()=>{
    const s=startBattle(createDuel(1));s.battle.runs=1;s.battle.bases[2]='p8';s.battle.pending={zone:5,roll:.5,powerRoll:.99};
    saveDuel(localStorage,playCard(s,'c0'));render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'이어하기'}));
    fireEvent.click(screen.getByRole('button',{name:'끝까지 기다린 한 공',exact:true}));
    const flow=screen.getByRole('group',{name:'보상 선택 4단계'});
    expect([...flow.querySelectorAll(':scope > section')].map(x=>x.getAttribute('aria-label'))).toEqual(['다음 상대 리포트','성장 선택','내 덱 구성','덱 변경 방식','변화 확인']);
  });
  it('shortens result effects when reduced motion is requested',()=>{
    vi.stubGlobal('matchMedia',vi.fn(()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
    begin(9);fireEvent.click(screen.getByRole('button',{name:'한 구 지켜보기',exact:true}));fireEvent.click(screen.getByRole('button',{name:'지켜보기 · 공 진행'}));expect(document.querySelector('.duel-fx')).toBeTruthy();
    act(()=>vi.advanceTimersByTime(61));expect(document.querySelector('.duel-fx')).toBeNull();
  });
  it('hit puts named player on base and gates the next batter, including reload',()=>{
    begin();useCard('strike');expect(screen.getByLabelText('베이스 주자').textContent).toContain('강한결');
    expect(screen.getByRole('region',{name:'타석 종료 결과'})).toBeTruthy();expect(screen.queryByTestId('execute-action')).toBeNull();
    const saved=readDuel(localStorage);cleanup();render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'이어하기'}));expect(readDuel(localStorage)).toEqual(saved);
    fireEvent.click(screen.getByRole('button',{name:'다음 타자 입장 · 2번 이민준'}));expect(readDuel(localStorage).battle.batterIndex).toBe(1);
  });
  it('runs the full cinema presentation inside the MAIN RUN pitcher-HP battle, not only in the lab',()=>{
    fakeAnimationFrame();
    let s=createV10Duel(19);
    s=enterV10Node(s,'a1-entry');
    s.battle.pending={zone:s.battle.aimZone,roll:.1,powerRoll:.99};
    saveV10Duel(localStorage,s);
    render(<Duel/>);
    fireEvent.click(screen.getByRole('button',{name:'MAIN RUN 이어하기',exact:true}));
    fireEvent.click(screen.getByRole('button',{name:'스윙하기',exact:true}));
    fireEvent.click(screen.getByRole('button',{name:'BASIC SWING',exact:true}));
    fireEvent.click(screen.getByTestId('execute-action'));
    const arena=screen.getByRole('region',{name:'승부 구장'});
    expect(arena.className).toContain('fx-stage-windup');
    expect([...arena.classList].some(c=>c.startsWith('fx-')&&!c.startsWith('fx-stage-'))).toBe(true);
    expect(arena.querySelector('.judgement-layer')).toBeTruthy();
    expect(arena.querySelector('.pixel-cinema')).toBeTruthy();
    expect(arena.querySelector('.pixel-vfx-canvas')).toBeTruthy();
    const timeline=presentationTimeline(presentationFor(readV10Duel(localStorage)));
    act(()=>vi.advanceTimersByTime(timeline.impactAt+1));
    expect(arena.className).toContain('fx-stage-impact');
    expect(arena.querySelector('.sprite-batter.batter-reboot-v3.reboot-pose-contact img.batter-reboot-art')).toBeTruthy();
    finish();
  });

  it('lets a swing be taken back, or turned into a watch, from inside the drawer',()=>{
    begin();
    fireEvent.click(screen.getByRole('button',{name:'스윙하기',exact:true}));
    /* 존 밖으로 올 것 같으면 카드 고르다 말고 빠져나올 수 있어야 한다. */
    const back=screen.getByRole('button',{name:'← 돌아가기'});
    fireEvent.click(back);
    expect(screen.getByRole('button',{name:'스윙하기',exact:true})).toBeTruthy();
    expect(screen.queryByRole('button',{name:'← 돌아가기'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'스윙하기',exact:true}));
    const before=readDuel(localStorage).stats.pitches;
    fireEvent.click(screen.getByRole('button',{name:'한 구 지켜보기',exact:true}));
    finish();
    expect(readDuel(localStorage).stats.pitches).toBe(before+1);
  });

  it('keeps tutorial runs on a plain readout instead of the cinema',()=>{
    begin();
    const arena=screen.getByRole('region',{name:'승부 구장'});
    /* 구장과 스프라이트는 정보라서 남는다. 구경거리 레이어만 뺀다. */
    expect(arena.querySelector('canvas.arena-renderer2')).toBeTruthy();
    expect(arena.querySelector('.pixel-cinema')).toBeNull();
    expect(arena.querySelector('canvas.pixel-vfx-canvas')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'스윙하기',exact:true}));
    fireEvent.click(screen.getByRole('button',{name:'밀어치기',exact:true}));
    fireEvent.click(screen.getByTestId('execute-action'));
    expect([...arena.classList].some(c=>c.startsWith('shake-'))).toBe(false);
    expect(document.querySelector('.slowmo-mark')).toBeNull();
    /* 튜토리얼은 연출이 순식간에 끝나고 결과로 간다. */
    act(()=>vi.advanceTimersByTime(60));
    expect([...arena.classList].some(c=>c.startsWith('fx-stage-'))).toBe(false);
    finish();
  });

  it('mounts Pixel Cinema Renderer 2.0 as the live spatial arena with safe fallback',()=>{
    beginV10();
    const arena=screen.getByRole('region',{name:'승부 구장'});
    expect(arena.classList.contains('renderer2-host')).toBe(true);
    expect(arena.querySelector('canvas.arena-renderer2')).toBeTruthy();
    expect(arena.querySelector('canvas.pixel-vfx-canvas')).toBeTruthy();
  });

  it('keeps pitcher 60-frame playback while the batter uses authored reboot key poses and overlays the tactical read trace',()=>{
    fakeAnimationFrame();
    beginV10();
    fireEvent.click(screen.getByRole('button',{name:'스윙하기',exact:true}));
    fireEvent.click(screen.getByRole('button',{name:'밀어치기',exact:true}));
    fireEvent.click(screen.getByTestId('execute-action'));
    expect(document.querySelector('.sprite-batter.batter-reboot-v3.reboot-pose-ready img.batter-reboot-art')).toBeTruthy();
    expect(document.querySelector('.sprite-pitcher.v4-sequence.pose-legkick canvas.v4-canvas')).toBeTruthy();
    const shot=presentationFor(readV10Duel(localStorage));
    const timeline=presentationTimeline(shot);
    const motion=batterMotionV3Timeline(shot);
    const load=motion.find(x=>x.pose==='load'),swingStart=motion.find(x=>x.pose==='swing-start'),swingMid=motion.find(x=>x.pose==='swing-mid'),contact=motion.find(x=>x.pose==='contact');
    act(()=>vi.advanceTimersByTime(load.at+1));
    expect(document.querySelector('.sprite-batter.batter-reboot-v3.reboot-pose-load img.batter-reboot-art')).toBeTruthy();
    act(()=>vi.advanceTimersByTime(swingStart.at-load.at));
    expect(document.querySelector('.sprite-batter.batter-reboot-v3.reboot-pose-swing-start img.batter-reboot-art')).toBeTruthy();
    act(()=>vi.advanceTimersByTime(swingMid.at-swingStart.at));
    expect(document.querySelector('.sprite-batter.batter-reboot-v3.reboot-pose-swing-mid img.batter-reboot-art')).toBeTruthy();
    act(()=>vi.advanceTimersByTime(contact.at-swingMid.at));
    expect(document.querySelector('.sprite-batter.batter-reboot-v3.reboot-pose-contact img.batter-reboot-art')).toBeTruthy();
    expect(document.querySelector('.sprite-pitcher.v4-sequence.pose-release canvas.v4-canvas')).toBeTruthy();
    expect(document.querySelector('.read-trace')).toBeTruthy();
    expect(document.querySelector('.read-trace .actual')).toBeTruthy();
    finish();
  });

  it('uses selective slow motion for a one-zone miss instead of every whiff',()=>{
    beginV10(0,.99);
    fireEvent.click(screen.getByRole('button',{name:'한가운데',exact:true}));
    fireEvent.click(screen.getByRole('button',{name:'스윙하기',exact:true}));
    fireEvent.click(screen.getByRole('button',{name:'밀어치기',exact:true}));
    fireEvent.click(screen.getByTestId('execute-action'));
    expect(document.querySelector('.presentation-stage-windup')).toBeTruthy();
    const timeline=presentationTimeline(presentationFor(readV10Duel(localStorage)));
    act(()=>vi.advanceTimersByTime(timeline.impactAt+1));expect(document.querySelector('.presentation-stage-impact')).toBeTruthy();
    act(()=>vi.advanceTimersByTime(timeline.freeze+1));expect(document.querySelector('.presentation-stage-slowmo')).toBeTruthy();
    expect(document.querySelector('.slowmo-mark')?.textContent).toBe('ONE ZONE');
    act(()=>vi.advanceTimersByTime(timeline.slowmo+1));expect(document.querySelector('.presentation-stage-release')).toBeTruthy();
    finish();
    const result=screen.getByRole('region',{name:'투구 결과'});
    expect(result.className).toContain('result-grade-near-miss');
    expect(result.querySelector('.result-call')?.textContent).toBe('한 칸 차이');
    const failure=screen.getByRole('region',{name:'실패 과정'});
    expect(failure.textContent).toContain('READ');
    expect(failure.textContent).toContain('BET');
    expect(failure.textContent).toContain('REVEAL');
    expect(failure.textContent).toContain('IMPACT');
  });

  it('uncovered whiff keeps same batter and requires next pitch confirmation',()=>{
    begin(0,.99);useCard('strike');expect(screen.getByRole('region',{name:'투구 결과'})).toBeTruthy();expect(readDuel(localStorage).battle.strikes).toBe(1);
    expect(screen.queryByRole('button',{name:/다음 타자 입장/})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'다음 공 · 같은 타자'}));expect(readDuel(localStorage).battle.batterIndex).toBe(0);expect(screen.getByRole('button',{name:'스윙하기',exact:true})).toBeTruthy();
  });
  it('shows a repertoire expansion as a distinct live event when the next batter enters',()=>{
    let s=startBattle(createDuel(1));s.battle.pending={zone:s.battle.aimZone,roll:.5,powerRoll:.95};
    s=advanceBatter(playCard(s,'basic'));s.battle.pending={zone:s.battle.aimZone,roll:.5,powerRoll:.95};s=playCard(s,'basic');
    saveDuel(localStorage,s);render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'이어하기'}));
    fireEvent.click(screen.getByRole('button',{name:'다음 타자 입장 · 3번 박도윤'}));
    const status=screen.getByRole('status');
    expect(status.textContent).toContain('투수 레퍼토리 확장 · 4→5존 · 가운데 높음 추가');
    expect(status.classList.contains('repertoire-event')).toBe(true);
    expect(readDuel(localStorage).battle.log[1]).toContain('레퍼토리 확장');
  });
  it('BASIC is always selectable and reveal cannot be double-triggered',()=>{
    begin(5);fireEvent.click(screen.getByRole('button',{name:'스윙하기',exact:true}));fireEvent.click(screen.getByRole('button',{name:'BASIC SWING',exact:true}));
    fireEvent.click(screen.getByTestId('execute-action'));expect(readDuel(localStorage).stats.pitches).toBe(1);expect(readDuel(localStorage).stats.cards).toBe(0);finish();
    expect(readDuel(localStorage).stats.hits).toBe(1);
  });
  it('duplicate watch input consumes only one pitch and records a ball',()=>{
    begin(9);fireEvent.click(screen.getByRole('button',{name:'한 구 지켜보기',exact:true}));const button=screen.getByRole('button',{name:'지켜보기 · 공 진행'});fireEvent.click(button);fireEvent.click(button);
    expect(readDuel(localStorage).stats.pitches).toBe(1);expect(readDuel(localStorage).battle.balls).toBe(1);finish();
  });
  it('plays a complete run through UI with public decisions only',()=>{
    saveDuel(localStorage,createDuel(4,'contact'));render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'이어하기'}));
    let guard=0;while(guard++<600){
      const s=readDuel(localStorage);if(['won','lost'].includes(s.phase))break;
      if(s.phase==='map'){fireEvent.click(screen.getByRole('button',{name:'승부 시작'}));dismiss();}
      else if(s.phase==='pitch')fireEvent.click(screen.getByRole('button',{name:'다음 공 · 같은 타자'}));
      else if(s.phase==='between')fireEvent.click(screen.getByRole('button',{name:/다음 타자 입장/}));
      else if(s.phase==='reward'){fireEvent.click(screen.getByRole('button',{name:'이상하게 풀리는 날',exact:true}));
        fireEvent.click(screen.getByRole('button',{name:'카드 추가'}));
        fireEvent.click(screen.getByRole('button',{name:CARDS[['flow','lure','finisher'][s.stage]].name,exact:true}));
        fireEvent.click(screen.getByRole('button',{name:'행운 Lv.'+(s.growth.fortune+1)+' · 이 덱으로 확정'}));}
      else {const a=planAction(s);fireEvent.click(screen.getByRole('button',{name:ZONES[a.zone],exact:true}));
        if(a.mode!==s.battle.growthMode)fireEvent.click(screen.getByRole('button',{name:a.mode==='normal'?'성장 사용 해제':a.mode==='fortune'?'행운 예약':'기다린 공 승부',exact:true}));
        if(!a.id){fireEvent.click(screen.getByRole('button',{name:'한 구 지켜보기',exact:true}));fireEvent.click(screen.getByRole('button',{name:'지켜보기 · 공 진행'}));finish();}
        else if(a.id==='basic'){fireEvent.click(screen.getByRole('button',{name:'스윙하기',exact:true}));fireEvent.click(screen.getByRole('button',{name:'BASIC SWING',exact:true}));fireEvent.click(screen.getByTestId('execute-action'));finish();}
        else useCard(s.deck.find(c=>c.id===a.id).kind);
      }
    }
    expect(guard).toBeLessThan(600);expect(['won','lost']).toContain(readDuel(localStorage).phase);expect(screen.getByRole('button',{name:'다시 도전'})).toBeTruthy();
  });

  it('pulls the arena into view when a swing starts its cinema, and leaves it alone when already visible',()=>{
    const rect=(top,height)=>()=>({top,bottom:top+height,height,left:0,right:390,width:390,x:0,y:top});
    const armed=()=>{
      const s=startBattle(createDuel(1));s.battle.pending={zone:s.battle.aimZone,roll:.1,powerRoll:.99};
      saveDuel(localStorage,s);render(<Duel/>);
      fireEvent.click(screen.getByRole('button',{name:'이어하기'}));dismiss();
      const arena=screen.getByRole('region',{name:'승부 구장'});
      const scrolled=[];arena.scrollIntoView=opts=>scrolled.push(opts);
      return {arena,scrolled};
    };
    const swing=()=>{
      fireEvent.click(screen.getByRole('button',{name:'스윙하기',exact:true}));
      fireEvent.click(screen.getByRole('button',{name:'BASIC SWING',exact:true}));
      fireEvent.click(screen.getByTestId('execute-action'));
    };
    const off=armed();
    off.arena.getBoundingClientRect=rect(-476,155);
    swing();finish();
    expect(off.scrolled).toEqual([{block:'center',behavior:'auto'}]);
    cleanup();localStorage.clear();
    const on=armed();
    on.arena.getBoundingClientRect=rect(120,155);
    swing();finish();
    expect(on.scrolled).toEqual([]);
  });
});
