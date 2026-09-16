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

  it('채움 막대가 직전 HP에서 현재 HP로 내려온다',()=>{
    render(<PitcherHpHud name="좌완 선발" hp={62} maxHp={100} lastDamage={8}/>);
    const fill=screen.getByTestId('v10-hp-fill');
    expect(fill.classList.contains('is-draining')).toBe(true);
    expect(fill.style.getPropertyValue('--v10-hp-from')).toBe('70%');
    expect(fill.style.width).toBe('62%');
  });

  it('damage 0이면 잔상도 피해 숫자도 없다',()=>{
    render(<PitcherHpHud name="좌완 선발" hp={70} maxHp={100} lastDamage={0}/>);
    expect(screen.queryByTestId('v10-hp-damage')).toBeNull();
    expect(screen.queryByTestId('v10-hp-ghost')).toBeNull();
    expect(screen.getByTestId('v10-hp-fill').classList.contains('is-draining')).toBe(false);
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
    expect(labels).toEqual(['정규전','훈련','강적','휴식','영입','정리','결정전']);
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
    expect(container.querySelectorAll('.v10-map-edges .v10-edge').length).toBe(EDGES.length);
    expect(container.querySelectorAll('.v10-edge-live').length).toBe(3);
  });

  it('노드는 카드 상자가 아니라 픽셀 다이아몬드 엠블럼으로 렌더된다',()=>{
    const {container}=render(<RunMap {...mapProps()}/>);
    expect(container.querySelectorAll('.v10-node-core').length).toBe(NODES.length);
    expect(container.querySelectorAll('.v10-map-icon').length).toBeGreaterThanOrEqual(NODES.length);
    for(const node of NODES){
      const button=screen.getByTestId(`v10-node-${node.id}`);
      expect(button.querySelector('.v10-node-core')).toBeTruthy();
      expect(button.querySelector('.v10-map-icon')).toBeTruthy();
    }
  });

  it('현재 노드에서 갈 수 있는 경로만 황금 곡선으로 강조한다',()=>{
    const {container}=render(<RunMap {...mapProps()}/>);
    expect(container.querySelectorAll('.v10-edge-live').length).toBe(3);
    for(const path of container.querySelectorAll('.v10-edge-live'))expect(path.getAttribute('d')).toContain(' C ');
  });

  it('reachable 노드를 누르면 보상·위험·이후 경로가 보인다',()=>{
    const onSelect=vi.fn();
    render(<RunMap {...mapProps({onSelect})}/>);
    fireEvent.click(screen.getByTestId('v10-node-n1'));
    expect(screen.getByTestId('v10-preview-reward').textContent).toBe('직구 대응 +1');
    expect(screen.getByTestId('v10-preview-risk').textContent).toBe('한 칸을 쓴다');
    expect(screen.getByTestId('v10-preview-next').textContent).toBe('장비점');
    expect(screen.getByTestId('v10-map-cta')).toBeTruthy();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('CTA를 눌러야 경로가 확정된다',()=>{
    const onSelect=vi.fn();
    render(<RunMap {...mapProps({onSelect})}/>);
    fireEvent.click(screen.getByTestId('v10-node-n2'));
    fireEvent.click(screen.getByTestId('v10-map-cta'));
    expect(screen.getByTestId('v10-map-cta').textContent).toContain('이 원정으로 간다');
    expect(onSelect).toHaveBeenCalledWith('n2');
  });

  it('닿을 수 없는 노드도 미리 볼 수는 있고 갈 수는 없다',()=>{
    const onSelect=vi.fn();
    render(<RunMap {...mapProps({onSelect})}/>);
    const locked=screen.getByTestId('v10-node-n6');
    expect(locked.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(locked);
    expect(screen.getByTestId('v10-preview-reward').textContent).toBe('다음 막으로 진출한다');
    expect(screen.queryByTestId('v10-map-cta')).toBeNull();
    expect(screen.getByTestId('v10-preview-locked').textContent).toBe('아직 닿지 않는 칸이다. 미리 보기만 된다.');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('칸마다 보상·위험·이동 가능 여부를 스크린 리더에 붙인다',()=>{
    render(<RunMap {...mapProps()}/>);
    const node=screen.getByTestId('v10-node-n1');
    const speech=document.getElementById(node.getAttribute('aria-describedby'));
    expect(speech.textContent).toBe('훈련장. 보상 직구 대응 +1. 위험 한 칸을 쓴다. 갈 수 있다.');
    const locked=screen.getByTestId('v10-node-n6');
    expect(document.getElementById(locked.getAttribute('aria-describedby')).textContent).toContain('아직 갈 수 없다');
  });

  it('포커스만 옮겨도 미리보기가 따라오고 live region으로 읽힌다',()=>{
    const {container}=render(<RunMap {...mapProps()}/>);
    expect(container.querySelector('.v10-preview-live').getAttribute('aria-live')).toBe('polite');
    screen.getByTestId('v10-node-n0').focus();
    fireEvent.keyDown(document.activeElement,{key:'ArrowDown'});
    expect(screen.getByTestId('v10-preview-name').textContent).toBe('훈련장');
    fireEvent.keyDown(document.activeElement,{key:'End'});
    expect(document.activeElement).toBe(screen.getByTestId('v10-node-n3'));
    expect(screen.getByTestId('v10-preview-name').textContent).toBe('컨디션 회복');
    fireEvent.keyDown(document.activeElement,{key:'Home'});
    expect(document.activeElement).toBe(screen.getByTestId('v10-node-n1'));
  });

  it('연결선은 노드 중심을 관통하지 않는 곡선 원정 경로다',()=>{
    const {container}=render(<RunMap {...mapProps()}/>);
    const path=container.querySelector('.v10-map-edges .v10-edge');
    expect(path?.tagName.toLowerCase()).toBe('path');
    expect(path?.getAttribute('d')).toContain(' C ');
    const nums=path.getAttribute('d').match(/-?\\d+(?:\\.\\d+)?/g).map(Number);
    expect(nums[1]).toBeGreaterThan(100/6);
    expect(nums.at(-1)).toBeLessThan(100/6*3);
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

/* codex/v10-engine-map의 createRunMap / pitcherSelector 출력 모양을 그대로 베낀 fixture.
   엔진을 import하지 않고, 통합 이슈 #6에서 맞물릴 형태만 확인한다. */
const ENGINE_LABELS={battle:'정규 승부',elite:'강적 승부',training:'타격 훈련',locker:'라커룸',shop:'장비 상점',rest:'휴식일',boss:'막 보스'};
function engineMap(){
  const nodes=[],edges=[],plan=[['entry',0,1,'battle'],['fork-a',1,0,'training'],['fork-b',1,2,'elite'],['mid',2,1,'battle'],['late-a',3,0,'shop'],['late-b',3,2,'rest'],['boss',4,1,'boss']];
  for(let act=1;act<=3;act++){
    for(const [key,row,lane,type] of plan)nodes.push({id:`a${act}-${key}`,act,row,lane,type,name:ENGINE_LABELS[type],seed:act});
    const id=k=>`a${act}-${k}`;
    edges.push({from:id('entry'),to:id('fork-a')},{from:id('entry'),to:id('fork-b')},{from:id('fork-a'),to:id('mid')},{from:id('fork-b'),to:id('mid')},
      {from:id('mid'),to:id('late-a')},{from:id('mid'),to:id('late-b')},{from:id('late-a'),to:id('boss')},{from:id('late-b'),to:id('boss')});
    if(act<3)edges.push({from:id('boss'),to:`a${act+1}-entry`});
  }
  return {nodes,edges};
}

describe('엔진이 준 상세를 지도에 쓴다',()=>{
  const rich=()=>({
    nodes:[
      {id:'a1-entry',act:1,row:0,lane:1,type:'battle',name:'정규 승부',route:'steady',routeLabel:'안정 루트',
        opponent:{name:'윤태성',archetype:'바깥쪽 제구형',maxHp:72,threat:'바깥 코스 비중이 높아 좁은 노림을 흔듭니다.'},
        risk:'보통',reward:'기본 카드 드래프트',preview:'윤태성 · 바깥쪽 제구형 · HP 72'},
      {id:'a1-road',act:1,row:1,lane:3,type:'elite',name:'강적 승부',route:'gauntlet',routeLabel:'강행군',
        opponent:{name:'민재호',archetype:'낮은 싱커형',maxHp:92,threat:'낮은 3분할을 오래 압박합니다.'},
        risk:'높음',reward:'추가 후보가 붙는 카드 드래프트',preview:'민재호 · 낮은 싱커형 · HP 92'},
      {id:'a1-rest',act:1,row:1,lane:0,type:'rest',name:'휴식일',route:'development',routeLabel:'육성 루트',
        utility:{effect:'컨디션 회복',detail:'다음 전투에서 타선의 타격 기술 +8.'},risk:'최저',reward:'다음 전투 타격 +8',
        preview:'컨디션 회복 · 다음 전투에서 타선의 타격 기술 +8.'},
    ],
    edges:[{from:'a1-entry',to:'a1-road'},{from:'a1-entry',to:'a1-rest'}],
  });

  it('노드에 루트 이름과 상대 요약을 붙인다',()=>{
    const {nodes,edges}=rich();
    render(<RunMap nodes={nodes} edges={edges} currentNodeId="a1-entry" reachableIds={['a1-road','a1-rest']}/>);
    expect(screen.getByTestId('v10-node-route-a1-road').textContent).toBe('강행군');
    expect(screen.getByTestId('v10-node-badge-a1-road').textContent).toBe('민재호 · HP 92');
    expect(screen.getByTestId('v10-node-badge-a1-rest').textContent).toBe('컨디션 회복');
  });

  it('미리보기에 상대와 위협 설명을 그대로 옮긴다',()=>{
    const {nodes,edges}=rich();
    render(<RunMap nodes={nodes} edges={edges} currentNodeId="a1-entry" reachableIds={['a1-road','a1-rest']}/>);
    fireEvent.click(screen.getByTestId('v10-node-a1-road'));
    expect(screen.getByTestId('v10-preview-facing').textContent).toBe('민재호 · 낮은 싱커형 · HP 92');
    expect(screen.getByTestId('v10-preview-reward').textContent).toBe('추가 후보가 붙는 카드 드래프트');
    expect(screen.getByTestId('v10-preview-risk').textContent).toBe('높음');
    expect(screen.getByTestId('v10-preview-why').textContent).toBe('낮은 3분할을 오래 압박합니다.');
  });

  it('상세가 없는 노드는 타입 기본 문구로 떨어진다',()=>{
    render(<RunMap {...mapProps()}/>);
    fireEvent.click(screen.getByTestId('v10-node-n2'));
    expect(screen.queryByTestId('v10-preview-facing')).toBeNull();
    expect(screen.queryByTestId('v10-preview-why')).toBeNull();
    expect(screen.getByTestId('v10-preview-reward').textContent).toBe('보상 후보가 더 넓어진다');
  });

  it('스크린 리더 문구에 루트와 상대를 함께 넣는다',()=>{
    const {nodes,edges}=rich();
    render(<RunMap nodes={nodes} edges={edges} currentNodeId="a1-entry" reachableIds={['a1-road']}/>);
    const node=screen.getByTestId('v10-node-a1-road');
    expect(document.getElementById(node.getAttribute('aria-describedby')).textContent)
      .toBe('강행군 강적 승부. 상대 민재호 · HP 92. 보상 추가 후보가 붙는 카드 드래프트. 위험 높음. 갈 수 있다.');
  });

  it('한 줄에 네 칸이 와도 칸 번호를 지킨다',()=>{
    const nodes=[0,1,2,3].map(lane=>({id:`n${lane}`,act:1,row:1,lane,type:'battle',name:'정규 승부'}));
    const {container}=render(<RunMap nodes={[{id:'top',act:1,row:0,lane:1,type:'battle',name:'정규 승부'},...nodes]}
      edges={nodes.map(n=>({from:'top',to:n.id}))} currentNodeId="top" reachableIds={nodes.map(n=>n.id)}/>);
    const row=[...container.querySelectorAll('.v10-map-row')][1];
    expect(row.dataset.lanes).toBe('4');
    expect(row.querySelectorAll('.v10-node').length).toBe(4);
    expect(screen.getByTestId('v10-node-n3').style.gridColumn).toBe('4');
  });
});

describe('엔진 출력 모양 수용',()=>{
  it('엔진 phase 이름을 그대로 받아 국면 라벨로 옮긴다',()=>{
    const cases=[['steady','정상'],['pressured','흔들림'],['critical','몰림'],['defeated','강판']];
    for(const [phase,label] of cases){
      const {unmount}=render(<PitcherHpHud name="상대 투수" hp={40} maxHp={72} phase={phase}/>);
      expect(screen.getByTestId('v10-hp-phase').textContent).toBe(label);
      unmount();
    }
  });

  it('엔진 피해 키를 한국어 판정으로 옮긴다',()=>{
    const cases=[['homeRun','홈런'],['single','안타'],['triple','3루타'],['inPlayOut','범타 아웃'],['nearMiss','한 칸 차이'],['hardFoul','빗맞은 파울'],['calledStrike','루킹 스트라이크'],['walk','볼넷']];
    for(const [key,label] of cases){
      const {unmount}=render(<CombatResultSummary choice="밀어치기" actualPitch="직구" verdict={key} damage={2} hpAfter={50}/>);
      const text=screen.getByTestId('v10-result-verdict').textContent;
      expect(text).toBe(label);
      expect(text).not.toMatch(/[A-Za-z]/);
      unmount();
    }
  });

  it('지금 있는 막만 펴고 나머지는 접어 둔다',()=>{
    const {nodes,edges}=engineMap();
    const {container}=render(<RunMap nodes={nodes} edges={edges} currentNodeId="a1-entry" reachableIds={['a1-fork-a','a1-fork-b']}/>);
    expect(container.querySelectorAll('.v10-map-row').length).toBe(5);
    expect(container.querySelectorAll('.v10-node').length).toBe(7);
    expect(screen.getByTestId('v10-act-1').getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('v10-act-2').getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByTestId('v10-act-3').getAttribute('aria-expanded')).toBe('false');
  });

  it('막 보스를 깨서 다음 칸이 다음 막에 있으면 그 막도 편다',()=>{
    const {nodes,edges}=engineMap();
    const {container}=render(<RunMap nodes={nodes} edges={edges} currentNodeId="a1-boss" reachableIds={['a2-entry']}/>);
    expect(screen.getByTestId('v10-act-1').getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('v10-act-2').getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('v10-act-3').getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelectorAll('.v10-node.is-open').length).toBe(1);
    expect(screen.getByTestId('v10-node-a2-entry')).toBeTruthy();
  });

  it('갈 수 있는 칸은 언제나 화면에 있다',()=>{
    const {nodes,edges}=engineMap();
    for(const [current,reach] of [['a1-entry',['a1-fork-a']],['a1-boss',['a2-entry']],['a2-boss',['a3-entry']],[null,['a1-entry']]]){
      const {container,unmount}=render(<RunMap nodes={nodes} edges={edges} currentNodeId={current} reachableIds={reach}/>);
      expect(container.querySelectorAll('.v10-node.is-open').length).toBe(reach.length);
      unmount();
    }
  });

  it('접힌 막을 펴고 다시 접을 수 있다',()=>{
    const {nodes,edges}=engineMap();
    const {container}=render(<RunMap nodes={nodes} edges={edges} currentNodeId="a1-entry" reachableIds={['a1-fork-a']}/>);
    fireEvent.click(screen.getByTestId('v10-act-2'));
    expect(container.querySelectorAll('.v10-node').length).toBe(14);
    expect(screen.getByTestId('v10-node-a2-boss')).toBeTruthy();
    fireEvent.click(screen.getByTestId('v10-act-1'));
    expect(container.querySelectorAll('.v10-node').length).toBe(7);
    expect(screen.queryByTestId('v10-node-a1-entry')).toBeNull();
  });

  it('엔진 지도를 act·row·lane 그대로 그린다',()=>{
    const {nodes,edges}=engineMap();
    const {container}=render(<RunMap nodes={nodes} edges={edges} currentNodeId="a1-entry" reachableIds={['a1-fork-a','a1-fork-b']}/>);
    const rows=[...container.querySelectorAll('.v10-map-row')];
    expect(Math.max(...rows.map(row=>row.querySelectorAll('.v10-node').length))).toBeLessThanOrEqual(3);
    expect(screen.getByTestId('v10-node-a1-entry').style.gridColumn).toBe('2');
    expect(screen.getByTestId('v10-node-a1-fork-a').style.gridColumn).toBe('1');
    expect(screen.getByTestId('v10-node-a1-fork-b').style.gridColumn).toBe('3');
    expect(container.querySelectorAll('.v10-map-edges .v10-edge').length).toBe(8);
  });

  it('엔진 노드의 name을 이름으로 쓴다',()=>{
    const {nodes,edges}=engineMap();
    render(<RunMap nodes={nodes} edges={edges} currentNodeId="a1-entry" reachableIds={['a1-fork-b']}/>);
    expect(within(screen.getByTestId('v10-node-a1-fork-b')).getByText('강적 승부')).toBeTruthy();
    fireEvent.click(screen.getByTestId('v10-node-a1-fork-b'));
    expect(screen.getByTestId('v10-preview-next').textContent).toBe('정규 승부');
  });

  it('lane 지도에서도 방향키가 칸 번호를 따라간다',()=>{
    const {nodes,edges}=engineMap();
    render(<RunMap nodes={nodes} edges={edges} currentNodeId="a1-entry" reachableIds={['a1-fork-a','a1-fork-b']}/>);
    const start=screen.getByTestId('v10-node-a1-entry');
    start.focus();
    fireEvent.keyDown(start,{key:'ArrowDown'});
    expect(document.activeElement).toBe(screen.getByTestId('v10-node-a1-fork-a'));
    fireEvent.keyDown(document.activeElement,{key:'ArrowRight'});
    expect(document.activeElement).toBe(screen.getByTestId('v10-node-a1-fork-b'));
    fireEvent.keyDown(document.activeElement,{key:'ArrowDown'});
    expect(document.activeElement).toBe(screen.getByTestId('v10-node-a1-mid'));
  });

  it('엔진이 reachableIds를 비워 보내면 볼 수는 있어도 갈 칸이 없다',()=>{
    const {nodes,edges}=engineMap();
    const onSelect=vi.fn();
    const {container}=render(<RunMap nodes={nodes} edges={edges} currentNodeId="a1-entry" reachableIds={[]} onSelect={onSelect}/>);
    expect(container.querySelectorAll('.v10-node.is-open').length).toBe(0);
    fireEvent.click(screen.getByTestId('v10-node-a1-fork-a'));
    expect(screen.getByTestId('v10-preview-name').textContent).toBe('타격 훈련');
    expect(screen.queryByTestId('v10-map-cta')).toBeNull();
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('독립성',()=>{
  const FILES=['PitcherHpHud.jsx','CombatResultSummary.jsx','RunMap.jsx','v10-copy.js','v10-fixture.jsx'];
  /* 금지 목록은 게임 로직 모듈이다. 상대 경로는 V10 UI 파일 안에서만 돌게 둔다. */
  const GAME_MODULES=/^\.{1,2}\/.*(engine|cards|deck|policy|information|presentation|audio|haptics|ux)/;
  const V10_FILES=/^\.\/v10-[a-z-]+\.(js|jsx|css)$/;
  it('엔진·카드·저장 모듈을 import하지 않는다',()=>{
    for(const file of FILES){
      const source=readFileSync(resolve(process.cwd(),'src/duel',file),'utf8');
      const imports=[...source.matchAll(/from\s+'([^']+)'/g)].map(match=>match[1]);
      const local=imports.filter(path=>path.startsWith('.'));
      expect(local.filter(path=>GAME_MODULES.test(path))).toEqual([]);
      expect(local.filter(path=>!V10_FILES.test(path)&&!/^\.\/(PitcherHpHud|CombatResultSummary|RunMap)\.jsx$/.test(path))).toEqual([]);
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
