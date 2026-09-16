// @vitest-environment happy-dom
import React from 'react';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import PitcherHpHud from '../src/duel/PitcherHpHud.jsx';
import CombatResultSummary from '../src/duel/CombatResultSummary.jsx';
import RunMap from '../src/duel/RunMap.jsx';

const NODES=[
  {id:'n0',type:'battle',depth:0,label:'1회 선발'},
  {id:'n1',type:'training',depth:1,label:'훈련장',reward:'직구 대응 +1',risk:'한 칸을 쓴다'},
  {id:'n2',type:'elite',depth:1,label:'강적 좌완'},
  {id:'n3',type:'rest',depth:1,label:'벤치 휴식'},
  {id:'n4',type:'shop',depth:2,label:'장비점'},
  {id:'n5',type:'locker',depth:2,label:'라커룸'},
  {id:'n6',type:'boss',depth:3,label:'에이스 등판'},
];
const EDGES=[
  {from:'n0',to:'n1'},{from:'n0',to:'n2'},{from:'n0',to:'n3'},
  {from:'n1',to:'n4'},{from:'n2',to:'n4'},{from:'n2',to:'n5'},{from:'n3',to:'n5'},
  {from:'n4',to:'n6'},{from:'n5',to:'n6'},
];
const mapProps=extra=>({nodes:NODES,edges:EDGES,currentNodeId:'n0',reachableIds:['n1','n2','n3'],...extra});
const media=matches=>{
  globalThis.matchMedia=vi.fn(query=>({matches,media:query,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}}));
};

beforeEach(()=>media(false));
afterEach(()=>cleanup());

describe('PitcherHpHud',()=>{
  it('HP 경계마다 국면이 바뀐다',()=>{
    const cases=[[100,'정상'],[61,'정상'],[60,'흔들림'],[31,'흔들림'],[30,'몰림'],[1,'몰림'],[0,'강판']];
    for(const [hp,label] of cases){
      const {unmount}=render(<PitcherHpHud name="좌완 선발" hp={hp} maxHp={100}/>);
      expect(screen.getByTestId('v10-hp-phase').textContent).toBe(label);
      unmount();
    }
  });

  it('엔진이 준 phase가 HP 비율보다 우선한다',()=>{
    render(<PitcherHpHud name="좌완 선발" hp={95} maxHp={100} phase="cornered"/>);
    expect(screen.getByTestId('v10-hp-phase').textContent).toBe('몰림');
  });

  it('피해가 있으면 잔상과 피해 숫자를 낸다',()=>{
    render(<PitcherHpHud name="좌완 선발" hp={62} maxHp={100} lastDamage={8}/>);
    expect(screen.getByTestId('v10-hp-damage').textContent).toBe('-8');
    expect(screen.getByTestId('v10-hp-ghost').style.width).toBe('70%');
  });

  it('damage 0이면 잔상도 피해 숫자도 없다',()=>{
    render(<PitcherHpHud name="좌완 선발" hp={70} maxHp={100} lastDamage={0}/>);
    expect(screen.queryByTestId('v10-hp-damage')).toBeNull();
    expect(screen.queryByTestId('v10-hp-ghost')).toBeNull();
  });

  it('현재 HP를 스크린 리더용 텍스트로 읽어준다',()=>{
    render(<PitcherHpHud name="좌완 선발" hp={42} maxHp={100}/>);
    const sr=screen.getByTestId('v10-hp-sr');
    expect(sr.textContent).toBe('좌완 선발 투수 HP 42 / 100, 흔들림');
    expect(sr.getAttribute('role')).toBe('status');
  });

  it('reduced-motion이면 억제 클래스와 상태를 단다',()=>{
    media(true);
    const {container}=render(<PitcherHpHud name="좌완 선발" hp={50} maxHp={100} lastDamage={6}/>);
    const root=container.querySelector('.v10-hp');
    expect(root.classList.contains('v10-reduced')).toBe(true);
    expect(root.dataset.reduced).toBe('true');
  });

  it('reduced-motion이 아니면 억제 클래스를 달지 않는다',()=>{
    const {container}=render(<PitcherHpHud name="좌완 선발" hp={50} maxHp={100}/>);
    expect(container.querySelector('.v10-hp').classList.contains('v10-reduced')).toBe(false);
  });
});

