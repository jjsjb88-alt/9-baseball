import {CARDS,ZONES} from './cards.js';

const actualZone=revealed=>revealed?.zone===9?'존 밖':ZONES[revealed?.zone]||'코스 미확인';
const covered=revealed=>Array.isArray(revealed?.coverage)&&revealed.coverage.includes(revealed.zone);
const withMotion=(shot,motion)=>({...shot,motion});

const MOTION={
  read:{duration:900,impactAt:120,settleAt:610,freeze:0,haptic:[7,22,7],shake:'none'},
  lock:{duration:760,impactAt:90,settleAt:500,freeze:0,haptic:[5],shake:'none'},
  expand:{duration:820,impactAt:100,settleAt:540,freeze:0,haptic:[5,20,5],shake:'soft'},
  signal:{duration:820,impactAt:110,settleAt:540,freeze:0,haptic:[8,26,8],shake:'soft'},
  survive:{duration:780,impactAt:100,settleAt:520,freeze:0,haptic:[5],shake:'none'},
  draw:{duration:720,impactAt:80,settleAt:470,freeze:0,haptic:[4],shake:'none'},
  hit:{duration:980,impactAt:105,settleAt:670,freeze:58,haptic:[16,18,32],shake:'medium'},
  extra:{duration:1180,impactAt:110,settleAt:790,freeze:72,haptic:[18,18,42,28,24],shake:'strong'},
  homer:{duration:1580,impactAt:120,settleAt:1050,freeze:92,haptic:[24,18,54,34,82],shake:'epic'},
  whiff:{duration:1040,impactAt:115,settleAt:720,freeze:24,haptic:[10],shake:'medium'},
  foul:{duration:900,impactAt:105,settleAt:610,freeze:38,haptic:[10,18,10],shake:'soft'},
  ball:{duration:760,impactAt:95,settleAt:500,freeze:0,haptic:[4],shake:'none'},
  called:{duration:980,impactAt:120,settleAt:670,freeze:42,haptic:[7,46,14],shake:'soft'},
  sacrifice:{duration:900,impactAt:110,settleAt:620,freeze:42,haptic:[9,20,9],shake:'soft'},
  out:{duration:1000,impactAt:115,settleAt:690,freeze:52,haptic:[12,25,18],shake:'medium'},
  pitch:{duration:760,impactAt:100,settleAt:500,freeze:0,haptic:[4],shake:'none'},
};
export const presentationTimeline=(shot,reduced=false)=>{
  const m=shot?.motion||MOTION.pitch;
  if(reduced)return {duration:60,impactAt:8,settleAt:35,freeze:0,haptic:m.haptic,shake:'none'};
  return m;
};

export function presentationFor(state){
  const last=state?.last,revealed=state?.battle?.revealed;
  if(last?.kind==='skill'){
    const name=last.text||'준비';
    if(name.startsWith(CARDS.scout.name))return withMotion({
      kind:'read',cue:'read',kicker:'READ',title:'읽었다',
      detail:last.events?.[0]||'투수의 릴리스에서 단서를 잡았습니다.'
    },MOTION.read);
    if(name.startsWith(CARDS.setup.name))return withMotion({kind:'lock',cue:'lock',kicker:'LOCK',title:'타이밍 고정',detail:'다음 스윙의 타구 질을 끌어올립니다.'},MOTION.lock);
    if(name.startsWith(CARDS.lure.name))return withMotion({kind:'expand',cue:'expand',kicker:'EXPAND',title:'범위를 넓혔다',detail:'다음 스윙의 커버가 상하좌우로 확장됩니다.'},MOTION.expand);
    if(name.startsWith(CARDS.flow.name))return withMotion({kind:'signal',cue:'signal',kicker:'SIGN',title:'사인이 걸렸다',detail:'다음 안타에 주자가 한 베이스 더 움직입니다.'},MOTION.signal);
    if(name.startsWith(CARDS.calm.name))return withMotion({kind:'survive',cue:'reset',kicker:'RESET',title:'호흡을 되찾았다',detail:'몰린 카운트에서도 파울 생존력을 높입니다.'},MOTION.survive);
    if(name.startsWith(CARDS.watch.name))return withMotion({kind:'draw',cue:'draw',kicker:'OPTIONS',title:'선택지를 늘렸다',detail:'손패를 채워 다음 판단의 폭을 넓힙니다.'},MOTION.draw);
    return withMotion({kind:'lock',cue:'lock',kicker:'PREPARE',title:'준비 완료',detail:last.text||''},MOTION.lock);
  }
  if(!revealed)return null;
  const zone=actualZone(revealed),label=revealed.label||'판정';
  if(revealed.kind==='hit'){
    if(label.includes('홈런'))return withMotion({kind:'homer',cue:'homer',kicker:'PERFECT CONTACT',title:'넘겼다',detail:`${zone} · 읽은 코스를 가장 크게 돌려줬다`},MOTION.homer);
    if(label.includes('2루타'))return withMotion({kind:'extra',cue:'extra',kicker:'GAP SHOT',title:'갈랐다',detail:`${zone} · 커버 적중, 장타로 연결`},MOTION.extra);
    return withMotion({kind:'hit',cue:'hit',kicker:covered(revealed)?'READ CONFIRMED':'CONTACT',title:'맞혔다',detail:`${zone} · ${label}`},MOTION.hit);
  }
  if(revealed.kind==='whiff'){
    const strikeout=label.includes('삼진');
    return withMotion({kind:'whiff',cue:strikeout?'strikeout':'whiff',kicker:strikeout?'STRIKE THREE':'MISS',title:strikeout?'놓쳤다':'빗나갔다',
      detail:`${zone} · ${covered(revealed)?'타이밍을 놓쳤다':'스윙 범위 밖으로 빠졌다'}`},MOTION.whiff);
  }
  if(revealed.kind==='foul'){
    const strikeout=label.includes('삼진');
    return withMotion({kind:strikeout?'whiff':'foul',cue:strikeout?'strikeout':'foul',kicker:strikeout?'STRIKE THREE':'STAY ALIVE',title:strikeout?'끝났다':'살아남았다',detail:`${zone} · ${label}`},strikeout?MOTION.whiff:MOTION.foul);
  }
  if(revealed.kind==='ball'){
    const walk=label==='볼넷';
    return withMotion({kind:'ball',cue:walk?'walk':'ball',kicker:walk?'TAKE YOUR BASE':'TAKE',title:walk?'참아냈다':'골랐다',detail:walk?'네 개를 골라 1루로 나갑니다.':'존 밖 공을 흘려보냈다.'},MOTION.ball);
  }
  if(revealed.kind==='called'){
    const strikeout=label.includes('삼진');
    return withMotion({kind:'called',cue:strikeout?'strikeout':'called',kicker:strikeout?'CALLED STRIKE THREE':'CALLED STRIKE',title:strikeout?'굳었다':'지켜봤다',detail:`${zone} · 배트를 내지 않았다`},MOTION.called);
  }
  if(revealed.kind==='sacrifice')return withMotion({kind:'sacrifice',cue:'sacrifice',kicker:'TEAM PLAY',title:'보냈다',detail:`${zone} · 아웃 하나를 주자 진루로 바꿨다`},MOTION.sacrifice);
  if(revealed.kind==='out')return withMotion({kind:'out',cue:'out',kicker:'IN PLAY',title:'잡혔다',detail:`${zone} · ${label}`},MOTION.out);
  return withMotion({kind:'pitch',cue:'pitch',kicker:'REVEAL',title:label,detail:zone},MOTION.pitch);
}
