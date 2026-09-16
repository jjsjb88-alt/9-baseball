import React from 'react';
import {createRoot} from 'react-dom/client';
import PitcherHpHud from './PitcherHpHud.jsx';
import CombatResultSummary from './CombatResultSummary.jsx';
import RunMap from './RunMap.jsx';
import './v10-ui.css';

/* 엔진 없이 V10 UI만 눈으로 확인하는 페이지. 값은 codex/v10-engine-map의 출력 모양을 그대로 베꼈다.
   띄우기: npx vite → /v10-fixture.html
   찍기:   node scripts/v10-ui-shot.mjs <출력폴더> */

const LABELS={battle:'정규 승부',elite:'강적 승부',training:'타격 훈련',locker:'라커룸',shop:'장비 상점',rest:'휴식일',boss:'막 보스'};
const PLAN=[['entry',0,1,'battle'],['fork-a',1,0,'training'],['fork-b',1,2,'elite'],['mid',2,1,'battle'],['late-a',3,0,'shop'],['late-b',3,2,'rest'],['boss',4,1,'boss']];

export function engineRunMap(){
  const nodes=[],edges=[];
  for(let act=1;act<=3;act++){
    for(const [key,row,lane,type] of PLAN)nodes.push({id:`a${act}-${key}`,act,row,lane,type,name:LABELS[type]});
    const id=key=>`a${act}-${key}`;
    edges.push({from:id('entry'),to:id('fork-a')},{from:id('entry'),to:id('fork-b')},
      {from:id('fork-a'),to:id('mid')},{from:id('fork-b'),to:id('mid')},
      {from:id('mid'),to:id('late-a')},{from:id('mid'),to:id('late-b')},
      {from:id('late-a'),to:id('boss')},{from:id('late-b'),to:id('boss')});
    if(act<3)edges.push({from:id('boss'),to:`a${act+1}-entry`});
  }
  return {nodes,edges};
}

export const HP_STATES=[
  {name:'1막 선발 · 강민호',hp:68,maxHp:72,phase:'steady',lastDamage:0},
  {name:'1막 선발 · 강민호',hp:40,maxHp:72,phase:'pressured',lastDamage:12},
  {name:'1막 선발 · 강민호',hp:18,maxHp:72,phase:'critical',lastDamage:30},
  {name:'1막 선발 · 강민호',hp:0,maxHp:72,phase:'defeated',lastDamage:18},
];

export default function V10Fixture(){
  const {nodes,edges}=engineRunMap();
  return (
    <main className="v10-fixture">
      <section className="v10-fixture-block">
        <h2>투수 HP</h2>
        {HP_STATES.map((state,index)=><PitcherHpHud key={index} {...state}/>)}
      </section>
      <section className="v10-fixture-block">
        <h2>이번 공 결과</h2>
        <CombatResultSummary choice={{card:'밀어치기',zone:'바깥쪽 낮은 코스'}} actualPitch={{type:'슬라이더',zone:'한가운데'}} verdict="nearMiss" damage={2} hpAfter={38}/>
      </section>
      <section className="v10-fixture-block">
        <h2>경로 지도</h2>
        <RunMap nodes={nodes} edges={edges} currentNodeId="a1-entry" reachableIds={['a1-fork-a','a1-fork-b']} onSelect={id=>console.log('select',id)}/>
      </section>
    </main>
  );
}

const mount=document.getElementById('root');
if(mount)createRoot(mount).render(<V10Fixture/>);