describe('CombatResultSummary',()=>{
  it('항상 네 줄을 같은 순서로 낸다',()=>{
    render(<CombatResultSummary choice={{card:'밀어치기',zone:'바깥쪽 낮은 코스'}} actualPitch={{type:'슬라이더',zone:'바깥쪽 낮은 코스'}} verdict="hit" damage={6} hpAfter={54}/>);
    const rows=within(screen.getByTestId('v10-result')).getAllByRole('listitem');
    expect(rows.map(row=>row.dataset.row)).toEqual(['choice','pitch','verdict','hp']);
    expect(rows.map(row=>row.querySelector('.v10-result-label').textContent)).toEqual(['내 선택','실제 공','야구 판정','투수 HP']);
  });

  it('선택·실제 공·판정·HP 변화를 그대로 적는다',()=>{
    render(<CombatServiceFixture/>);
    expect(screen.getByTestId('v10-result-choice').textContent).toBe('밀어치기 · 바깥쪽 낮은 코스');
    expect(screen.getByTestId('v10-result-pitch').textContent).toBe('슬라이더 · 한가운데');
    expect(screen.getByTestId('v10-result-verdict').textContent).toBe('한 칸 차이');
    expect(screen.getByTestId('v10-result-hp').textContent).toBe('60 → 58 (-2)');
  });

  it('피해가 0이면 유지로 적는다',()=>{
    render(<CombatResultSummary choice="지켜보기" actualPitch="직구 · 존 밖" verdict="ball" damage={0} hpAfter={60}/>);
    expect(screen.getByTestId('v10-result-hp').textContent).toBe('60 유지');
  });
});
function CombatServiceFixture(){
  return <CombatResultSummary choice={{card:'밀어치기',zone:'바깥쪽 낮은 코스'}} actualPitch={{type:'슬라이더',zone:'한가운데'}} verdict="near" damage={2} hpAfter={58}/>;
}

