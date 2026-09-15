import {CARDS,ZONES} from './cards.js';

const actualZone=revealed=>revealed?.zone===9?'존 밖':ZONES[revealed?.zone]||'코스 미확인';
const covered=revealed=>Array.isArray(revealed?.coverage)&&revealed.coverage.includes(revealed.zone);

export function presentationFor(state){
  const last=state?.last,revealed=state?.battle?.revealed;
  if(last?.kind==='skill'){
    const name=last.text||'준비';
    if(name.startsWith(CARDS.scout.name))return {
      kind:'read',cue:'read',kicker:'READ',title:'읽었다',
      detail:last.events?.[0]||'투수의 릴리스에서 단서를 잡았습니다.'
    };
    if(name.startsWith(CARDS.setup.name))return {kind:'lock',cue:'lock',kicker:'LOCK',title:'타이밍 고정',detail:'다음 스윙의 타구 질을 끌어올립니다.'};
    if(name.startsWith(CARDS.lure.name))return {kind:'expand',cue:'lock',kicker:'EXPAND',title:'범위를 넓혔다',detail:'다음 스윙의 커버가 상하좌우로 확장됩니다.'};
    if(name.startsWith(CARDS.flow.name))return {kind:'signal',cue:'signal',kicker:'SIGN',title:'사인이 걸렸다',detail:'다음 안타에 주자가 한 베이스 더 움직입니다.'};
    if(name.startsWith(CARDS.calm.name))return {kind:'survive',cue:'lock',kicker:'RESET',title:'호흡을 되찾았다',detail:'몰린 카운트에서도 파울 생존력을 높입니다.'};
    if(name.startsWith(CARDS.watch.name))return {kind:'draw',cue:'draw',kicker:'OPTIONS',title:'선택지를 늘렸다',detail:'손패를 채워 다음 판단의 폭을 넓힙니다.'};
    return {kind:'skill',cue:'lock',kicker:'PREPARE',title:'준비 완료',detail:last.text||''};
  }
  if(!revealed)return null;
  const zone=actualZone(revealed),label=revealed.label||'판정';
  if(revealed.kind==='hit'){
    if(label.includes('홈런'))return {kind:'homer',cue:'homer',kicker:'PERFECT CONTACT',title:'넘겼다',detail:`${zone} · 읽은 코스를 가장 크게 돌려줬다`};
    if(label.includes('2루타'))return {kind:'extra',cue:'extra',kicker:'GAP SHOT',title:'갈랐다',detail:`${zone} · 커버 적중, 장타로 연결`};
    return {kind:'hit',cue:'hit',kicker:covered(revealed)?'READ CONFIRMED':'CONTACT',title:'맞혔다',detail:`${zone} · ${label}`};
  }
  if(revealed.kind==='whiff'){
    const strikeout=label.includes('삼진');
    return {kind:'whiff',cue:'whiff',kicker:strikeout?'STRIKE THREE':'MISS',title:strikeout?'놓쳤다':'빗나갔다',
      detail:`${zone} · ${covered(revealed)?'타이밍을 놓쳤다':'스윙 범위 밖으로 빠졌다'}`};
  }
  if(revealed.kind==='foul'){
    const strikeout=label.includes('삼진');
    return {kind:strikeout?'whiff':'foul',cue:strikeout?'whiff':'foul',kicker:strikeout?'STRIKE THREE':'STAY ALIVE',title:strikeout?'끝났다':'살아남았다',detail:`${zone} · ${label}`};
  }
  if(revealed.kind==='ball'){
    const walk=label==='볼넷';
    return {kind:'ball',cue:walk?'walk':'ball',kicker:walk?'TAKE YOUR BASE':'TAKE',title:walk?'참아냈다':'골랐다',detail:walk?'네 개를 골라 1루로 나갑니다.':'존 밖 공을 흘려보냈다.'};
  }
  if(revealed.kind==='called'){
    const strikeout=label.includes('삼진');
    return {kind:'called',cue:strikeout?'strikeout':'called',kicker:strikeout?'CALLED STRIKE THREE':'CALLED STRIKE',title:strikeout?'굳었다':'지켜봤다',detail:`${zone} · 배트를 내지 않았다`};
  }
  if(revealed.kind==='sacrifice')return {kind:'sacrifice',cue:'sacrifice',kicker:'TEAM PLAY',title:'보냈다',detail:`${zone} · 아웃 하나를 주자 진루로 바꿨다`};
  if(revealed.kind==='out')return {kind:'out',cue:'out',kicker:'IN PLAY',title:'잡혔다',detail:`${zone} · ${label}`};
  return {kind:'pitch',cue:'pitch',kicker:'REVEAL',title:label,detail:zone};
}
