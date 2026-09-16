import React from 'react';
import {createRoot} from 'react-dom/client';
import PitcherHpHud from './PitcherHpHud.jsx';
import CombatResultSummary from './CombatResultSummary.jsx';
import RunMap from './RunMap.jsx';
import './v10-ui.css';

/* 엔진 없이 V10 UI만 눈으로 확인하는 페이지. 값은 codex/v10-engine-map의 runMapSelector 출력 모양을
   그대로 베꼈다. 노드의 route·opponent·preview·risk·reward까지 실제 필드 이름을 쓴다.
   띄우기: npx vite → /v10-fixture.html
   찍기:   node scripts/v10-ui-shot.mjs <출력폴더> */

const TYPE_NAMES={battle:'정규 승부',elite:'강적 승부',training:'타격 훈련',locker:'라커룸',shop:'장비 상점',rest:'휴식일',boss:'막 보스'};
const ROUTE_NAMES={development:'육성 루트',steady:'안정 루트',craft:'정비 루트',gauntlet:'강행군',playoff:'플레이오프'};
const UTILITY={
  training:{effect:'카드 강화',detail:'핵심 카드 하나를 강화해 다음 경기부터 역할을 선명하게 만듭니다.',risk:'낮음',reward:'덱 강화'},
  shop:{effect:'전력 보강',detail:'다음 승부 전에 카드·장비 선택지를 확보하는 구간입니다.',risk:'낮음',reward:'선택지 확장'},
  rest:{effect:'컨디션 회복',detail:'다음 전투에서 타선의 타격 기술 +8. 강행군을 끊고 다음 투수를 안정적으로 공략합니다.',risk:'최저',reward:'다음 전투 타격 +8'},
};
const ARCHETYPE_KEYS={'바깥쪽 제구형':'outside','낮은 싱커형':'sinker','높은 공 수비형':'high','반대 코스 승부형':'closer'};
const FOES={
  'a1-entry':['윤태성','바깥쪽 제구형',72,'바깥 코스 비중이 높아 좁은 노림을 흔듭니다.','보통','기본 카드 드래프트'],
  'a1-road':['민재호','낮은 싱커형',92,'낮은 3분할을 오래 압박하고 병살 위험을 만듭니다.','높음','추가 후보가 붙는 카드 드래프트'],
  'a1-develop-game':['강도윤','높은 공 수비형',72,'높은 공과 깊은 수비로 장타 기대값을 낮춥니다.','보통','기본 카드 드래프트'],
  'a1-road-game':['박현우','반대 코스 승부형',80,'이전 노림 반대편을 찌르며 2스트라이크에 존을 넓힙니다.','중상','기본 카드 드래프트'],
  'a1-develop-push':['이시훈','바깥쪽 제구형',92,'바깥 코스 비중이 높아 좁은 노림을 흔듭니다.','높음','추가 후보가 붙는 카드 드래프트'],
  'a1-road-push':['최준혁','낮은 싱커형',100,'낮은 3분할을 오래 압박하고 병살 위험을 만듭니다.','높음','추가 후보가 붙는 카드 드래프트'],
  'a1-boss':['김태겸','반대 코스 승부형',124,'이전 노림 반대편을 찌르며 2스트라이크에 존을 넓힙니다.','최종','막 돌파 보상'],
};
const PLAN=[
  ['entry',0,1,'battle','steady'],
  ['develop',1,0,'training','development'],['road',1,3,'elite','gauntlet'],
  ['develop-game',2,0,'battle','development'],['road-game',2,3,'battle','gauntlet'],
  ['develop-rest',3,0,'rest','development'],['develop-push',3,1,'elite','gauntlet'],
  ['road-cash',3,2,'shop','craft'],['road-push',3,3,'elite','gauntlet'],
  ['boss',4,1,'boss','playoff'],
];
const LINKS=[
  ['entry','develop'],['entry','road'],['develop','develop-game'],['road','road-game'],
  ['develop-game','develop-rest'],['develop-game','develop-push'],
  ['road-game','road-cash'],['road-game','road-push'],
  ['develop-rest','boss'],['develop-push','boss'],['road-cash','boss'],['road-push','boss'],
];

function buildNode(act,[key,row,lane,type,route]){
  const id=`a${act}-${key}`;
  const base={id,act,row,lane,type,name:TYPE_NAMES[type],route,routeLabel:ROUTE_NAMES[route],seed:row*7+lane};
  const foe=FOES[id];
  if(foe){
    const [name,archetype,maxHp,threat,risk,reward]=foe;
    return {...base,opponent:{name,archetype,archetypeKey:ARCHETYPE_KEYS[archetype],maxHp,threat},risk,reward,preview:`${name} · ${archetype} · HP ${maxHp}`};
  }
  const utility=UTILITY[type]||UTILITY.training;
  return {...base,utility,risk:utility.risk,reward:utility.reward,preview:`${utility.effect} · ${utility.detail}`};
}

export function engineRunMap(){
  const nodes=[],edges=[];
  for(let act=1;act<=3;act++){
    for(const spec of PLAN)nodes.push(buildNode(act,spec));
    for(const [from,to] of LINKS)edges.push({from:`a${act}-${from}`,to:`a${act}-${to}`});
    if(act<3)edges.push({from:`a${act}-boss`,to:`a${act+1}-entry`});
  }
  return {nodes,edges};
}

export const HP_STATES=[
  {name:'윤태성 · 바깥쪽 제구형',hp:68,maxHp:72,phase:'steady',lastDamage:0},
  {name:'윤태성 · 바깥쪽 제구형',hp:40,maxHp:72,phase:'pressured',lastDamage:12},
  {name:'윤태성 · 바깥쪽 제구형',hp:18,maxHp:72,phase:'critical',lastDamage:30},
  {name:'윤태성 · 바깥쪽 제구형',hp:0,maxHp:72,phase:'defeated',lastDamage:18},
];

export default function V10Fixture(){
  const {nodes,edges}=engineRunMap();
  const mapOnly=typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('map')==='1';
  const map=<RunMap nodes={nodes} edges={edges} currentNodeId="a1-entry" reachableIds={['a1-develop','a1-road']} onSelect={id=>console.log('select',id)}/>;
  if(mapOnly)return <main className="v10-fixture v10-fixture-map-only">{map}</main>;
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
        {map}
      </section>
    </main>
  );
}

const mount=document.getElementById('root');
if(mount)createRoot(mount).render(<V10Fixture/>);