describe('RunMap',()=>{
  it('노드 종류 이름을 붙여 보여준다',()=>{
    render(<RunMap {...mapProps()}/>);
    const labels=['n0','n1','n2','n3','n4','n5','n6'].map(id=>within(screen.getByTestId(`v10-node-${id}`)).getByText(/.+/,{selector:'.v10-node-type'}).textContent);
    expect(labels).toEqual(['전투','훈련','강적','휴식','장비점','라커룸','보스']);
  });

  it('한 줄에 노드를 다섯 개 이상 늘어놓지 않는다',()=>{
    const wide=Array.from({length:6},(_,i)=>({id:`w${i}`,type:'battle',depth:1}));
    const {container}=render(<RunMap nodes={[{id:'root',type:'battle',depth:0},...wide]} edges={wide.map(n=>({from:'root',to:n.id}))} currentNodeId="root" reachableIds={wide.map(n=>n.id)}/>);
    const counts=[...container.querySelectorAll('.v10-map-row')].map(row=>row.querySelectorAll('.v10-node').length);
    expect(Math.max(...counts)).toBeLessThanOrEqual(4);
    expect(counts.reduce((a,b)=>a+b,0)).toBe(7);
  });

  it('연결 관계를 선으로 그린다',()=>{
    const {container}=render(<RunMap {...mapProps()}/>);
    expect(container.querySelectorAll('.v10-map-edges line').length).toBe(EDGES.length);
    expect(container.querySelectorAll('.v10-edge-live').length).toBe(3);
  });

  it('reachable 노드를 누르면 보상·위험·이후 경로가 보인다',()=>{
    const onSelect=vi.fn();
    render(<RunMap {...mapProps({onSelect})}/>);
    fireEvent.click(screen.getByTestId('v10-node-n1'));
    expect(screen.getByTestId('v10-preview-reward').textContent).toBe('직구 대응 +1');
    expect(screen.getByTestId('v10-preview-risk').textContent).toBe('한 칸을 쓴다');
    expect(screen.getByTestId('v10-preview-next').textContent).toBe('장비점');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('CTA를 눌러야 경로가 확정된다',()=>{
    const onSelect=vi.fn();
    render(<RunMap {...mapProps({onSelect})}/>);
    fireEvent.click(screen.getByTestId('v10-node-n2'));
    fireEvent.click(screen.getByTestId('v10-map-cta'));
    expect(screen.getByTestId('v10-map-cta').textContent).toBe('이 경로로 간다');
    expect(onSelect).toHaveBeenCalledWith('n2');
  });

  it('닿을 수 없는 노드는 눌러도 아무 일도 없다',()=>{
    const onSelect=vi.fn();
    render(<RunMap {...mapProps({onSelect})}/>);
    const locked=screen.getByTestId('v10-node-n6');
    expect(locked.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(locked);
    expect(screen.getByTestId('v10-preview-empty')).toBeTruthy();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('방향키로 지도를 옮겨 다니고 포커스가 따라간다',()=>{
    render(<RunMap {...mapProps()}/>);
    const start=screen.getByTestId('v10-node-n0');
    expect(start.tabIndex).toBe(0);
    start.focus();
    fireEvent.keyDown(start,{key:'ArrowDown'});
    expect(document.activeElement).toBe(screen.getByTestId('v10-node-n1'));
    fireEvent.keyDown(document.activeElement,{key:'ArrowRight'});
    expect(document.activeElement).toBe(screen.getByTestId('v10-node-n2'));
    fireEvent.keyDown(document.activeElement,{key:'ArrowUp'});
    expect(document.activeElement).toBe(screen.getByTestId('v10-node-n0'));
  });

  it('지금 위치를 현재 단계로 표시한다',()=>{
    render(<RunMap {...mapProps()}/>);
    expect(screen.getByTestId('v10-node-n0').getAttribute('aria-current')).toBe('step');
    expect(screen.getByTestId('v10-node-n1').getAttribute('aria-current')).toBeNull();
  });

  it('reduced-motion 상태를 지도에도 단다',()=>{
    media(true);
    const {container}=render(<RunMap {...mapProps()}/>);
    expect(container.querySelector('.v10-map').dataset.reduced).toBe('true');
  });
});

describe('독립성',()=>{
  const FILES=['PitcherHpHud.jsx','CombatResultSummary.jsx','RunMap.jsx','v10-copy.js'];
  it('엔진·카드·저장 모듈을 import하지 않는다',()=>{
    for(const file of FILES){
      const source=readFileSync(resolve(process.cwd(),'src/duel',file),'utf8');
      const imports=[...source.matchAll(/from\s+'([^']+)'/g)].map(match=>match[1]);
      expect(imports.filter(path=>/engine|cards|deck|policy|information|presentation|audio|haptics|ux/.test(path))).toEqual([]);
      expect(imports.every(path=>path==='react'||path==='./v10-copy.js'||path==='./v10-ui.css')).toBe(true);
    }
  });

  it('핵심 선택지 카피에 영어와 기획 용어를 쓰지 않는다',async()=>{
    const {MAP_CTA,MAP_HINT,NODE_TYPES,PHASES,RESULT_LABELS,VERDICTS}=await import('../src/duel/v10-copy.js');
    const choices=[MAP_CTA,MAP_HINT,...Object.values(NODE_TYPES).flatMap(t=>[t.label,t.title,t.reward,t.risk])];
    for(const line of choices)expect(line).not.toMatch(/[A-Za-z]/);
    const all=[...choices,...Object.values(RESULT_LABELS),...Object.values(VERDICTS),...Object.values(PHASES).flatMap(p=>[p.label,p.note])];
    for(const line of all)expect(line).not.toMatch(/역할|축|산출|빌드/);
  });
});
