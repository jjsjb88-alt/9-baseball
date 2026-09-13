// @vitest-environment happy-dom
import React from 'react';
import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import Duel from '../src/duel/App.jsx';
import {createDuel,startBattle,playCard,chooseReward,saveDuel,readDuel} from '../src/duel/engine.js';
const finish=()=>act(()=>vi.runAllTimers());
beforeEach(()=>{localStorage.clear();localStorage.setItem('9zone-zones-tour-v5','done');vi.useFakeTimers()});
afterEach(()=>{cleanup();vi.useRealTimers()});
function reward(){const s=startBattle(createDuel(1));s.battle.runs=1;s.battle.bases[2]='p8';s.battle.pending={zone:5,roll:.5,powerRoll:.99};return playCard(s,'c0');}
function load(s){saveDuel(localStorage,s);render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'이어하기'}));}
function grown(key){
  const s=startBattle(chooseReward(reward(),{type:'skip'},key));s.battle.pending={zone:5,roll:.5,powerRoll:.99};
  const ids=[...s.battle.hand,...s.battle.draw,...s.battle.discard];s.battle.hand=['c0'];s.battle.draw=ids.filter(id=>id!=='c0');s.battle.discard=[];return s;
}
describe('growth reward and in-game controls',()=>{
  it('commits growth and one deck action together; repeated confirmation cannot duplicate either',()=>{
    load(reward());expect(screen.queryByRole('button',{name:/이 덱으로 확정/})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'다음 타자를 믿는다',exact:true}));
    const confirm=()=>screen.getByRole('button',{name:'연결 Lv.1 · 이 덱으로 확정'});
    expect(confirm().disabled).toBe(true); // 덱 변경 방식을 아직 고르지 않았다
    expect(screen.queryByRole('button',{name:'희생 번트',exact:true})).toBeNull(); // 번트는 더 이상 연결 후보가 아니다
    fireEvent.click(screen.getByRole('button',{name:'카드 추가'}));
    expect(confirm().disabled).toBe(true); // 대상 카드를 아직 고르지 않았다
    expect(readDuel(localStorage).growth.relay).toBe(0);
    fireEvent.click(screen.getByRole('button',{name:'주자 연결',exact:true}));
    const button=confirm();fireEvent.click(button);fireEvent.click(button);
    const s=readDuel(localStorage);expect(s.growth.relay).toBe(1);expect(s.deck).toHaveLength(13);expect(s.deck.at(-1).kind).toBe('rally');expect(s.phase).toBe('map');
    expect(s.rewards).toEqual([{type:'add',kind:'rally'}]);
  });
  it('changes growth without leaving a stale target selected and preserves unclaimed reward on reload',()=>{
    const s=reward();load(s);fireEvent.click(screen.getByRole('button',{name:'다음 타자를 믿는다',exact:true}));
    fireEvent.click(screen.getByRole('button',{name:'카드 추가'}));fireEvent.click(screen.getByRole('button',{name:'주자 연결',exact:true}));
    fireEvent.click(screen.getByRole('button',{name:'끝까지 기다린 한 공',exact:true}));
    expect(screen.getByRole('button',{name:'기다림 Lv.1 · 이 덱으로 확정'}).disabled).toBe(true);
    expect(readDuel(localStorage)).toEqual(s);cleanup();load(s);expect(screen.getByRole('region',{name:'성장 선택'})).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'이상하게 풀리는 날',exact:true}));fireEvent.click(screen.getByRole('button',{name:'덱 그대로'}));
    fireEvent.click(screen.getByRole('button',{name:'행운 Lv.1 · 이 덱으로 확정'}));
    expect(readDuel(localStorage).growth.fortune).toBe(1);expect(readDuel(localStorage).deck).toHaveLength(12);
  });
  it('waited-strike growth narrows the shown coverage and exposes the cost before swinging',()=>{
    const s=grown('patience');s.battle.waitCharge=1;load(s);
    fireEvent.click(screen.getByRole('button',{name:'스윙하기',exact:true}));fireEvent.click(screen.getByRole('button',{name:'밀어치기',exact:true}));
    expect(document.querySelectorAll('.zone-cell.covered')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button',{name:'기다린 공 승부',exact:true}));expect(document.querySelectorAll('.zone-cell.covered')).toHaveLength(1);
    expect(screen.getByText(/기다림 1 소비 · 한 존 · 파워/)).toBeTruthy();expect(readDuel(localStorage).battle.waitCharge).toBe(1);
    fireEvent.click(screen.getByRole('button',{name:'카드 사용'}));finish();
    expect(readDuel(localStorage).growthStats.patienceSwings).toBe(1);expect(screen.getByText('기다린 한 공 · 1중첩 사용')).toBeTruthy();
  });
  it('luck reservation survives reload and a hit shows the actual extra base advance',()=>{
    const s=grown('fortune');s.fortune=3;load(s);fireEvent.click(screen.getByRole('button',{name:'행운 예약',exact:true}));
    expect(readDuel(localStorage).fortune).toBe(3);const saved=readDuel(localStorage);cleanup();load(saved);
    expect(screen.getByRole('button',{name:'행운 예약',exact:true}).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button',{name:'스윙하기',exact:true}));fireEvent.click(screen.getByRole('button',{name:'밀어치기',exact:true}));fireEvent.click(screen.getByRole('button',{name:'카드 사용'}));finish();
    expect(readDuel(localStorage).fortune).toBe(0);expect(readDuel(localStorage).battle.bases[1]).toBe('p1');
    expect(screen.getByText('행운 해방 · 수비 혼선으로 타자·주자 추가 1베이스')).toBeTruthy();
    expect(screen.getByRole('button',{name:'행운 예약',exact:true}).disabled).toBe(true);
  });
  it('older local saves are not overwritten by a new v8 run',()=>{
    localStorage.setItem('9zone-zones-v5','keep-v5');localStorage.setItem('9zone-growth-v6','keep-v6');localStorage.setItem('9zone-deck-v7','keep-v7');
    render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'새 런 시작'}));
    expect(readDuel(localStorage).version).toBe(8);
    expect(localStorage.getItem('9zone-zones-v5')).toBe('keep-v5');expect(localStorage.getItem('9zone-growth-v6')).toBe('keep-v6');
    expect(localStorage.getItem('9zone-deck-v7')).toBe('keep-v7');
  });
});
