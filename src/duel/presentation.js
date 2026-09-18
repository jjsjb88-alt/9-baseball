import {CARDS,ZONES} from './cards.js';

const actualZone=revealed=>revealed?.zone===9?'존 밖':ZONES[revealed?.zone]||'코스 미확인';
const covered=revealed=>Array.isArray(revealed?.coverage)&&revealed.coverage.includes(revealed.zone);
const withMotion=(shot,motion)=>({...shot,motion});
const gridDistance=(a,b)=>a>8||b>8?99:Math.max(Math.abs(Math.floor(a/3)-Math.floor(b/3)),Math.abs(a%3-b%3));
const coverageDistance=revealed=>{
  if(!Array.isArray(revealed?.coverage)||revealed.zone>8||!revealed.coverage.length)return 99;
  return Math.min(...revealed.coverage.map(z=>gridDistance(revealed.zone,z)));
};
export function contactGrade(revealed){
  if(!revealed)return 'none';
  const label=revealed.label||'';
  if(revealed.kind==='hit'){
    if(label.includes('홈런'))return 'homer';
    if(label.includes('2루타'))return 'extra';
    if(label.includes('바가지'))return 'lucky';
    if(label.includes('땅볼'))return 'jammed';
    return revealed.aimZone===revealed.zone?'dead-center':'solid';
  }
  if(revealed.kind==='whiff'){
    if(revealed.zone===9)return 'chase';
    const d=coverageDistance(revealed);
    return d===1?'near-miss':'fooled';
  }
  if(revealed.kind==='foul')return revealed.strikesBefore===2?'battle-foul':'foul';
  if(revealed.kind==='called')return label.includes('삼진')?'frozen':'called';
  if(revealed.kind==='ball')return label==='볼넷'?'walk':'ball';
  if(revealed.kind==='out')return 'out';
  if(revealed.kind==='sacrifice')return 'sacrifice';
  return revealed.kind||'pitch';
}

const MOTION={
  read:{duration:900,impactAt:120,settleAt:610,freeze:0,slowmo:0,haptic:[7,22,7],shake:'none'},
  lock:{duration:760,impactAt:90,settleAt:500,freeze:0,slowmo:0,haptic:[5],shake:'none'},
  expand:{duration:820,impactAt:100,settleAt:540,freeze:0,slowmo:0,haptic:[5,20,5],shake:'soft'},
  signal:{duration:820,impactAt:110,settleAt:540,freeze:0,slowmo:0,haptic:[8,26,8],shake:'soft'},
  survive:{duration:780,impactAt:100,settleAt:520,freeze:0,slowmo:0,haptic:[5],shake:'none'},
  draw:{duration:720,impactAt:80,settleAt:470,freeze:0,slowmo:0,haptic:[4],shake:'none'},
  deadCenter:{duration:1180,impactAt:250,settleAt:820,freeze:70,slowmo:100,haptic:[18,18,38],shake:'strong'},
  solid:{duration:1080,impactAt:230,settleAt:760,freeze:58,slowmo:0,haptic:[16,18,32],shake:'medium'},
  jammed:{duration:1240,impactAt:240,settleAt:900,freeze:48,slowmo:180,haptic:[12,22,18],shake:'soft'},
  lucky:{duration:1340,impactAt:245,settleAt:960,freeze:42,slowmo:260,haptic:[10,28,12],shake:'soft'},
  extra:{duration:1380,impactAt:260,settleAt:960,freeze:72,slowmo:120,haptic:[18,18,42,28,24],shake:'strong'},
  homer:{duration:1820,impactAt:300,settleAt:1280,freeze:92,slowmo:180,haptic:[24,18,54,34,82],shake:'epic'},
  grandSlam:{duration:2320,impactAt:330,settleAt:1660,freeze:110,slowmo:260,haptic:[32,20,70,38,110,45,140],shake:'epic'},
  nearMiss:{duration:1460,impactAt:250,settleAt:1050,freeze:24,slowmo:360,haptic:[8,70,10],shake:'soft'},
  chase:{duration:1120,impactAt:240,settleAt:800,freeze:18,slowmo:0,haptic:[9],shake:'medium'},
  fooled:{duration:1180,impactAt:250,settleAt:840,freeze:22,slowmo:80,haptic:[10],shake:'medium'},
  foul:{duration:980,impactAt:220,settleAt:680,freeze:38,slowmo:0,haptic:[10,18,10],shake:'soft'},
  battleFoul:{duration:1160,impactAt:230,settleAt:830,freeze:42,slowmo:90,haptic:[11,20,11],shake:'soft'},
  ball:{duration:820,impactAt:200,settleAt:560,freeze:0,slowmo:0,haptic:[4],shake:'none'},
  called:{duration:1060,impactAt:250,settleAt:740,freeze:42,slowmo:0,haptic:[7,46,14],shake:'soft'},
  sacrifice:{duration:1000,impactAt:230,settleAt:700,freeze:42,slowmo:0,haptic:[9,20,9],shake:'soft'},
  out:{duration:1100,impactAt:240,settleAt:770,freeze:52,slowmo:0,haptic:[12,25,18],shake:'medium'},
  pitch:{duration:850,impactAt:210,settleAt:570,freeze:0,slowmo:0,haptic:[4],shake:'none'},
};
export const presentationTimeline=(shot,reduced=false)=>{
  const m=shot?.motion||MOTION.pitch;
  if(reduced)return {duration:60,impactAt:8,settleAt:35,freeze:0,slowmo:0,releaseAt:12,haptic:m.haptic,shake:'none'};
  return {...m,releaseAt:m.impactAt+m.freeze+(m.slowmo||0)};
};

