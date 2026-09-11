// @vitest-environment happy-dom
import React from 'react';
import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import Duel from '../src/duel/App.jsx';
import {createDuel,startBattle,playCard,chooseCard,saveDuel,readDuel} from '../src/duel/engine.js';
const finish=()=>act(()=>vi.runAllTimers());
beforeEach(()=>{localStorage.clear();localStorage.setItem('9zone-zones-tour-v5','done');vi.useFakeTimers()});
afterEach(()=>{cleanup();vi.useRealTimers()});
function reward(){const s=startBattle(createDuel(1));s.battle.runs=1;s.battle.bases[2]='p8';s.battle.pending={zone:5,roll:.5,powerRoll:.99};return playCard(s,'c0');}
function load(s){saveDuel(localStorage,s);render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'이어하기'}));}
function grown(key){
  const s=startBattle(chooseCard(reward(),'skip',key));s.battle.pending={zone:5,roll:.5,powerRoll:.99};
  const ids=[...s.battle.hand,...s.battle.draw,...s.battle.discard];s.battle.hand=['c0'];s.battle.draw=ids.filter(id=>id!=='c0');s.battle.discard=[];return s;
}
describe('growth reward and in-game controls',()=>{
  it('commits growth and signature card together; repeated confirmation cannot duplicate either',()=>{
    load(reward());expect(screen.queryByRole('button',{name:'성장과 카드 확정'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'다음 타자를 믿는다',exact:true}));
    expect(screen.getByRole('button',{name:'성장과 카드 확정'}).disabled).toBe(true);
    expect(screen.getByRole('button',{name:'희생 번트',exact:true})).toBeTruthy();expect(readDuel(localStorage).growth.relay).toBe(0);
    fireEvent.click(screen.getByRole('button',{name:'희생 번트',exact:true}));const button=screen.getByRole('button',{name:'성장과 카드 확정'});fireEvent.click(button);fireEvent.click(button);
    const s=readDuel(localStorage);expect(s.growth.relay).toBe(1);expect(s.deck).toHaveLength(13);expect(s.deck.at(-1).kind).toBe('bunt');expect(s.phase).toBe('map');
  });
  it('changes growth without leaving a stale card selected and preserves unclaimed reward on reload',()=>{
    const s=reward();load(s);fireEvent.click(screen.getByRole('button',{name:'다음 타자를 믿는다',exact:true}));fireEvent.click(screen.getByRole('button',{name:'희생 번트',exact:true}));
    fireEvent.click(screen.getByRole('button',{name:'끝까지 기다린 한 공',exact:true}));expect(screen.getByRole('button',{name:'성장과 카드 확정'}).disabled).toBe(true);
    expect(readDuel(localStorage)).toEqual(s);cleanup();load(s);expect(screen.getByRole('region',{name:'성장 선택'})).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'이상하게 풀리는 날',exact:true}));fireEvent.click(screen.getByRole('button',{name:'성장만 획득 · 카드 건너뛰기'}));
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
  it('v5 local saves are not overwritten by a new v6 run',()=>{
    localStorage.setItem('9zone-zones-v5','keep-this');render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'새 런 시작'}));
    expect(readDuel(localStorage).version).toBe(6);expect(localStorage.getItem('9zone-zones-v5')).toBe('keep-this');
  });
});
