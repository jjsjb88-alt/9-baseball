import {CARDS,FACILITIES,RELICS,ZONES,routeChoice} from './cards.js';
import {relationsFor} from './deck.js';

export function rewardLinks(deck,kind){
  const candidate={id:'reward-candidate',kind,plus:false},entries=[candidate,...(deck||[])],seen=new Map();
  const add=(entry,relation,direction)=>{
    if(!entry||!relation)return;
    const key=entry.id+'|'+relation.kind+'|'+relation.why;
    if(!seen.has(key))seen.set(key,{id:entry.id,name:CARDS[entry.kind]?.name||entry.kind,cardKind:entry.kind,kind:relation.kind,why:relation.why,direction});
  };
  const out=relationsFor(candidate,entries);
  for(const entry of deck||[])add(entry,out.get(entry.id),'out');
  for(const entry of deck||[]){
    const inbound=relationsFor(entry,[entry,candidate]).get(candidate.id);
    add(entry,inbound,'in');
  }
  return [...seen.values()];
}

export function failureJourney(state,shot){
  const r=state?.battle?.revealed;if(!r)return null;
  const failure=['whiff','called','out'].includes(r.kind)||String(r.label||'').includes('삼진');
  if(!failure)return null;
  const actual=r.zone===9?'존 밖':ZONES[r.zone]||'미확인',aim=ZONES[r.aimZone]||'미선택',cover=Array.isArray(r.coverage)?r.coverage:[];
  const near=String(shot?.grade||'').startsWith('near-miss'),chase=String(shot?.grade||'').startsWith('chase');
  const cause=near?'커버 경계 한 칸 차이':chase?'존 밖 유인구 추격':r.kind==='called'?'배트를 내지 않음':r.kind==='out'?'맞혔지만 수비에 잡힘':'노림과 실제 공이 어긋남';
  return {
    grade:shot?.grade||r.kind,title:shot?.title||r.label||'실패',detail:shot?.detail||cause,cause,
    steps:[
      {key:'read',label:'READ',title:'노림',text:aim,state:'done'},
      {key:'bet',label:'BET',title:'커버',text:cover.length?cover.length+'존':'스윙 없음',state:cover.includes(r.zone)?'done':near?'near':'warn'},
      {key:'reveal',label:'REVEAL',title:'실제 공',text:actual,state:near?'near':chase?'warn':'done'},
      {key:'impact',label:'IMPACT',title:'결과',text:shot?.title||r.label||'실패',state:'fail'},
    ]
  };
}

const rewardText=r=>{
  if(!r)return null;
  if(r.type==='add')return (CARDS[r.kind]?.name||r.kind)+' 영입';
  if(r.type==='upgrade')return '카드 강화';
  if(r.type==='remove')return '카드 방출';
  if(r.type==='relic')return (RELICS[r.kind]?.name||r.kind)+' 획득';
  return '덱 유지';
};
const facilityText=f=>{
  if(!f)return null;
  if(f.type==='training')return '타격 훈련 · '+(CARDS[f.kind]?.name||'카드')+' 강화';
  if(f.type==='release')return '라커룸 정리 · '+(CARDS[f.kind]?.name||'카드')+' 방출';
  if(f.type==='equipment')return '장비실 · '+(RELICS[f.kind]?.name||f.kind)+' 장착';
  if(f.type==='scouting')return '스카우팅 · 다음 상대 읽기 강화';
  return FACILITIES[f.type]?.name||f.type;
};

export function runStoryItems(s){
  if(!s)return [];
  const items=[{kind:'start',label:'START',title:'무명 타선',text:'9장으로 런 시작'}];
  const routeHistory=s.routeHistory||[],rewards=s.rewards||[],facilities=s.facilities||[];
  for(let i=0;i<routeHistory.length;i++){
    const route=routeChoice(i,routeHistory[i]);
    if(route)items.push({kind:route.statBonus?'rival':'game',label:'GAME '+(i+1),title:route.name,text:route.statBonus?'고위험 상대 격파 · '+route.risk:'승리 · '+route.risk});
    const reward=rewardText(rewards[i]);if(reward)items.push({kind:'reward',label:'DRAFT',title:reward,text:'승리 보상으로 덱 변화'});
    const facility=facilityText(facilities[i]);if(facility)items.push({kind:'facility',label:'BETWEEN',title:facility,text:'다음 경기를 위한 선택'});
  }
  if(s.phase==='won')items.push({kind:'finish',label:'FINISH',title:'런 완주',text:(s.stats?.runs||0)+'득점 · '+(s.stats?.hits||0)+'안타 · '+(s.stats?.walks||0)+'볼넷'});
  else if(s.phase==='lost'){
    const route=routeChoice(s.stage,s.route);
    items.push({kind:'loss',label:'STOP',title:(route?.name||'현재 경기')+'에서 종료',text:'3아웃 · 여기까지 만든 덱과 판단을 다음 런에 남긴다'});
  }
  return items;
}