export function presentationFor(state){
  const last=state?.last,revealed=state?.battle?.revealed;
  if(last?.kind==='skill'){
    const name=last.text||'준비';
    if(name.startsWith(CARDS.scout.name))return withMotion({
      kind:'read',grade:'read',cue:'read',kicker:'READ',title:'읽었다',
      detail:last.events?.[0]||'투수의 릴리스에서 단서를 잡았습니다.'
    },MOTION.read);
    if(name.startsWith(CARDS.setup.name))return withMotion({kind:'lock',grade:'lock',cue:'lock',kicker:'LOCK',title:'타이밍 고정',detail:'다음 스윙의 타구 질을 끌어올립니다.'},MOTION.lock);
    if(name.startsWith(CARDS.lure.name))return withMotion({kind:'expand',grade:'expand',cue:'expand',kicker:'EXPAND',title:'범위를 넓혔다',detail:'다음 스윙의 커버가 상하좌우로 확장됩니다.'},MOTION.expand);
    if(name.startsWith(CARDS.flow.name))return withMotion({kind:'signal',grade:'signal',cue:'signal',kicker:'SIGN',title:'사인이 걸렸다',detail:'다음 안타에 주자가 한 베이스 더 움직입니다.'},MOTION.signal);
    if(name.startsWith(CARDS.calm.name))return withMotion({kind:'survive',grade:'survive',cue:'reset',kicker:'RESET',title:'호흡을 되찾았다',detail:'몰린 카운트에서도 파울 생존력을 높입니다.'},MOTION.survive);
    if(name.startsWith(CARDS.watch.name))return withMotion({kind:'draw',grade:'draw',cue:'draw',kicker:'OPTIONS',title:'선택지를 늘렸다',detail:'손패를 채워 다음 판단의 폭을 넓힙니다.'},MOTION.draw);
    return withMotion({kind:'lock',grade:'lock',cue:'lock',kicker:'PREPARE',title:'준비 완료',detail:last.text||''},MOTION.lock);
  }
  if(!revealed)return null;
  const zone=actualZone(revealed),label=revealed.label||'판정',grade=contactGrade(revealed);
  if(revealed.kind==='hit'){
    if(grade==='homer'&&(last?.runs||0)>=4)return withMotion({kind:'grand-slam',grade:'grand-slam',cue:'grandSlam',kicker:'GRAND SLAM',title:'싹쓸었다',detail:`${zone} · 네 명이 모두 홈으로 돌아온다`},MOTION.grandSlam);
    if(grade==='homer')return withMotion({kind:'homer',grade,cue:'homer',kicker:'PERFECT CONTACT',title:'넘겼다',detail:`${zone} · 기다린 공을 가장 크게 돌려줬다`},MOTION.homer);
    if(grade==='extra')return withMotion({kind:'extra',grade,cue:'extra',kicker:'GAP SHOT',title:'갈랐다',detail:`${zone} · 수비 사이를 찢은 장타`},MOTION.extra);
    if(grade==='lucky')return withMotion({kind:'lucky',grade,cue:'lucky',kicker:'JUST ENOUGH',title:'떨어졌다',detail:`${zone} · 빗맞았지만 수비 사이에 떨어졌다`},MOTION.lucky);
    if(grade==='jammed')return withMotion({kind:'jammed',grade,cue:'jammed',kicker:'JAM SHOT',title:'빠졌다',detail:`${zone} · 빗맞았지만 코스는 읽었다`},MOTION.jammed);
    if(grade==='dead-center')return withMotion({kind:'dead-center',grade,cue:'deadCenter',kicker:'DEAD CENTER',title:'정확히 맞혔다',detail:`${zone} · 노린 존과 실제 공이 정확히 겹쳤다`},MOTION.deadCenter);
    return withMotion({kind:'hit',grade,cue:'hit',kicker:covered(revealed)?'READ CONFIRMED':'CONTACT',title:'맞혔다',detail:`${zone} · ${label}`},MOTION.solid);
  }
  if(revealed.kind==='whiff'){
    const strikeout=label.includes('삼진');
    if(strikeout&&grade==='near-miss')return withMotion({kind:'near-miss',grade:'near-miss-k',cue:'nearMiss',kicker:'JUST MISSED · K',title:'한 칸 차이로 끝',detail:`${zone} · 마지막 공이 커버 바로 옆을 통과했다`},MOTION.nearMiss);
    if(strikeout&&grade==='chase')return withMotion({kind:'chase',grade:'chase-k',cue:'strikeout',kicker:'CHASED · K',title:'쫓아가다 끝',detail:'존 밖 유인구에 마지막 스윙을 내줬다'},MOTION.chase);
    if(strikeout)return withMotion({kind:'whiff',grade:'strikeout',cue:'strikeout',kicker:'STRIKE THREE',title:'놓쳤다',detail:`${zone} · 이 타석은 여기서 끝`},MOTION.fooled);
    if(grade==='near-miss')return withMotion({kind:'near-miss',grade,cue:'nearMiss',kicker:'JUST MISSED',title:'한 칸 차이',detail:`${zone} · 커버 바로 옆을 통과했다`},MOTION.nearMiss);
    if(grade==='chase')return withMotion({kind:'chase',grade,cue:'chase',kicker:'CHASED',title:'쫓았다',detail:'존 밖 공에 배트가 따라 나갔다'},MOTION.chase);
    return withMotion({kind:'whiff',grade,cue:'fooled',kicker:'WRONG READ',title:'속았다',detail:`${zone} · 기다린 범위에서 멀어졌다`},MOTION.fooled);
  }
  if(revealed.kind==='foul'){
    const strikeout=label.includes('삼진');
    if(strikeout)return withMotion({kind:'whiff',grade:'strikeout',cue:'strikeout',kicker:'STRIKE THREE',title:'끝났다',detail:`${zone} · 번트 파울 삼진`},MOTION.fooled);
    if(grade==='battle-foul')return withMotion({kind:'battle-foul',grade,cue:'battleFoul',kicker:'TWO STRIKES · ALIVE',title:'끝까지 버텼다',detail:`${zone} · 마지막 스트라이크를 파울로 지웠다`},MOTION.battleFoul);
    return withMotion({kind:'foul',grade,cue:'foul',kicker:'STAY ALIVE',title:'살아남았다',detail:`${zone} · ${label}`},MOTION.foul);
  }
  if(revealed.kind==='ball'){
    const walk=label==='볼넷';
    if(walk&&(last?.runs||0)>0)return withMotion({kind:'walk-rbi',grade:'walk-rbi',cue:'walkRbi',kicker:'FORCED HOME',title:'밀어냈다',detail:'볼넷 하나로 주자가 홈을 밟았다'},MOTION.ball);
    return withMotion({kind:'ball',grade,cue:walk?'walk':'ball',kicker:walk?'TAKE YOUR BASE':'TAKE',title:walk?'참아냈다':'골랐다',detail:walk?'네 개를 골라 1루로 나갑니다.':'존 밖 공을 흘려보냈다.'},MOTION.ball);
  }
  if(revealed.kind==='called'){
    const strikeout=label.includes('삼진');
    return withMotion({kind:'called',grade,cue:strikeout?'strikeout':'called',kicker:strikeout?'CALLED STRIKE THREE':'CALLED STRIKE',title:strikeout?'굳었다':'지켜봤다',detail:`${zone} · 배트를 내지 않았다`},MOTION.called);
  }
  if(revealed.kind==='sacrifice'){
    if((last?.runs||0)>0)return withMotion({kind:'sacrifice-run',grade:'sacrifice-run',cue:'sacrifice',kicker:'PRODUCTIVE OUT',title:'점을 만들었다',detail:`${zone} · 아웃 하나를 득점으로 바꿨다`},MOTION.sacrifice);
    return withMotion({kind:'sacrifice',grade,cue:'sacrifice',kicker:'TEAM PLAY',title:'보냈다',detail:`${zone} · 아웃 하나를 주자 진루로 바꿨다`},MOTION.sacrifice);
  }
  if(revealed.kind==='out')return withMotion({kind:'out',grade,cue:'out',kicker:'IN PLAY',title:'잡혔다',detail:`${zone} · ${label}`},MOTION.out);
  return withMotion({kind:'pitch',grade:'pitch',cue:'pitch',kicker:'REVEAL',title:label,detail:zone},MOTION.pitch);
}
