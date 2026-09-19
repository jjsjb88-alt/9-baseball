import React,{useEffect,useId,useRef,useState} from 'react';
import {CARDS,TYPE_NAMES,STAGES,GLOSSARY,LINEUP,BUILDS,ZONES,GROWTHS,growthCost,rewardChoices,AXES,AXIS_NAMES,ROLES,REWARD_ACTIONS,AFFINITY_CARDS,upgradeText,canUpgrade,DECK_MIN,DECK_MAX,
  READ_LEVELS,RELICS,RELIC_OFFERS,bandFor,rangeFor,shadeFor,shadeNameFor,observeScore,cardText,ZONE_ORDER,DECKBUILDER_BUILD,FACILITIES,FACILITY_ROUTES,ROUTE_CHOICES,routeChoice} from './cards.js';
import {createDuel,startBattle,chooseRoute,battleTarget,playCard,endTurn,chooseReward,chooseFacility,facilityProblem,previewCard,readDuel,saveDuel,advanceBatter,currentBatter,advancePitch,setAimZone,coverage,publicProbabilities,pitchClue,matchup,setGrowthMode,growthProblem,readLevel,knownPitchZones} from './engine.js';
import {createV10Duel,enterV10Node,playV10Action,advanceV10Pitch,advanceV10Batter,claimV10Reward,
  v10UtilityOptions,completeV10UtilityNode,v10RewardOptions,selectV10Pitcher,selectV10Combat,selectV10Map,v10NodeProblem,
  saveV10Duel,readV10Duel,previewV10Stack,V10_SWING_STACK_MAX,V10_SWING_DAMAGE_RATES} from './engine.js';
import {deckProfile,diagnose,applyRewardToDeck,rewardProblem,profileDelta,relationsFor,growthConflict} from './deck.js';
import './duel.css';
import {coverageText} from './information.js';
import {cue} from './audio.js';
import {presentationFor,presentationTimeline} from './presentation.js';
import {haptic} from './haptics.js';
import PixelVFX from './PixelVFX.jsx';
import PitcherHpHud from './PitcherHpHud.jsx';
import CombatResultSummary from './CombatResultSummary.jsx';
import RunMap from './RunMap.jsx';
import ArenaRenderer2 from './ArenaRenderer2.jsx';
import GoldenMasterStage from './GoldenMasterStage.jsx';
import SmoothActor from './SmoothActor.jsx';
import {rewardLinks,failureJourney,runStoryItems} from './ux.js';
import batterIdle from '../../assets/sprites-v1/batter-idle.png';
import batterLoad from '../../assets/sprites-v1/batter-load.png';
import batterContact from '../../assets/sprites-v1/batter-contact.png';
import batterFollow from '../../assets/sprites-v1/batter-follow.png';
import batterHomer from '../../assets/sprites-v1/batter-homerun.png';
import batterMiss from '../../assets/sprites-v1/batter-miss.png';
import pitcherIdle from '../../assets/sprites-v1/pitcher-idle.png';
import pitcherSet from '../../assets/sprites-v1/pitcher-set.png';
import pitcherLegkick from '../../assets/sprites-v1/pitcher-legkick.png';
import pitcherRelease from '../../assets/sprites-v1/pitcher-release.png';
import pitcherFollow from '../../assets/sprites-v1/pitcher-follow.png';
import pitcherStrikeout from '../../assets/sprites-v1/pitcher-strikeout.png';
import batterHomerHeroV3 from '../../assets/sprites-v3/batter-homer-hero.svg';
import pitcherSinkerReleaseV3 from '../../assets/sprites-v3/pitcher-sinker-release.svg';
import pitcherHighReleaseV3 from '../../assets/sprites-v3/pitcher-high-release.svg';
import pitcherCloserReleaseV3 from '../../assets/sprites-v3/pitcher-closer-release.svg';

/* 엔진은 lastCombat.choice를 카드 kind로, actualPitch를 존 번호로 준다. 화면 문구로 옮기는 건 연결부 일이다. */
const v10ZoneName=zone=>zone===9?'존 밖':ZONES[zone]||'코스 미확인';
const v10ChoiceName=kind=>kind==='take'?'한 구 지켜보기':kind==='basic'?'기본 스윙':CARDS[kind]?.name||kind;
const V10_UTILITY_PHASES=['training','locker','shop','rest'];
const V10_UTILITY_TITLES={training:'타격 훈련',locker:'라커룸',shop:'장비 상점',rest:'휴식일'};
const V10_UTILITY_NOTES={upgrade:'이 카드를 강화한다',remove:'이 카드를 덱에서 뺀다',add:'이 카드를 덱에 넣는다',rest:'다음 전투에서 타격 기술 +8'};
/* 조건에 걸려 고를 게 하나도 없는 칸이 있다. 빈 화면 대신 이유를 적는다. */
const PITCHER_FORM_KEYS=new Set(['outside','sinker','high','closer']);
const pitcherFormKey=key=>PITCHER_FORM_KEYS.has(key)?key:'outside';
const V10_UTILITY_EMPTY={
  training:'지금 강화할 수 있는 카드가 없습니다. 강화는 카드마다 한 번까지입니다.',
  locker:`덱이 최소 ${DECK_MIN}장이라 지금은 뺄 카드가 없습니다. 카드를 더 모은 뒤에 다시 들르세요.`,
  shop:`덱이 최대 ${DECK_MAX}장이라 더 넣을 수 없습니다.`,
  rest:'지금은 회복할 것이 없습니다.',
};

const sortGlob=m=>Object.entries(m).sort(([a],[b])=>a.localeCompare(b)).map(([,url])=>url);
const BATTER_SWING_V2=sortGlob(import.meta.glob('../../assets/sprites-v2/frames/batter-swing-*.png',{eager:true,import:'default'}));
const BATTER_MISS_V2=sortGlob(import.meta.glob('../../assets/sprites-v2/frames/batter-miss-*.png',{eager:true,import:'default'}));
const PITCHER_PITCH_V2=sortGlob(import.meta.glob('../../assets/sprites-v2/frames/pitcher-pitch-*.png',{eager:true,import:'default'}));
const PITCHER_K_V2=sortGlob(import.meta.glob('../../assets/sprites-v2/frames/pitcher-strikeout-*.png',{eager:true,import:'default'}));
const V2_FALLBACKS={
  batter:{
    idle:()=>BATTER_SWING_V2[0],load:()=>BATTER_SWING_V2[3]||BATTER_SWING_V2[0],contact:()=>BATTER_SWING_V2[6]||BATTER_SWING_V2.at(-1),
    follow:()=>BATTER_SWING_V2[10]||BATTER_SWING_V2.at(-1),homer:()=>BATTER_SWING_V2[11]||BATTER_SWING_V2.at(-1),miss:()=>BATTER_MISS_V2[4]||BATTER_MISS_V2.at(-1)
  },
  pitcher:{
    idle:()=>PITCHER_PITCH_V2[0],set:()=>PITCHER_PITCH_V2[1]||PITCHER_PITCH_V2[0],legkick:()=>PITCHER_PITCH_V2[4]||PITCHER_PITCH_V2[0],
    release:()=>PITCHER_PITCH_V2[7]||PITCHER_PITCH_V2.at(-1),follow:()=>PITCHER_PITCH_V2[10]||PITCHER_PITCH_V2.at(-1),strikeout:()=>PITCHER_K_V2[5]||PITCHER_K_V2.at(-1)
  }
};

const TOUR_KEY='9zone-zones-tour-v5';
const TOUR_STEPS=[
  {eyebrow:'WELCOME 1 / 6',target:'scoreboard',title:'먼저 전광판을 봅니다',text:'현재 타자, 다음 타자, 목표 득점, 스트라이크, 아웃을 여기서 먼저 확인하세요. 가장 먼저 읽어야 하는 정보입니다.',tip:'지금 밝게 보이는 전광판만 먼저 확인하면 됩니다.'},
  {eyebrow:'WELCOME 2 / 6',target:'arena',title:'가운데는 승부 상황입니다',text:'투수의 경향과 주자를 읽으세요. 아래 9존에서 코스를 선택하고 카드마다 달라지는 커버 범위를 확인합니다.',tip:'투수 의도와 주자 배치를 같이 읽어보세요.'},
  {eyebrow:'WELCOME 3 / 6',target:'prepare',title:'첫 번째 행동 · 준비하기',text:'준비하기는 타석을 바로 끝내지 않고 다음 스윙을 유리하게 만드는 행동입니다. 한 타석에서 최대 두 번까지 사용할 수 있습니다.',tip:'당장 치기보다 먼저 세팅하고 싶을 때 사용합니다.'},
  {eyebrow:'WELCOME 4 / 6',target:'swing',title:'두 번째 행동 · 카드를 존에 놓고 스윙',text:'스윙을 열면 손패 카드를 9존에 직접 놓습니다. 첫 카드가 타격 효과를, 추가 카드는 빈 코스를 커버합니다. 최대 4장까지 배치할 수 있습니다.',tip:'카드 탭 → 존 탭, 또는 카드 자체를 존으로 드래그하세요.'},
  {eyebrow:'WELCOME 5 / 6',target:'watch',title:'세 번째 행동 · 한 구 지켜보기',text:'존 밖 공이면 볼, 존 안이면 스트라이크입니다. 4볼은 볼넷, 3스트라이크는 삼진. 다음 공으로 진행하면 카드 한 장을 뽑습니다.',tip:'손패가 아쉽거나 바로 승부하고 싶지 않을 때 사용합니다.'},
  {eyebrow:'WELCOME 6 / 6',target:'events',title:'마지막은 결과를 확인합니다',text:'여기에서 방금 벌어진 일을 확인하세요. 한 공 뒤에는 실제 코스를 확인합니다. 다음 공은 같은 타자, 타석 종료 뒤에는 다음 타자 입장입니다.',tip:'결과 확인 → 다음 타자. 이 흐름만 기억하면 됩니다.'},
];

const iconPaths={bat:'M8 26L25 7L29 7L29 11L11 28Z',shield:'M7 6H25V20L16 29L7 20Z',eye:'M3 14L10 8H22L29 14V18L22 24H10L3 18ZM13 12V20H19V12Z',book:'M4 7H14L16 9L18 7H28V25H18L16 27L14 25H4Z',ball:'M10 5H22L27 10V22L22 27H10L5 22V10ZM10 10V22H12V10ZM20 10V22H22V10Z',comet:'M3 5L19 11L25 11L29 15V23L23 29H15L11 25L9 17ZM15 17V23H23V17Z',double:'M4 9H12V17H4ZM20 17H28V25H20ZM12 17H20V19H12Z',diamond:'M16 3L29 16L16 29L3 16ZM16 9L9 16L16 23L23 16Z',target:'M5 5H27V27H5ZM9 9V23H23V9ZM13 13H19V19H13Z',spark:'M18 2L6 19H14L12 30L27 12H18Z',moon:'M15 3H21L17 7V17L23 23H29L25 28H13L5 20V10L10 5Z',sun:'M13 2H19V7H13ZM13 25H19V30H13ZM2 13H7V19H2ZM25 13H30V19H25ZM10 10H22V22H10Z'};
function PixelIcon({art}){return <svg viewBox="0 0 32 32" aria-hidden="true" shapeRendering="crispEdges"><path fill="currentColor" fillRule="evenodd" d={iconPaths[art]}/></svg>;}
// A card is a deck part, not a command button: role, coverage axis and what it produces are always visible.
function Card({kind,plus,onClick,selected,problem,preview,label,relation,note,disabled}){
  const c=CARDS[kind];
  return <button type="button" disabled={disabled} className={`duel-card ${c.type} ${selected?'selected':''} ${problem||disabled?'unavailable':''} ${relation?'rel-'+relation.kind:''}`}
    onClick={onClick} aria-label={(label||c.name)+(plus?' 강화':'')} aria-pressed={!!selected}>
    <span className="card-cost">{c.type==='skill'?'준비':'스윙'}</span>
    <span className="card-type">{c.role} · {c.axis?AXIS_NAMES[c.axis]:'타석 준비'}</span>
    <div className="card-art">{preview?.coverage?<CoverageMini zones={preview.coverage}/>:<PixelIcon art={c.art}/>}</div>
    <strong>{c.name}{plus&&<i className="card-plus" aria-label="강화됨">+</i>}</strong>
    <span className="card-gives">{(plus?[]:c.gives).map(g=><i key={g}>{g}</i>)}{c.needs.map(n=><i key={n} className="need">{n}</i>)}</span>
    <span className="card-rule">{problem||cardText(kind,plus)}</span>
    {plus&&upgradeText(kind)&&<span className="card-upgrade">강화 · {upgradeText(kind)}</span>}
    {relation&&<span className={'card-relation '+relation.kind}>{relation.kind==='synergy'?'연계':'상충'} · {relation.why}</span>}
    {note&&<span className="card-note">{note}</span>}
    <span className={'card-foot '+(preview?.outs?'out-warning':preview?.runs?'run-reward':'')}>{preview&&!preview.problem&&preview.sacrifice>0?'희생 작전 · 안타 아님':preview&&!preview.problem&&preview.hit!=null?preview.coverageLabel:c.flavor}</span></button>;
}
function CoverageMini({zones}){return <div className="coverage-mini" aria-label={'커버 '+zones.length+'칸'}>{ZONES.map((_,z)=><i key={z} className={zones.includes(z)?'filled':''}/>)}</div>;}
const BATTER_POSES={idle:batterIdle,load:batterLoad,contact:batterContact,follow:batterFollow,homer:batterHomer,miss:batterMiss};
const PITCHER_POSES={idle:pitcherIdle,set:pitcherSet,legkick:pitcherLegkick,release:pitcherRelease,follow:pitcherFollow,strikeout:pitcherStrikeout};
const PITCHER_RELEASE_V3={sinker:pitcherSinkerReleaseV3,high:pitcherHighReleaseV3,closer:pitcherCloserReleaseV3};
const ACTOR_ASSETS=[...new Set([...BATTER_SWING_V2,...BATTER_MISS_V2,...PITCHER_PITCH_V2,...PITCHER_K_V2,batterHomerHeroV3,...Object.values(PITCHER_RELEASE_V3)])];
function useActorAssetPreload(){
  useEffect(()=>{
    if(typeof Image==='undefined')return;
    const images=ACTOR_ASSETS.map(src=>{const img=new Image();img.decoding='async';img.src=src;img.decode?.().catch(()=>{});return img;});
    return ()=>images.forEach(img=>{img.onload=null;img.onerror=null;});
  },[]);
}
const authoredActorArt=(who,pose,stage,shot,variant)=>{
  if(who==='batter'&&pose==='homer'&&['release','settle'].includes(stage)&&['homer','grand-slam'].includes(shot?.grade))return batterHomerHeroV3;
  if(who==='pitcher'&&PITCHER_RELEASE_V3[variant]&&stage==='slowmo'&&!(shot?.grade==='strikeout'||shot?.grade?.endsWith('-k')))return PITCHER_RELEASE_V3[variant];
  return null;
};
function actorPose(who,stage,shot){
  if(who==='pitcher'){
    if(!shot)return 'idle';
    if(stage==='windup')return 'legkick';
    if(stage==='impact')return 'release';
    if(stage==='slowmo')return 'release';
    if(stage==='release')return shot.grade?.includes('strikeout')||shot.grade?.includes('-k')?'strikeout':'follow';
    return stage==='settle'?'follow':'set';
  }
  if(!shot)return 'idle';
  const hit=['dead-center','solid','jammed','lucky','extra','homer','grand-slam'].includes(shot.grade);
  const miss=['near-miss','near-miss-k','chase','chase-k','fooled','strikeout'].includes(shot.grade);
  if(stage==='windup')return hit||miss?'load':'idle';
  if(stage==='impact'||stage==='slowmo')return hit?'contact':miss?'miss':'idle';
  if(stage==='release')return ['homer','grand-slam'].includes(shot.grade)?'homer':hit?'follow':miss?'miss':'idle';
  if(stage==='settle')return ['homer','grand-slam'].includes(shot.grade)?'homer':hit?'follow':miss?'miss':'idle';
  return 'idle';
}
function stageDuration(stage,shot){
  const m=shot?.motion;if(!m)return 0;
  if(stage==='windup')return m.impactAt;
  if(stage==='impact')return Math.max(45,m.freeze||45);
  if(stage==='slowmo')return Math.max(60,m.slowmo||60);
  if(stage==='release')return Math.max(100,m.settleAt-(m.impactAt+(m.freeze||0)+(m.slowmo||0)));
  if(stage==='settle')return Math.max(80,m.duration-m.settleAt);
  return 0;
}
const sequencePlaybackDuration=(stage,duration,count)=>{
  const minFrameMs=stage==='impact'?38:stage==='windup'?44:48;
  const cap=stage==='release'?260:stage==='settle'?180:stage==='windup'?320:stage==='impact'?120:220;
  return Math.min(Math.max(minFrameMs*Math.max(1,count-1),80),Math.max(80,Math.min(duration,cap)));
};
function sequenceSpec(who,stage,shot){
  if(!stage||!shot||['read','lock','expand','signal','survive','draw'].includes(shot.grade))return null;
  const hit=['dead-center','solid','jammed','lucky','extra','homer','grand-slam'].includes(shot.grade);
  const miss=['near-miss','near-miss-k','chase','chase-k','fooled','strikeout'].includes(shot.grade);
  if(who==='pitcher'){
    if((shot.grade==='strikeout'||shot.grade?.endsWith('-k'))&&stage==='release')
      return {frames:PITCHER_K_V2,start:0,end:PITCHER_K_V2.length-1,duration:sequencePlaybackDuration(stage,stageDuration(stage,shot),PITCHER_K_V2.length)};
    if((shot.grade==='strikeout'||shot.grade?.endsWith('-k'))&&stage==='settle')
      return {frames:PITCHER_K_V2,start:PITCHER_K_V2.length-1,end:PITCHER_K_V2.length-1,duration:0};
    const ranges={windup:[0,5],impact:[6,7],slowmo:[7,7],release:[8,11],settle:[11,11]},r=ranges[stage];
    return r?{frames:PITCHER_PITCH_V2,start:r[0],end:r[1],duration:sequencePlaybackDuration(stage,stageDuration(stage,shot),r[1]-r[0]+1)}:null;
  }
  if(hit){
    if(['homer','grand-slam'].includes(shot.grade)&&['release','settle'].includes(stage))return null;
    const ranges={windup:[0,4],impact:[5,6],slowmo:[6,6],release:[7,11],settle:[11,11]},r=ranges[stage];
    return r?{frames:BATTER_SWING_V2,start:r[0],end:r[1],duration:sequencePlaybackDuration(stage,stageDuration(stage,shot),r[1]-r[0]+1)}:null;
  }
  if(miss){
    const ranges={windup:[0,2],impact:[3,4],slowmo:[4,4],release:[4,5],settle:[5,5]},r=ranges[stage];
    return r?{frames:BATTER_MISS_V2,start:r[0],end:r[1],duration:sequencePlaybackDuration(stage,stageDuration(stage,shot),r[1]-r[0]+1)}:null;
  }
  return null;
}
function useSpriteFrame(spec,key){
  const [index,setIndex]=useState(spec?.start||0);
  useEffect(()=>{
    if(!spec?.frames?.length){setIndex(0);return;}
    const start=spec.start,end=spec.end;setIndex(start);
    if(end<=start)return;
    const duration=Math.max(1,spec.duration||1),span=end-start;
    let raf=0,startedAt=null,last=start;
    const tick=now=>{
      if(startedAt===null)startedAt=now;
      const progress=Math.min(1,(now-startedAt)/duration);
      const next=Math.min(end,start+Math.round(progress*span));
      if(next!==last){last=next;setIndex(next);}
      if(progress<1)raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[spec?.frames,spec?.start,spec?.end,spec?.duration,key]);
  return spec?.frames?.[Math.min(index,spec.frames.length-1)]||null;
}
function Sprite({who,stage=null,shot=null,golden=false,variant=null}){
  const pose=actorPose(who,stage,shot),spec=sequenceSpec(who,stage,shot),animated=useSpriteFrame(spec,who+'-'+stage+'-'+(shot?.grade||'idle')+'-'+(variant||'base'));
  const legacy=(who==='pitcher'?PITCHER_POSES:BATTER_POSES)[pose],v2=golden?V2_FALLBACKS[who]?.[pose]?.():null,authored=golden?authoredActorArt(who,pose,stage,shot,variant):null,src=authored||animated||v2||legacy;
  return <span className={'sprite-stage sprite-'+who+' pose-'+pose+(animated&&!authored?' v2-sequence':'')+(authored?' v3-authored':'')+(golden?' golden-actor':'')+(variant?' variant-'+variant:'')}>
    {golden&&<i className="actor-contact-shadow" aria-hidden="true"/>}
    <img aria-hidden="true" className="sprite-echo echo-back" src={src}/>
    <img aria-hidden="true" className="sprite-echo echo-mid" src={src}/>
    <img aria-hidden="true" className="duel-sprite" src={src}/>
    {who==='batter'&&<i className="bat-smear" aria-hidden="true"/>}
    <i className="sprite-bloom" aria-hidden="true"/>
  </span>;
}
function PixelCinema({stage,shot}){
  const intense=['homer','grand-slam','extra','dead-center'].includes(shot?.grade),danger=['near-miss','near-miss-k','chase','chase-k','fooled','strikeout'].includes(shot?.grade);
  return <div className={'pixel-cinema '+(stage?'cinema-'+stage:'')+(intense?' cinema-intense':'')+(danger?' cinema-danger':'')} aria-hidden="true">
    <span className="cinema-light beam-left"/><span className="cinema-light beam-right"/><span className="cinema-haze"/>
    <span className="plate-dust dust-a"/><span className="plate-dust dust-b"/><span className="mound-dust"/>
    <span className="crowd-flash cf-1"/><span className="crowd-flash cf-2"/><span className="crowd-flash cf-3"/><span className="crowd-flash cf-4"/>
    {Array.from({length:12},(_,i)=><i key={'air'+i} className={'air-pixel air-'+(i+1)}/>)}
    {Array.from({length:10},(_,i)=><b key={'debris'+i} className={'impact-debris debris-'+(i+1)}/>)}
    <span className="contact-core"/><span className="contact-cross cross-h"/><span className="contact-cross cross-v"/>
  </div>;
}
function ReadTrace({s,stage,shot}){
  const r=s.battle?.revealed;
  if(!r||!shot||!['impact','slowmo','release'].includes(stage))return null;
  const tactical=['dead-center','solid','jammed','lucky','extra','homer','grand-slam','near-miss','near-miss-k','chase','chase-k','fooled','strikeout'];
  if(!tactical.includes(shot.grade))return null;
  const outside=r.zone===9,cover=new Set(r.coverage||[]);
  return <div className={'read-trace trace-'+shot.grade+' trace-stage-'+stage} aria-hidden="true">
    <span className="trace-kicker">READ TRACE</span>
    <div className="trace-grid">{ZONES.map((_,z)=><i key={z} className={(cover.has(z)?'covered ':'')+(r.aimZone===z?'aim ':'')+(r.zone===z?'actual ':'')}><b>{z+1}</b></i>)}</div>
    <div className={'trace-outside '+(outside?'actual':'')}>OUT</div>
    <span className="trace-legend"><b>□</b> 커버 <em>◆</em> 실제 공</span>
  </div>;
}
function stakesFor(s){
  if(!s?.last)return null;
  const rival=!!routeChoice(s.stage,s.route)?.statBonus;
  if(s.phase==='won')return rival?'rival-champion':'champion';
  if(s.phase==='reward')return 'game-win';
  if(s.phase==='lost')return 'game-loss';
  if((s.last.runs||0)>0)return 'rbi';
  return null;
}
function ClutchLayer({stakes,stage}){
  if(!stakes||!['release','settle'].includes(stage))return null;
  const copy={
    rbi:['RUN SCORES','홈으로'],
    'game-win':['BALLGAME','끝냈다'],
    champion:['RUN COMPLETE','완주'],
    'rival-champion':['RIVAL DOWN','에이스를 꺾었다'],
    'game-loss':['THREE OUTS','여기서 끝'],
  }[stakes];
  return <div className={'clutch-layer clutch-'+stakes+' clutch-stage-'+stage} aria-hidden="true">
    <span>{copy[0]}</span><strong>{copy[1]}</strong>
    {['game-win','champion','rival-champion'].includes(stakes)&&<div className="pixel-confetti">{Array.from({length:18},(_,i)=><i key={i} className={'confetti-'+(i+1)}/>)}</div>}
  </div>;
}


const CINEMA_CASES=[
  {key:'read',name:'읽었다',group:'READ',state:{last:{kind:'skill',text:'릴리스 간파 · 준비 1/2',events:['가운데 높이 확인']},battle:{revealed:null}}},
  {key:'dead',name:'정확 적중',group:'SUCCESS',state:{last:{kind:'pitch',text:'중전안타',runs:0},battle:{revealed:{kind:'hit',label:'중전안타',zone:4,coverage:[4],aimZone:4}}}},
  {key:'jammed',name:'빗맞은 안타',group:'SUCCESS',state:{last:{kind:'pitch',text:'땅볼 안타',runs:0},battle:{revealed:{kind:'hit',label:'땅볼 안타',zone:5,coverage:[5],aimZone:4}}}},
  {key:'lucky',name:'바가지 안타',group:'SUCCESS',state:{last:{kind:'pitch',text:'바가지 안타 · 행운의 단타',runs:0},battle:{revealed:{kind:'hit',label:'바가지 안타 · 행운의 단타',zone:2,coverage:[2],aimZone:1}}}},
  {key:'extra',name:'2루타',group:'POWER',state:{last:{kind:'pitch',text:'2루타',runs:1},battle:{revealed:{kind:'hit',label:'2루타',zone:5,coverage:[5],aimZone:5}}},stakes:'rbi'},
  {key:'homer',name:'홈런',group:'POWER',state:{last:{kind:'pitch',text:'홈런',runs:1},battle:{revealed:{kind:'hit',label:'홈런',zone:3,coverage:[3],aimZone:3}}},stakes:'rbi'},
  {key:'grand',name:'만루홈런',group:'POWER',state:{last:{kind:'pitch',text:'홈런',runs:4},battle:{revealed:{kind:'hit',label:'홈런',zone:4,coverage:[4],aimZone:4}}},stakes:'game-win'},
  {key:'near',name:'한 칸 차이',group:'FAILURE',state:{last:{kind:'pitch',text:'헛스윙',runs:0},battle:{revealed:{kind:'whiff',label:'헛스윙',zone:1,coverage:[4],aimZone:4,strikesBefore:1}}}},
  {key:'chase',name:'유인구 추격',group:'FAILURE',state:{last:{kind:'pitch',text:'헛스윙',runs:0},battle:{revealed:{kind:'whiff',label:'헛스윙',zone:9,coverage:[4],aimZone:4,strikesBefore:1}}}},
  {key:'battle-foul',name:'2S 파울 생존',group:'FAILURE',state:{last:{kind:'pitch',text:'파울',runs:0},battle:{revealed:{kind:'foul',label:'파울',zone:1,coverage:[4],aimZone:4,strikesBefore:2}}}},
  {key:'rival',name:'라이벌 격파',group:'FINALE',state:{last:{kind:'pitch',text:'홈런',runs:1},battle:{revealed:{kind:'hit',label:'홈런',zone:4,coverage:[4],aimZone:4}}},stakes:'rival-champion'},
];
const labFlight=r=>!r?'flight-line':r.label?.includes('홈런')?'flight-homer':r.label?.includes('땅볼')?'flight-ground':r.label?.includes('바가지')?'flight-bloop':'flight-line';
const arenaPresentationClass=(stage,shot)=>[
  stage?'fx-stage-'+stage:'',
  shot?.kind?'fx-'+shot.kind:'',
  shot?.grade?'grade-'+shot.grade:'',
].filter(Boolean).join(' ');
function FlightVisual({revealed,fx=null,showCopy=false}){
  if(!revealed)return null;
  return <div className={'duel-fx '+revealed.kind+' '+labFlight(revealed)}>
    <span className="pixel-ball"/><span className="ball-shadow"/>
    <span className="ground-skip skip-a"/><span className="ground-skip skip-b"/>
    <span className="flight-spark fs-a"/><span className="flight-spark fs-b"/><span className="flight-spark fs-c"/>
    {showCopy&&fx&&<strong>{fx.runs?'HOME! +'+fx.runs:fx.outs?fx.outs+' OUT':fx.kind==='hit'?revealed?.label:''}</strong>}
    {showCopy&&fx?.growthEvents?.length>0&&<em className="growth-impact">{fx.growthEvents[0]}</em>}
  </div>;
}
function JudgementVisual({shot,stage,cinema=true}){
  if(!shot)return null;
  return <div className={'judgement-layer judgement-'+shot.kind+' stage-'+(stage||'windup')} aria-hidden="true"><span className="judgement-wash"/><span className="judgement-flash"/><span className="judgement-vignette"/><span className="pitch-ball"/><span className="speed-lines"/>{cinema&&shot.motion?.slowmo>0&&<span className="slowmo-mark">{shot.grade==='near-miss'?'ONE ZONE':shot.grade==='lucky'?'HANG TIME':shot.grade==='jammed'?'OFF BARREL':shot.grade==='dead-center'?'LOCKED':shot.grade==='homer'||shot.grade==='grand-slam'?'TIME STOPS':'SLOW'}</span>}<span className="judgement-ring ring-a"/><span className="judgement-ring ring-b"/><span className="judgement-ring ring-c"/><span className="judgement-slash slash-a"/><span className="judgement-slash slash-b"/>{Array.from({length:6},(_,i)=><span key={i} className={'judgement-spark spark-'+(i+1)}/>) }<div className="judgement-copy"><span>{shot.kicker}</span><strong>{shot.title}</strong><em>{shot.detail}</em></div></div>;
}
function CinemaLab({sound,onBack}){
  const [chosen,setChosen]=useState(CINEMA_CASES[1]),[stage,setStage]=useState(null),[token,setToken]=useState(0),[renderer2,setRenderer2]=useState(true),[rendererStatus,setRendererStatus]=useState('checking');
  const timers=useRef([]),shot=presentationFor(chosen.state),timeline=presentationTimeline(shot,false),revealed=chosen.state.battle.revealed;
  useEffect(()=>()=>timers.current.forEach(clearTimeout),[]);
  function play(item=chosen){
    timers.current.forEach(clearTimeout);setChosen(item);setToken(x=>x+1);setStage('windup');
    const p=presentationFor(item.state),t=presentationTimeline(p,false),pitch=!!item.state.battle.revealed;
    if(sound)cue(pitch?'pitch':p.cue);
    const list=[setTimeout(()=>{setStage('impact');if(sound&&pitch)cue(p.cue);haptic(t.haptic)},t.impactAt)];
    if(t.slowmo>0)list.push(setTimeout(()=>setStage('slowmo'),t.impactAt+t.freeze));
    list.push(setTimeout(()=>setStage('release'),t.releaseAt),setTimeout(()=>{setStage('settle');if(sound&&item.stakes)cue(item.stakes)},t.settleAt),setTimeout(()=>setStage(null),t.duration));
    timers.current=list;
  }
  return <main className={'cinema-lab release-combat stadium-stage-3 rival-game'+(shot?' fx-'+shot.kind:'')+(shot?.motion?.shake?' shake-'+shot.motion.shake:'')+(stage?' fx-stage-'+stage:'')}>
    <section className="cinema-lab-head"><div><span className="eyebrow">PREVIEW ONLY · MASTER PIXEL CINEMA</span><h1>연출 검수실</h1><p>같은 판정을 반복 재생하고 Renderer 2.0을 켜고 끄며 공간감 차이를 직접 비교하세요. 사운드는 상단 ♪ 버튼에서 켜세요.</p></div><div className="cinema-lab-head-actions"><span className={'renderer-status status-'+(renderer2?rendererStatus:'off')}>{renderer2?(rendererStatus==='webgl2'?'WEBGL2 ACTIVE':rendererStatus==='error'?'SHADER ERROR':rendererStatus==='fallback'?'CSS FALLBACK':'CHECKING'):'R2 OFF'}</span><button className={renderer2?'renderer-toggle on':'renderer-toggle'} onClick={()=>{setRenderer2(x=>!x);setRendererStatus('checking')}}>R2 {renderer2?'ON':'OFF'}</button><button onClick={onBack}>← 게임으로</button></div></section>
    <section className={'cinema-lab-stage duel-arena stadium golden-master-stage '+(renderer2?'renderer2-host ':'renderer1-host ')+arenaPresentationClass(stage,shot)} aria-label="연출 검수 무대">
      {renderer2&&<ArenaRenderer2 stage={stage} shot={shot} match={3} rival={true} revealed={revealed} token={token} label="연출 검수 WebGL 경기장" onStatus={setRendererStatus}/>}
      <GoldenMasterStage stage={stage} shot={shot} rival match={3}/>
      <PixelCinema stage={stage} shot={shot}/><PixelVFX stage={stage} shot={shot} token={token} drawCore={!renderer2}/><ReadTrace s={chosen.state} stage={stage} shot={shot}/>
      <div className="actor-left has-smooth-actor"><SmoothActor who="batter" stage={stage} shot={shot}/><span className="batter-nameplate">#09 TEST BATTER</span></div><div className="actor-right has-smooth-actor"><SmoothActor who="pitcher" stage={stage} shot={shot}/><span className="pitcher-nameplate">TEST PITCHER</span></div>
      {stage&&revealed&&<FlightVisual revealed={revealed}/>}
      {stage&&<JudgementVisual shot={shot} stage={stage}/>}<ClutchLayer stakes={chosen.stakes} stage={stage}/>
    </section>
    <section className="cinema-lab-controls" aria-label="연출 선택">
      <div className="cinema-selected"><span>{chosen.group} · {renderer2?'WEBGL 2.5D':'LEGACY 2D'}</span><strong>{chosen.name}</strong><small>{shot.kicker+' · '+Math.round(timeline.duration)+'ms'+(timeline.slowmo?' · SLOW '+timeline.slowmo+'ms':'')}</small><button className="primary" onClick={()=>play(chosen)}>▶ 다시 재생</button></div>
      <div className="cinema-case-grid">{CINEMA_CASES.map(item=><button key={item.key} className={chosen.key===item.key?'selected':''} aria-pressed={chosen.key===item.key} onClick={()=>play(item)}><span>{item.group}</span><strong>{item.name}</strong></button>)}</div>
    </section>
  </main>;
}
function Diamond({s,preview}){const b=s.battle;return <div className="living-diamond" aria-label="베이스 주자"><div className="base-lines"/>{[2,1,0].map(i=>{const id=b.bases[i],c=LINEUP.find(p=>p.id===id),after=preview?.bases?.[i],ghost=after&&LINEUP.find(p=>p.id===after);return <div key={i+'-'+(id||'empty')} className={'base-slot base-'+(i+1)+(id?' occupied':'')+(preview&&after!==id?' changing':'')}><span>{i+1}루</span>{c?<><span className="runner-number">#{c.number}</span><b>{c.name}</b></>:<b className="empty-base">◇</b>}{preview&&after!==id&&<small>→ {ghost?ghost.name:'비워짐'}</small>}</div>;})}<div className="home-plate"><b>HOME</b><span>득점</span></div></div>;}
function CountLights({value,max}){return <span className="count-lights" aria-label={`${value}/${max}`}>{Array.from({length:max},(_,i)=><i key={i} className={i<value?'on':''}/>)}</span>;}
function Scoreboard({s,onLineup,targetRef}){const b=s.battle,batter=currentBatter(s),next=LINEUP[(b.batterIndex+1)%LINEUP.length];return <section ref={targetRef} className="scoreboard" aria-label="야구 전광판"><div className="scoreboard-player"><span>AT BAT · {b.batterIndex+1}번</span><strong>#{batter.number} {batter.name}</strong><small>NEXT · {next.name}</small></div><div className="scoreboard-score">{s.version===10?<><span>PITCHER HP</span><strong>{s.pitcher?.hp??0}<i>/</i>{s.pitcher?.maxHp??0}</strong><small>득점은 기록 {b.runs} · 승부는 HP 0</small></>:<><span>RUN / TARGET</span><strong>{b.runs}<i>/</i>{battleTarget(s)}</strong><small>{s.stage+1} / 4 · {STAGES[s.stage].name}</small></>}</div><div className="scoreboard-count"><div><b>B</b><CountLights value={Math.min(b.balls,4)} max={4}/></div><div><b>S</b><CountLights value={Math.min(b.strikes,3)} max={3}/></div><div><b>O</b><CountLights value={Math.min(b.outs,3)} max={3}/></div><button onClick={onLineup}>타순 보기</button></div></section>;}

const pct=x=>Math.round(x*100)+'%';
function resultCall(revealed){
  if(!revealed)return '결과';
  if(revealed.label==='볼넷')return '볼넷';
  if(revealed.label?.includes('삼진'))return '삼진';
  return {hit:'안타',foul:'파울',whiff:'헛스윙',ball:'볼',called:'스트라이크',out:'아웃',sacrifice:'희생'}[revealed.kind]||'결과';
}
function ZoneBoard({s,id,onZone,disabled,coveredOverride=null,matchupOverride=null}){
  const b=s.battle,p=b.pending?publicProbabilities(s):b.intent.probabilities;
  /* 명암은 존 안에서의 몫으로 센다. 존 밖이 3분의 1을 먹는 바람에 존 안 코스가 전부 '드묾'으로
     눌려 보였고, 그래서 표기보다 자주 온다는 말이 나왔다. 존 밖 확률은 따로 적는다. */
  const inZone=p.slice(0,9).reduce((a,x)=>a+x,0)||1,share=z=>p[z]/inZone;
  const duel=matchupOverride||matchup(s,id||'basic'),entry=s.deck.find(c=>c.id===id),sacrifice=entry?.kind==='bunt';
  const covered=b.revealed?.coverage||coveredOverride||coverage(s,id||'basic'),proficient=BUILDS[s.build].zones,clue=pitchClue(s);
  const known=knownPitchZones(s),level=readLevel(s),showUnused=s.relics.includes('radar'),exactBall=s.relics.includes('ledger');
  const zoneButtons=useRef([]);
  function moveZone(e,z){
    const next={ArrowLeft:z%3?z-1:z,ArrowRight:z%3<2?z+1:z,ArrowUp:z>=3?z-3:z,ArrowDown:z<6?z+3:z,Home:0,End:8}[e.key];
    if(next==null||next===z)return;e.preventDefault();onZone(next);zoneButtons.current[next]?.focus();
  }
  return <section className="zone-panel" aria-label="9존 타격 계획">
    <div className="zone-heading"><div><span className="eyebrow">{b.revealed?'REVEAL':'READ → BET'}</span>
      <h2>{b.revealed?b.revealed.label:'어떤 공을 기다릴까?'}</h2></div>
      <div className="ball-read">존 밖 볼 {b.revealed?(b.revealed.zone===9?'● 실제 공':'—'):b.scouted?(p[9]===1?'확정':'아님'):exactBall||level===2?pct(p[9]):level===1?rangeFor(p[9]):bandFor(p[9])}</div></div>
    <p className="zone-promise">{sacrifice?'희생 작전 · 스트라이크에 '+(entry.plus?'85':'70')+'% 성공 · 아웃 1개 지불':'커버 안 공 = 안타 · 스탯은 안타 종류만 결정'}</p>
    {clue&&<b className="scout-clue">{clue} · 확률 갱신</b>}
    <p id="zone-keyboard-help" className="sr-only">방향키로 인접한 존을 고르고, Home과 End 키로 처음과 마지막 존을 고릅니다.</p>
    <div className="zone-grid" role="group" aria-label="노릴 코스" aria-describedby="zone-keyboard-help">
      {ZONES.map((name,z)=>{
        const dead=p[z]<=0,ruledOut=!known.includes(z),certain=known.length===1&&known.includes(z);
        const title=ruledOut?'단서 밖':certain?'확정':dead&&showUnused?'안 씀':level===0?shadeNameFor(share(z)):dead?'0%':level===1?rangeFor(p[z]):pct(p[z]);
        const figure=b.revealed?(b.revealed.zone===z?'●':'·'):title;
        return <button key={z} ref={el=>zoneButtons.current[z]=el} aria-label={name} aria-describedby={'zone-read-'+z} title={title} aria-pressed={b.aimZone===z} disabled={disabled}
          tabIndex={b.aimZone===z?0:-1} onKeyDown={e=>moveZone(e,z)} onClick={()=>onZone(z)}
          className={'zone-cell shade-'+shadeFor(share(z))+' '+((dead&&showUnused)||ruledOut?'unused ':'')+(covered.includes(z)?'covered ':'')+(b.aimZone===z?'aimed ':'')+(b.revealed?.zone===z?'actual':'')}>
          <span>{name}</span><strong id={'zone-read-'+z}>{figure}</strong><small>{proficient.includes(z)?'★ 숙련':'비숙련'}{b.aimZone===z?' · 노림':''}</small>
        </button>;
      })}
    </div>
    <p className="zone-legend"><b className="zone-outside">존 밖 {pct(p[9])}</b> 왼쪽 몸쪽 / 오른쪽 바깥 · 테두리 = 커버 · ★ 4숙련존 · 밝기는 존 안에서의 몫</p>
    <details className="zone-details"><summary>투수 기록 · 타구 질 · 읽기 {READ_LEVELS[level].short}</summary>
      <p>존 선택은 공을 다시 뽑지 않습니다. 레퍼토리 {b.intent.repertoire?.length||9}/9 · 숙련존은 타구 질과 장타력 +12.</p>
      <div className="matchup-stats" aria-label="타자 투수 스탯"><span>타격 {duel.hitter.technique} / 투수 변화 {duel.pitcher.movement}</span><span>파워 {duel.hitter.power} + 성장 {duel.growthPower} / 구위 {duel.pitcher.stuff}</span><span>행운 {duel.hitter.luck} / 제구 {duel.pitcher.command}</span><small>스탯은 안타 종류만 결정 · 안타 취소 없음</small></div>
      <div className="pitch-history" aria-label="최근 투구 기록">{b.history.length?b.history.slice(-5).map((h,i)=><span key={i}>{h.balls}B {h.strikes}S · {h.zone===9?'볼':ZONES[h.zone]} / {h.label}</span>):<span>첫 공 · 투구 기록이 여기에 쌓입니다.</span>}</div>
      {s.relics.map(k=><p key={k}>{RELICS[k].name} · {RELICS[k].text}</p>)}
    </details>
  </section>;
}
function GrowthSummary({s}){
  if(s.build===DECKBUILDER_BUILD)return <div className="growth-summary" aria-label="덱 빌딩 기록"><span>MAIN RUN · 덱 {s.deck.length}장 · 카드 {s.rewards.length}/3 · 시설 {s.facilities?.length||0}/3</span></div>;
  return <div className="growth-summary" aria-label="런 성장 기록">
    {Object.entries(GROWTHS).filter(([key])=>s.growth[key]>0).map(([key,g])=><span key={key} className={g.color}>{g.short} Lv.{s.growth[key]}</span>)}
    {!s.growthHistory.length&&<span>첫 승부를 이기면 성장 해금 · 이후 심화 또는 혼합</span>}
  </div>;
}
function GrowthPanel({s,disabled,onMode}){
  const b=s.battle;
  if(s.build===DECKBUILDER_BUILD)return <div className="growth-notice">V9 MAIN RUN · 카드로 이번 런의 타격 스타일을 만듭니다. 강화·제거·유물은 다음 맵 단계에서 분리합니다.</div>;
  if(!s.growthHistory.length)return <div className="growth-notice">첫 승부 뒤, 이 덱으로 어떤 야구를 할지 정합니다.</div>;
  return <section className="growth-panel" aria-label="성장 전술">
    <div className="growth-heading"><span>MY BASEBALL</span><GrowthSummary s={s}/></div>
    {s.growth.patience>0&&<div className="growth-resource power"><b>기다림 {b.waitCharge}/2</b><span>지켜본 스트라이크 → 한 존 스윙 파워 +{(12+12*s.growth.patience)*b.waitCharge}</span>
      <button aria-label="기다린 공 승부" aria-pressed={b.growthMode==='patience'} disabled={disabled||!!growthProblem(s,'patience')} onClick={()=>onMode(b.growthMode==='patience'?'normal':'patience')}>기다린 공 승부</button><small>선택하면 커버 1존 · 스윙하면 미적중도 기다림 소모</small></div>}
    {s.growth.relay>0&&<div className={'growth-resource relay '+(b.relayActive?'charged':'')}><b>{b.relayActive?'연결 사인 활성':b.relayPending?'다음 타자에게 연결 사인':'다음 타자를 믿는다'}</b><span>{b.relayActive?'이번 타석 타격 +'+b.relayActive*10+' · 기존 주자 추가 '+(b.relayActive>=3?2:1)+'베이스':'희생 번트로 주자를 보내면 다음 타석이 강화됩니다.'}</span><small>타자 본인은 추가 진루하지 않음 · 3아웃/승부 종료 시 소멸</small></div>}
    {s.growth.fortune>0&&<div className="growth-resource fortune"><b>행운 {s.fortune}/6 <small>사용 비용 {growthCost(s.growth.fortune)}</small></b>
      <div className="fortune-pips" aria-label={'행운 '+s.fortune+' / 6'}>{Array.from({length:6},(_,i)=><i key={i} className={i<s.fortune?'full':''}/>)}</div>
      <span>땅볼 +{s.growth.fortune>=3?2:1} · 바가지 +{s.growth.fortune>=3?3:2} · 승부 사이 보존</span>
      <button aria-label="행운 예약" aria-pressed={b.growthMode==='fortune'} disabled={disabled||!!growthProblem(s,'fortune')} onClick={()=>onMode(b.growthMode==='fortune'?'normal':'fortune')}>행운 예약</button><small>다음 비홈런 안타에 타자·주자 추가 1베이스 · 미적중이면 보존</small></div>}
    {b.growthMode!=='normal'&&<button className="growth-cancel" disabled={disabled} onClick={()=>onMode('normal')}>성장 사용 해제</button>}
  </section>;
}
function GrowthReward({s,chosen,onChoose}){
  return <section className="growth-reward" aria-label="성장 선택"><span className="eyebrow">01 · 이번 런의 야구를 바꾼다</span>
    <h2>{s.growthHistory.length?'더 깊게 성장할까, 다른 길을 섞을까?':'첫 성장 · 다음 경기에서 무엇을 바꿀까?'}</h2>
    <div className="growth-options">{Object.entries(GROWTHS).map(([key,g])=><button key={key} aria-label={g.name} aria-pressed={chosen===key}
      className={'growth-option '+g.color} disabled={s.growth[key]>=3} onClick={()=>onChoose(key)}>
      <span className="growth-icon"><PixelIcon art={g.art}/></span><span className="growth-rank">{s.growth[key]?'Lv.'+s.growth[key]+' → '+(s.growth[key]+1):'새 성장 · Lv.1'}</span>
      <strong>{g.name}</strong><p>{g.ranks[s.growth[key]]||'최대 성장'}</p><small>{g.change}</small>
      <span className="growth-caution">{g.caution}{key==='relay'&&!s.deck.some(c=>c.kind==='bunt')&&' 현재 덱에 희생 번트가 없습니다. 발동하려면 카드 추가에서 번트를 선택하세요.'}</span>
      <span className="synergy-card">후보에 더해지는 축 · {(AFFINITY_CARDS[key]||[]).map(k=>CARDS[k].name).join(' / ')}</span>
    </button>)}</div>
  </section>;
}
// The deck is on screen before any choice is offered, so a reward reads as "what is my deck missing", not "pick one".
function DeckProfileView({deck,growth,delta}){
  const p=deckProfile(deck),notes=diagnose(deck,growth),d=delta?Object.fromEntries(delta.map(r=>[r.label,r.delta])):null;
  const chip=(label,value)=>{const dv=d?.[label];
    return <div key={label} className={'profile-chip'+(dv>0?' up':dv<0?' down':'')}><b>{label}</b><span>{value}{dv?<i>{dv>0?'+'+dv:dv}</i>:null}</span></div>;};
  return <div className="deck-profile">
    <div className="profile-row" aria-label="범위 구성">{AXES.map(([k,name])=>chip(name,p.axes[k]))}</div>
    <div className="profile-row totals" aria-label="덱 합계">{chip('덱 장수',p.total)}{chip('스윙',p.swing)}{chip('준비',p.prepare)}{chip('강화',p.plus)}{chip('파워 합',p.power)}</div>
    <details className="profile-details"><summary>역할 구성 · 상세 진단</summary><div className="profile-row" aria-label="역할 구성">{ROLES.map(r=>chip(r,p.roles[r]))}</div>
    {notes.length>0&&<ul className="deck-diagnosis">{notes.map((n,i)=><li key={i} className={n.level}>{n.text}</li>)}</ul>}</details>
  </div>;
}
function DeckList({deck,selected,onPick,mode}){
  return <div className="deck-list">{deck.map(e=>{
    const blocked=mode==='upgrade'&&!canUpgrade(e);
    return <Card key={e.id} kind={e.kind} plus={e.plus} selected={selected===e.id} disabled={blocked}
      note={mode==='upgrade'?(e.plus?'이미 강화됨':upgradeText(e.kind)?'강화 → '+upgradeText(e.kind):'강화 불가'):null}
      onClick={blocked?undefined:()=>onPick(e.id)}/>;})}
  </div>;
}
function RewardScreen({s,growthChoice,onGrowth,action,onAction,target,onTarget,onConfirm}){
  const deckbuilder=s.build===DECKBUILDER_BUILD;
  const growthReady=deckbuilder||!!growthChoice;
  const pool=rewardChoices(s.stage,growthChoice,s.build,s.route);
  const opponentRoute=deckbuilder?routeChoice(s.stage,s.route):null;
  const chosenAction=deckbuilder?(action==='skip'?'skip':'add'):action;
  const pending=!chosenAction?null:chosenAction==='skip'?{type:'skip'}
    :['add','relic'].includes(chosenAction)?(target?{type:chosenAction,kind:target}:null):(target?{type:chosenAction,id:target}:null);
  const problem=!growthReady?'성장을 먼저 선택하세요.'
    :deckbuilder&&!pending?'카드 한 장을 고르거나 이번 보상을 건너뛰세요.'
    :!chosenAction?'보상 방식을 선택하세요.'
    :!pending?(chosenAction==='relic'?'유물을 선택하세요.':'대상 카드를 선택하세요.')
    :rewardProblem(s.deck,pending,s.stage,growthChoice,s.relics,s.build,s.route);
  const after=pending&&!problem?applyRewardToDeck(s.deck,pending,s.nextId).deck:null;
  const delta=after?profileDelta(s.deck,after):null;
  const grown=!deckbuilder&&growthChoice?{...s.growth,[growthChoice]:s.growth[growthChoice]+1}:s.growth;
  return <div className="reward-flow" role="group" aria-label={deckbuilder?'덱 빌딩 카드 선택':'보상 선택 4단계'}>
    <OpponentReport stage={s.stage+1}/>
    <details className="deck-peek" open><summary>현재 덱 · {s.deck.length}장 — {deckbuilder?'이번 런을 어디로 만들까':'성장 선택 전에 비교'}</summary><DeckProfileView deck={s.deck} growth={s.growth}/></details>
    {deckbuilder?<section className="growth-reward v9-draft-intro" aria-label="메인 런 덱 빌딩 안내"><span className="eyebrow">BUILD · 방향은 정해져 있지 않다</span><h2>첫 9장은 정답이 아닙니다.</h2><p>장타, 연결, 컨택 중 하나로 깊게 가도 되고 섞어도 됩니다. 기본은 3장 드래프트, 강팀을 꺾으면 추가 후보가 열립니다.</p>{opponentRoute?.rewardBonus&&<b className="route-bonus-callout">{opponentRoute.name} 격파 보너스 · {CARDS[opponentRoute.rewardBonus].name} 추가 후보</b>}</section>:<GrowthReward s={s} chosen={growthChoice} onChoose={onGrowth}/>}
    {!growthReady?<p className="growth-prompt">먼저 성장을 선택하세요. 선택 전에는 보상이나 다음 승부가 확정되지 않습니다.</p>:<>
      <section className="deck-section" aria-label="내 덱 구성">
        <span className="eyebrow">{deckbuilder?'01':'02'} · 지금 내 덱</span><h2>이 {deckProfile(s.deck).total}장으로 무엇을 할 수 있나</h2>
        <DeckProfileView deck={s.deck} growth={grown} delta={delta}/>
        <div className="read-row"><b>읽기 · {READ_LEVELS[readLevel(s)].name}</b><span>관찰 점수 {observeScore(s.deck)}</span>
          {(s.relics||[]).length?(s.relics||[]).map(k=><em key={k}>{RELICS[k].name}</em>):<em className="none">유물 없음</em>}</div>
      </section>
      {deckbuilder?<section className="deck-section v9-card-draft" aria-label="카드 보상 선택">
        <span className="eyebrow">02 · 카드 보상</span><h2>이번 승리가 덱의 다음 방향을 정합니다</h2>
        <p className="draft-rule">{pool.length}장 모두 강점이 다릅니다. 정답을 고르는 게 아니라, 지금 덱에서 만들고 싶은 야구를 고르세요.</p>
        <div className="reward-cards">{pool.map(kind=>{const links=rewardLinks(s.deck,kind),good=links.filter(x=>x.kind==='synergy').length,bad=links.filter(x=>x.kind==='conflict').length,relation=good?{kind:'synergy',why:'현재 덱 '+good+'장과 연결'}:bad?{kind:'conflict',why:'현재 덱 '+bad+'장과 상충'}:null;return <Card key={kind} kind={kind} relation={relation} selected={chosenAction==='add'&&target===kind} onClick={()=>{onAction('add');onTarget(kind);}}/>;})}</div>
        {chosenAction==='add'&&target&&<RewardSynergy deck={s.deck} kind={target}/>}
        <button type="button" className={'reward-skip'+(chosenAction==='skip'?' selected':'')} aria-pressed={chosenAction==='skip'} onClick={()=>{onAction('skip');onTarget(null);}}>이번 카드 보상 건너뛰기</button>
      </section>:<section className="deck-section" aria-label="덱 변경 방식">
        <span className="eyebrow">03 · 덱을 어떻게 바꿀까</span><h2>한 번의 보상에 한 가지만 고를 수 있습니다</h2>
        <div className="reward-action-row">{REWARD_ACTIONS.map(a=>{
          const blocked=a.type==='add'&&s.deck.length>=DECK_MAX?`덱 ${DECK_MAX}장 상한`
            :a.type==='remove'&&s.deck.length<=DECK_MIN?`덱 ${DECK_MIN}장 하한`
            :a.type==='upgrade'&&!s.deck.some(canUpgrade)?'강화할 카드 없음'
            :a.type==='relic'&&(RELIC_OFFERS[s.stage]||[]).every(k=>(s.relics||[]).includes(k))?'남은 유물 없음':null;
          return <button key={a.type} type="button" className={'reward-action'+(action===a.type?' selected':'')} disabled={!!blocked}
            aria-label={a.name} aria-pressed={action===a.type} onClick={()=>onAction(a.type)}><strong>{a.name}</strong><span>{blocked||a.hint}</span></button>;})}
        </div>
        {action==='add'&&<><div className="reward-cards">{pool.map(kind=>{const links=rewardLinks(s.deck,kind),good=links.filter(x=>x.kind==='synergy').length;return <Card key={kind} kind={kind} relation={good?{kind:'synergy',why:'현재 덱 '+good+'장과 연결'}:null} selected={target===kind} onClick={()=>onTarget(kind)}/>;})}</div>{target&&<RewardSynergy deck={s.deck} kind={target}/>}</>}
        {(action==='remove'||action==='upgrade')&&<DeckList deck={s.deck} selected={target} onPick={onTarget} mode={action}/>}
        {action==='relic'&&<div className="relic-offers">{(RELIC_OFFERS[s.stage]||[]).map(k=>{const owned=(s.relics||[]).includes(k);
          return <button key={k} type="button" className={'relic-card'+(target===k?' selected':'')} disabled={owned}
            aria-label={RELICS[k].name} aria-pressed={target===k} onClick={()=>onTarget(k)}>
            <span className="relic-icon"><PixelIcon art={RELICS[k].art}/></span>
            <strong>{RELICS[k].name}</strong><span>{RELICS[k].text}</span>{owned&&<small>이미 가진 유물</small>}</button>;})}
        </div>}
      </section>}
      <section className="deck-section confirm" aria-label="변화 확인">
        <span className="eyebrow">{deckbuilder?'03':'04'} · 이 선택이 덱을 어떻게 바꾸나</span>
        {problem?<p className="reward-hold">{problem}</p>:<>
          <ul className="delta-list">{delta.length?delta.map(r=><li key={r.label} className={r.delta>0?'up':'down'}>
            <b>{r.label}</b><span>{r.from} → {r.to}</span><i>{r.delta>0?'+'+r.delta:r.delta}</i></li>):<li className="flat">{pending?.type==='relic'?RELICS[pending.kind].name+' · '+RELICS[pending.kind].text:pending?.type==='upgrade'?'강화 효과 · '+upgradeText(s.deck.find(c=>c.id===pending.id).kind):deckbuilder?'이번 경기에서는 덱 구성을 유지합니다.':'덱 구성은 그대로입니다. 성장만 받습니다.'}</li>}</ul>
          {(()=>{const now=diagnose(s.deck,grown),next=diagnose(after,grown);
            const fixed=now.filter(x=>!next.some(y=>y.text===x.text));
            return <ul className="deck-diagnosis after">
              {fixed.map((n,i)=><li key={'fixed'+i} className="resolved">변화 전 · {n.text}</li>)}
              {next.map((n,i)=><li key={'next'+i} className={n.level}>{n.text}</li>)}
              {!fixed.length&&!next.length&&<li className="info">지적할 구성 문제가 없습니다.</li>}
            </ul>;})()}</>}
        <button className="primary" disabled={!!problem} onClick={()=>onConfirm(pending)}>{deckbuilder?'이 덱으로 다음 경기':GROWTHS[growthChoice].short+' Lv.'+(s.growth[growthChoice]+1)+' · 이 덱으로 확정'}</button>
      </section>
    </>}
  </div>;
}

function FacilityScreen({s,choice,onChoice,target,onTarget,onConfirm}){
  const routeIndex=s.stage-1,route=FACILITY_ROUTES[routeIndex]||[],selected=choice&&route.includes(choice)?choice:null;
  const action=!selected?null:selected==='scouting'?{type:'scouting'}
    :selected==='equipment'?(target?{type:'equipment',kind:target}:null)
    :(target?{type:selected,id:target}:null);
  const problem=!selected?'다음 경기 전에 들를 곳을 하나 고르세요.'
    :!action?(selected==='equipment'?'장비를 선택하세요.':'카드를 선택하세요.')
    :facilityProblem(s,action);
  const deckAction=action&&['training','release'].includes(action.type)
    ?{type:action.type==='training'?'upgrade':'remove',id:action.id}:null;
  const after=deckAction&&!problem?applyRewardToDeck(s.deck,deckAction,s.nextId).deck:null;
  const delta=after?profileDelta(s.deck,after):[];
  const scoutFrom=readLevel(s),scoutTo=Math.min(2,scoutFrom+1);
  return <div className="facility-flow" role="group" aria-label="다음 경기 준비 선택">
    <section className="facility-intro">
      <span className="eyebrow">BETWEEN GAMES · ROUTE {s.stage} / 3</span>
      <h1>다음 상대를 만나기 전에,<br/>팀을 한 번 바꿀 수 있습니다.</h1>
      <p>모든 걸 얻을 수는 없습니다. 덱을 강하게 만들지, 얇게 만들지, 투수를 더 읽을지 하나를 포기하고 하나를 고릅니다.</p>
    </section>
    <div className="facility-route" aria-label="시설 선택">{route.map(type=>{const x=FACILITIES[type];
      return <button key={type} type="button" className={'facility-node '+(selected===type?'selected':'')} aria-pressed={selected===type}
        onClick={()=>{onChoice(type);onTarget(null);}}>
        <span className="facility-icon"><PixelIcon art={x.art}/></span><small>{x.tag}</small><strong>{x.name}</strong><p>{x.text}</p>
      </button>;})}</div>
    {selected&&<section className="facility-workbench">
      <span className="eyebrow">선택한 시설 · {FACILITIES[selected].name}</span>
      {selected==='training'&&<><h2>강화할 카드 한 장</h2><DeckList deck={s.deck} selected={target} onPick={onTarget} mode="upgrade"/></>}
      {selected==='release'&&<><h2>덱에서 뺄 카드 한 장</h2><p>덱이 얇아질수록 핵심 카드를 더 자주 봅니다.</p><DeckList deck={s.deck} selected={target} onPick={onTarget} mode="remove"/></>}
      {selected==='equipment'&&<><h2>장비 하나를 가져갑니다</h2><div className="relic-offers">{(RELIC_OFFERS[routeIndex]||[]).map(k=>{const owned=s.relics.includes(k);
        return <button key={k} type="button" className={'relic-card '+(target===k?'selected':'')} disabled={owned}
          aria-label={RELICS[k].name} aria-pressed={target===k} onClick={()=>onTarget(k)}>
          <span className="relic-icon"><PixelIcon art={RELICS[k].art}/></span><strong>{RELICS[k].name}</strong><span>{RELICS[k].text}</span>{owned&&<small>이미 보유</small>}
        </button>;})}</div></>}
      {selected==='scouting'&&<div className="scout-brief"><h2>다음 상대를 한 단계 더 읽습니다</h2><p>{READ_LEVELS[scoutFrom].name} → <strong>{READ_LEVELS[scoutTo].name}</strong></p><small>다음 한 경기 동안만 적용. 숨은 실제 공을 공개하지 않고, 공개 확률 정보의 해상도만 높입니다.</small></div>}
      {!!delta.length&&<ul className="delta-list facility-delta">{delta.map(r=><li key={r.label} className={r.delta>0?'up':'down'}><b>{r.label}</b><span>{r.from} → {r.to}</span><i>{r.delta>0?'+'+r.delta:r.delta}</i></li>)}</ul>}
      {problem?<p className="reward-hold">{problem}</p>:<button className="primary" onClick={()=>onConfirm(action)}>이 준비로 다음 경기</button>}
    </section>}
  </div>;
}


const OPPONENT_NOTES=[
  {plan:'바깥쪽 코스가 중심. 초반에는 적은 코스로 승부합니다.',question:'안전하게 출루할 범위와 큰 한 방, 어느 쪽을 준비할까?'},
  {plan:'낮은 코스와 높은 변화량. 맞힌 공은 안타지만 타구 질이 낮아질 수 있습니다.',question:'낮은 가로 범위를 챙길까, 타구 질을 높일까?'},
  {plan:'외야 후퇴. 2루타 확률은 0이지만 홈런은 가능합니다.',question:'단타와 주루로 점수를 만들까, 담장을 넘길 파워에 투자할까?'},
  {plan:'최근 노림의 반대 열을 선호합니다. 지금 선택한 존에는 반응하지 않습니다.',question:'반대편도 칠 수 있는 덱인가? 기다렸다 승부할 한 공은 있는가?'}
];
function OpponentReport({stage,routeId=null}){
  const st=STAGES[stage],note=OPPONENT_NOTES[stage];if(!st)return null;
  const picked=routeChoice(stage,routeId),bonus=picked?.statBonus||0,target=st.target+(picked?.targetDelta||0);
  const zones=ZONE_ORDER[st.style].slice(0,st.zoneOpen);
  return <section className="opponent-report" aria-label="다음 상대 리포트">
    <div><span className="eyebrow">SCOUTING / GAME {stage+1}</span><h2>{picked?picked.name:st.name}</h2>{picked&&<em className={'route-tag '+(bonus?'danger':'safe')}>{picked.tag}</em>}<p>{picked?.text||note.plan}</p><strong>{note.question}</strong>
      <small>목표 {target}점 · 3아웃 / 구위 {st.stats.stuff+bonus} · 변화 {st.stats.movement+bonus} · 제구 {st.stats.command+bonus}</small></div>
    <div className="report-zones" aria-label="상대의 시작 코스">{ZONES.map((name,z)=><span key={z} className={zones.includes(z)?'open':''}>{name}<b>{zones.includes(z)?'사용':'—'}</b></span>)}</div>
    <small>시작 {st.zoneOpen}존 → 최대 {st.zoneMax}존 · 2스트라이크에는 일시 확장. {picked?picked.risk+' / '+picked.reward:'경로를 고르면 실제 목표와 보상이 확정됩니다.'}</small>
  </section>;
}
function RouteBranches({s,onChoose,onStart}){
  if(s.build!==DECKBUILDER_BUILD)return null;
  const options=ROUTE_CHOICES[s.stage]||[],picked=routeChoice(s.stage,s.route);
  return <section className="v92-branches" aria-label="상대 경로 선택">
    <div className="branch-head"><span className="eyebrow">V9.2 · CHOOSE THE OPPONENT</span><h2>누구를 이길지 고르면, 무엇을 얻을지도 달라집니다.</h2><p>안전한 경기로 덱을 안정시키거나, 한 점과 투수 능력을 더 감수하고 다음 드래프트의 선택지를 넓히세요.</p></div>
    <div className="branch-grid">{options.map(r=><button key={r.id} type="button" className={'opponent-route '+(s.route===r.id?'selected':'')+(r.statBonus?' danger':' safe')} aria-pressed={s.route===r.id} onClick={()=>onChoose(r.id)}>
      <span className="route-tag">{r.tag}</span><strong>{r.name}</strong><p>{r.text}</p><small>{r.risk}</small><b>{r.reward}</b>
    </button>)}</div>
    <div className="branch-confirm">{picked?<><span>선택 · <b>{picked.name}</b> · 목표 {STAGES[s.stage].target+picked.targetDelta}점</span><button className="primary" onClick={onStart}>이 상대와 승부 시작</button></>:<span>상대를 하나 고르면 승부를 시작할 수 있습니다.</span>}</div>
  </section>;
}
function RewardJournal({s}){
  if(!s.rewards.length&&!s.facilities?.length&&!s.routeHistory?.length)return null;
  return <details className="reward-journal"><summary>상세 선택 기록 펼치기</summary><ol>{s.rewards.flatMap((r,i)=>{
    const card=s.deck.find(c=>c.id===r.id),name=card?CARDS[card.kind].name:null,route=routeChoice(i,s.routeHistory?.[i]);
    const text=r.type==='add'?CARDS[r.kind].name+' 추가':r.type==='relic'?RELICS[r.kind].name+' 획득':r.type==='upgrade'?(name||'카드')+' 강화':r.type==='remove'?'카드 1장 제거':'덱 유지';
    const growth=s.growthHistory[i],rows=[];
    if(route)rows.push(<li key={'route'+i} className={route.statBonus?'route-history danger':'route-history'}>{i+1}경기 · {route.name} 격파{route.rewardBonus?' · 보너스 후보 해금':''}</li>);
    rows.push(<li key={'r'+i}>{i+1}경기 보상 · {growth?GROWTHS[growth].short+' 성장 / ':'카드 / '}{text}</li>);
    const f=s.facilities?.[i];
    if(f){const facilityText=f.type==='training'?CARDS[f.kind].name+' 강화':f.type==='release'?CARDS[f.kind].name+' 방출':f.type==='equipment'?RELICS[f.kind].name+' 장착':'다음 상대 스카우팅';
      rows.push(<li key={'f'+i} className="facility-history">{FACILITIES[f.type].name} · {facilityText}</li>);}
    return rows;
  })}</ol></details>;
}

function RewardSynergy({deck,kind}){
  if(!kind)return null;
  const links=rewardLinks(deck,kind),good=links.filter(x=>x.kind==='synergy'),bad=links.filter(x=>x.kind==='conflict');
  return <section className={'synergy-map '+(!links.length?'empty':'')} aria-label="카드 시너지">
    <div className="synergy-head"><span className="eyebrow">LIVE SYNERGY</span><h3>{CARDS[kind].name}가 지금 덱에서 어디에 연결되는가</h3></div>
    <div className="synergy-network">
      <div className="synergy-candidate"><span>NEW</span><strong>{CARDS[kind].name}</strong><small>{CARDS[kind].role}</small></div>
      <div className="synergy-links">{links.length?links.map((x,i)=><div key={x.id+'-'+i} className={'synergy-link '+x.kind}>
        <i/><div><strong>{x.name}</strong><span>{x.kind==='synergy'?'연계':'상충'} · {x.why}</span></div>
      </div>):<div className="synergy-none"><strong>직접 연결 없음</strong><span>독립적으로 역할을 추가하는 카드입니다.</span></div>}</div>
    </div>
    {!!good.length&&<p className="synergy-summary good">연계 {good.length}개 · 이미 가진 카드가 이 선택의 가치를 바로 받습니다.</p>}
    {!!bad.length&&<p className="synergy-summary bad">상충 {bad.length}개 · 함께 쓸 때 손해가 생기는 조합이 있습니다.</p>}
  </section>;
}

function FailureTimeline({s}){
  const shot=presentationFor(s),journey=failureJourney(s,shot);
  if(!journey)return null;
  return <section className={'failure-timeline failure-'+journey.grade} aria-label="실패 과정">
    <div className="failure-head"><span>WHY IT FAILED</span><strong>{journey.cause}</strong><small>{journey.detail}</small></div>
    <ol>{journey.steps.map((step,i)=><li key={step.key} className={step.state}>
      <i>{i+1}</i><span>{step.label}</span><b>{step.title}</b><em>{step.text}</em>
    </li>)}</ol>
  </section>;
}

function RunStory({s,compact=false}){
  const items=runStoryItems(s);
  if(!items.length)return null;
  return <section className={'run-story '+(compact?'compact':'')} aria-label="런 스토리">
    <div className="run-story-head"><span className="eyebrow">RUN STORY</span><h2>{compact?'지금까지 만든 런':'이번 런은 이렇게 만들어졌다'}</h2>{!compact&&<p>경기 결과가 아니라, 상대·카드·시설에서 내린 선택이 한 줄의 이야기로 남습니다.</p>}</div>
    <ol className="run-story-track">{items.map((item,i)=><li key={i+'-'+item.kind} className={'story-'+item.kind}>
      <i>{i+1}</i><div><span>{item.label}</span><strong>{item.title}</strong><small>{item.text}</small></div>
    </li>)}</ol>
  </section>;
}

export default function Duel(){
  useActorAssetPreload();
  const [initial]=useState(()=>{
    let v10=null;try{v10=readV10Duel(localStorage)}catch{}
    try{return {save:readDuel(localStorage),v10}}catch{return {error:'저장을 읽지 못했습니다. 새 런을 시작할 수 있습니다.',v10}}
  });
  const [growthChoice,setGrowthChoice]=useState(null),[rewardAction,setRewardAction]=useState(null),[facilityChoice,setFacilityChoice]=useState(null);
  const [build,setBuild]=useState(DECKBUILDER_BUILD),[trialSeed,setTrialSeed]=useState('20260910');
  const [s,setS]=useState(initial.save),[screen,setScreen]=useState(()=>typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('cinema')==='1'?'cinema':'menu'),[modal,setModal]=useState(null),[selected,setSelected]=useState(null),[swingStack,setSwingStack]=useState([]),[stackEdit,setStackEdit]=useState(null),[decisionMode,setDecisionMode]=useState(null),[tour,setTour]=useState({open:false,step:0}),[tourRect,setTourRect]=useState(null),[fx,setFx]=useState(null),[fxStage,setFxStage]=useState(null),[frame,setFrame]=useState(0),[error,setError]=useState(initial.error||''),[sound,setSound]=useState(false);
  const current=useRef(s),lock=useRef(false),timers=useRef([]),tourDismissed=useRef(false);
  const scoreboardRef=useRef(null),arenaRef=useRef(null),drawerRef=useRef(null),prepareRef=useRef(null),swingRef=useRef(null),watchRef=useRef(null),eventsRef=useRef(null);
  const showPreview=id=>{const p=previewCard(s,id);return {...p,coverageLabel:p.coverage?coverageText(s,id):undefined};};
  const b=s?.battle,isV10=s?.version===10,showBattle=screen==='run'&&b&&(['battle','pitch','between'].includes(s.phase)||fx),fxPresentation=fx?presentationFor(s):null,fxStakes=fx?stakesFor(s):null,resultPresentation=b?.revealed?presentationFor(s):null,byId=id=>s.deck.find(c=>c.id===id);
  const pile=modal&&['draw','discard','deck'].includes(modal)?(modal==='deck'?s.deck:b[modal].map(byId)):null;
  const hand=b?b.hand.map(id=>({id,entry:byId(id),preview:showPreview(id)})):[];
  const prepareHand=hand.filter(x=>CARDS[x.entry.kind].type==='skill'),swingHand=hand.filter(x=>CARDS[x.entry.kind].type!=='skill');
  const visibleHand=decisionMode==='prepare'?prepareHand:decisionMode==='swing'?swingHand:[];
  // The other group stays on screen. 릴리스 간파 and 주자 연결 live in different groups and that pair is the whole point.
  const otherHand=decisionMode==='prepare'?swingHand:decisionMode==='swing'?prepareHand:[];
  // Relations span the prepare/swing drawers on purpose: 릴리스 간파 is a skill, 주자 연결 is a swing, and that pair is the point.
  const activeRelations=(()=>{const m=new Map();if(!b)return m;
    const add=(pred,kind,why)=>{for(const x of hand)if(!m.has(x.id)&&pred(x.entry))m.set(x.id,{kind,why});};
    if(b.scouted&&b.scoutPlus)add(e=>CARDS[e.kind].shape==='column','synergy','확인한 열의 세로 3존 — 적중 확정');
    if(b.scouted)add(e=>CARDS[e.kind].shape==='row','synergy','확인한 높이의 가로 3존 — 적중 확정');
    if(b.expanded){add(e=>CARDS[e.kind].shape==='point','synergy','확장 적용 중 · 1존이 십자 5존이 된다');
      add(e=>['row','column','cross','all'].includes(CARDS[e.kind].shape),'conflict','확장으로 커버가 더 넓어져 파워가 그만큼 깎인다');}
    if(b.aim>0)add(e=>(CARDS[e.kind].power||0)>0,'synergy','집중 '+b.aim+' 적용 · 장타 계열에서 값이 가장 크다');
    if(b.runSignal)add(e=>e.kind==='rally','synergy','사인 + 주자 연결 = 기존 주자 '+(b.runSignalPlus?4:3)+'베이스');
    return m;})();
  const selectedEntry=selected&&selected!=='basic'&&b?.hand.includes(selected)?byId(selected):null;
  const supportCandidates=swingHand.filter(x=>x.id!==selected&&x.entry.kind!=='bunt');
  const stackAllowed=!!(isV10&&selectedEntry&&selectedEntry.kind!=='bunt'&&b.growthMode!=='patience');
  const activeStack=stackAllowed?swingStack.filter(x=>b?.hand.includes(x.id)&&x.id!==selected).slice(0,V10_SWING_STACK_MAX-1):[];
  const stackEditItem=activeStack.find(x=>x.id===stackEdit)||null;
  const rawChoice=selected&&(selected==='basic'||b?.hand.includes(selected))
    ?(isV10&&decisionMode==='swing'&&selectedEntry?previewV10Stack(s,selected,activeStack):showPreview(selected)):null;
  const choice=rawChoice&&rawChoice.coverage?{...rawChoice,coverageLabel:rawChoice.coverage.length+(activeStack.length?'존 스택 커버':'존 커버')}:rawChoice;
  const plannedRelations=selectedEntry?relationsFor(selectedEntry,hand.map(x=>x.entry)):new Map();
  const relationOf=id=>{const g=b&&growthConflict(byId(id),b.growthMode);
    return g?{kind:'conflict',why:g}:plannedRelations.get(id)||activeRelations.get(id)||null;};
  /* V10은 V9 전투 화면을 그대로 쓴다. 바뀌는 건 승리 조건(투수 HP)과 행동이 지나는 진입점뿐이다. */
  const doPlay=x=>isV10?playV10Action(x,{type:'card',id:selected,...(stackAllowed&&activeStack.length?{supports:activeStack}:{})}):playCard(x,selected);
  const doTake=x=>isV10?playV10Action(x,{type:'take'}):endTurn(x);
  const doNextPitch=x=>isV10?advanceV10Pitch(x):advancePitch(x);
  const doNextBatter=x=>isV10?advanceV10Batter(x):advanceBatter(x);
  const v10Pitcher=isV10?selectV10Pitcher(s):null,v10Combat=isV10?selectV10Combat(s):null;
  const v10Node=isV10&&s.runMap?s.runMap.nodes.find(n=>n.id===s.runMap.currentNodeId):null;
  const pitcherForm=isV10?pitcherFormKey(v10Node?.opponent?.archetypeKey):'outside';
  const firstDecision=showBattle&&!isV10&&s.phase==='battle'&&s.stage===0&&b.turn===1&&b.preparations===0&&b.strikes===0&&s.stats.appearances===0;
  const tourStep=TOUR_STEPS[tour.step];
  const tourCardTop=['prepare','swing','watch','events'].includes(tourStep?.target);

  useEffect(()=>()=>timers.current.forEach(clearTimeout),[]);
  useEffect(()=>{const close=e=>{if(e.key==='Escape'){setModal(null);setDecisionMode(null);setSelected(null);setSwingStack([]);setStackEdit(null);tourDismissed.current=true;try{localStorage.setItem(TOUR_KEY,'done')}catch{}setTour(t=>t.open?{open:false,step:0}:t);}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[]);
  useEffect(()=>{if(!showBattle||isV10||s?.phase!=='battle'||tour.open||tourDismissed.current)return;try{if(localStorage.getItem(TOUR_KEY)==='done')return;}catch{}setTour({open:true,step:0});},[showBattle,s?.phase,tour.open]);
  useEffect(()=>{
    if(!tour.open||!tourStep){setTourRect(null);return;}
    const refs={scoreboard:scoreboardRef,arena:arenaRef,prepare:prepareRef,swing:swingRef,watch:watchRef,events:eventsRef};
    const el=refs[tourStep.target]?.current;
    if(!el){setTourRect(null);return;}
    const update=()=>{const r=el.getBoundingClientRect();const pad=8;setTourRect({top:Math.max(6,r.top-pad),left:Math.max(6,r.left-pad),width:Math.max(16,Math.min(window.innerWidth-12,r.width+pad*2)),height:Math.max(16,r.height+pad*2)});};
    el.scrollIntoView?.({block:tourCardTop?'center':'nearest',behavior:'auto'});
    update();
    window.addEventListener('resize',update);
    window.addEventListener('scroll',update,true);
    return()=>{window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true);};
  },[tour.open,tour.step,tourStep?.target,tourCardTop,showBattle]);

  function persist(next){current.current=next;setS(next);try{next.version===10?saveV10Duel(localStorage,next):saveDuel(localStorage,next);setError('')}catch{setError('저장 실패: 이 창을 닫으면 진행을 잃을 수 있습니다.');}}
  function rememberTour(){tourDismissed.current=true;try{localStorage.setItem(TOUR_KEY,'done')}catch{}}
  function closeTour(markSeen=true){if(markSeen)rememberTour();setTourRect(null);setTour({open:false,step:0});}
  function reopenTour(){if(!showBattle||s.phase!=='battle')return;setModal(null);setSelected(null);setDecisionMode(null);setTour({open:true,step:0});}
  // On one column the arena sits far above the decision dock, so a swing played its
  // cinema entirely off-screen. Pull the arena into view before the first frame.
  function revealArena(){
    const el=arenaRef.current;if(!el?.getBoundingClientRect)return;
    const r=el.getBoundingClientRect(),vh=window.innerHeight||0;
    if(!r.height)return;
    const visible=Math.max(0,Math.min(r.bottom,vh)-Math.max(r.top,0));
    if(visible>=r.height*.9)return;
    el.scrollIntoView?.({block:'center',behavior:'auto'});
  }
  function act(fn,animate=false){if(lock.current||tour.open)return;const next=fn(current.current);if(next===current.current)return;persist(next);setSelected(null);setSwingStack([]);setStackEdit(null);setGrowthChoice(null);setRewardAction(null);setFacilityChoice(null);setDecisionMode(null);if(animate){const shot=presentationFor(next),reduced=next.version!==10||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,timeline=presentationTimeline(shot,reduced),pitchJudgement=!!next.battle?.revealed&&next.last?.kind!=='skill';lock.current=true;revealArena();setFx(next.last);setFxStage('windup');setFrame(1);if(sound)cue(pitchJudgement?'pitch':shot?.cue||next.last.kind);const stakes=stakesFor(next),scheduled=[setTimeout(()=>{setFxStage('impact');setFrame(2);if(sound&&pitchJudgement)cue(shot?.cue||next.last.kind);haptic(timeline.haptic);},timeline.impactAt)];if(timeline.slowmo>0)scheduled.push(setTimeout(()=>setFxStage('slowmo'),timeline.impactAt+timeline.freeze));scheduled.push(setTimeout(()=>setFxStage('release'),timeline.releaseAt),setTimeout(()=>{setFxStage('settle');if(sound&&stakes)cue(stakes);if(stakes==='game-win')haptic([12,22,28]);if(stakes==='champion'||stakes==='rival-champion')haptic([18,18,38,24,58]);},timeline.settleAt),setTimeout(()=>{setFx(null);setFxStage(null);setFrame(0);lock.current=false;timers.current=[]},timeline.duration));timers.current=scheduled;}}
  function freshV10(){setGrowthChoice(null);setRewardAction(null);setFacilityChoice(null);persist(createV10Duel(Number(trialSeed)>>>0));setScreen('run');setModal(null);setSelected(null);setSwingStack([]);setStackEdit(null);setDecisionMode(null);setTour({open:false,step:0});}
  function fresh(){setGrowthChoice(null);setRewardAction(null);setFacilityChoice(null);persist(createDuel(Number(trialSeed)>>>0,build));setScreen('run');setModal(null);setSelected(null);setSwingStack([]);setStackEdit(null);setDecisionMode(null);setTour({open:false,step:0});}
  function toggleGrowth(mode){if(lock.current||tour.open)return;persist(setGrowthMode(current.current,mode));}
  function openDecision(mode){
    if(lock.current)return;
    setSelected(null);setSwingStack([]);setStackEdit(null);setDecisionMode(mode);
    /* 결정 영역은 구장·9존 아래라 화면 밖에서 열린다. 열자마자 그 자리로 데려가지 않으면
       뒤로가기도 지켜보기도 스크롤해야 보인다. */
    requestAnimationFrame(()=>drawerRef.current?.scrollIntoView?.({block:'center',behavior:'auto'}));
  }

  return <div className={'duel-app diamond-app'+(fxPresentation?' presentation-'+fxPresentation.kind:'')+(fxStage?' presentation-stage-'+fxStage:'')}>
    <header className="duel-header"><button className="wordmark" onClick={()=>{if(!lock.current)setScreen('menu')}}>9ZONE<span> HOMEBOUND</span></button><span className="edition">BUILD YOUR BASEBALL · V9.2</span><nav><button aria-label={'소리 '+(sound?'켜짐':'꺼짐')} onClick={()=>{if(!sound)cue('skill');setSound(!sound)}}>♪ {sound?'ON':'OFF'}</button>{s&&<button onClick={()=>setModal('deck')}>덱</button>}<button onClick={()=>setModal('help')}>?</button></nav></header>
    {error&&<div className="save-error" role="alert">{error}<button onClick={()=>s&&persist(s)}>저장 재시도</button></div>}
    {screen==='cinema'?<CinemaLab sound={sound} onBack={()=>setScreen('menu')}/>
    :screen==='menu'?<main className="duel-title stadium"><div className="title-copy"><span className="eyebrow">READ → BET → REVEAL → IMPACT</span><h1>내가 기다릴 공.<br/><em>내가 만드는 타격.</em></h1><section className="title-main" aria-label="메인런"><span className="title-main-tag">MAIN RUN</span><h2>투수를 끌어내려라.</h2><p>투수 HP를 0으로 만들면 강판입니다. 갈림길을 골라 3막을 돌파하세요. 막이 올라갈수록 상대가 두꺼워지고 쓰는 코스가 늘어납니다.</p><div className="title-main-actions"><button className="primary v10-entry" aria-label="MAIN RUN 시작 · 투수 HP" onClick={()=>freshV10()}>새 런 시작</button>{initial.v10&&<button className="v10-entry" aria-label="MAIN RUN 이어하기" onClick={()=>{persist(initial.v10);setScreen('run')}}>이어하기</button>}</div></section><section className="title-tutorial" aria-label="튜토리얼"><span className="eyebrow">TUTORIAL · 규칙 익히기</span><p>아래 네 덱은 규칙만 익히는 모드입니다. 연출을 줄여 빠르게 돌아갑니다.</p><div className="build-picker v9-build-picker" aria-label="런 방식">{Object.entries(BUILDS).map(([key,d])=><button key={key} aria-pressed={build===key} onClick={()=>setBuild(key)}><span className="build-mode">{key===DECKBUILDER_BUILD?'튜토리얼 · 덱 만들기':'튜토리얼 · 완성형 체험'}</span><strong>{d.name}</strong><small>{d.description}</small></button>)}</div><label className="trial-seed">비교용 시드 <input aria-label="비교용 시드" type="number" min="0" max="4294967295" value={trialSeed} onChange={e=>setTrialSeed(e.target.value)}/><span>같은 시드 = 같은 첫 투구 · 이후 카운트에 따라 변화</span></label><div className="title-actions"><button onClick={()=>s&&!['won','lost'].includes(s.phase)?setModal('new'):fresh()}>튜토리얼 시작</button>{s&&<button onClick={()=>setScreen('run')}>이어하기</button>}{typeof window!=='undefined'&&window.location.pathname.includes('/preview/')&&<button className="cinema-entry" onClick={()=>setScreen('cinema')}>✦ 연출 검수실</button>}</div></section><small>4숙련존 · 볼넷 · 파울 생존 · BASIC SWING<br/>9ZONE V9.2 / 4경기 · 3카드 보상 · 3시설 · 상대 브랜치</small></div><div className="title-actor"><Sprite who="batter"/></div></main>
:showBattle?<main className={'duel-combat release-combat stadium-stage-'+s.stage+' phase-'+s.phase+' decision-'+(decisionMode||'hub')+(fxStage?' cinematic-focus':'')+(routeChoice(s.stage,s.route)?.statBonus?' rival-game':'')+(fxPresentation?' fx-'+fxPresentation.kind:'')+(fxStakes?' stakes-'+fxStakes:'')+(isV10&&fxPresentation?.motion?.shake?' shake-'+fxPresentation.motion.shake:'')+(fxStage?' fx-stage-'+fxStage:'')}><div className="battle-ribbon"><span>{isV10?v10Node?.act+'막':s.stage+1+' / 4'}</span><b>{isV10?(v10Node?.name||'승부'):STAGES[s.stage].name}</b><span>타석 {b.turn}</span></div>{isV10&&v10Pitcher&&<div className="v10-combat-hp"><PitcherHpHud {...v10Pitcher} name={(v10Node?.opponent?.archetype?v10Node.opponent.archetype+' · ':'')+v10Pitcher.name}/>{v10Combat&&<CombatResultSummary choice={{card:v10Combat.choiceLabel||v10ChoiceName(v10Combat.choice),zone:v10Combat.aimLabel||v10ZoneName(b.revealed?.aimZone)}} actualPitch={{type:v10Combat.pitchName||b.intent?.name,zone:v10Combat.pitchLabel||v10ZoneName(v10Combat.actualPitch)}} verdict={v10Combat.verdict} damage={v10Combat.damage} hpAfter={v10Combat.hpAfter} cardCount={v10Combat.cardCount||1} damageRate={v10Combat.damageRate??1}/>}</div>}<Scoreboard s={s} onLineup={()=>setModal('lineup')} targetRef={scoreboardRef}/><section ref={arenaRef} className={'duel-arena stadium renderer2-host golden-master-stage pitcher-form-'+pitcherForm+' '+arenaPresentationClass(fxStage,fxPresentation)+(fx?.kind==='hit'?' impact':'')+(s.phase==='between'?' between':'')} aria-label="승부 구장"><ArenaRenderer2 stage={fxStage} shot={fxPresentation} match={s.stage} rival={!!routeChoice(s.stage,s.route)?.statBonus} revealed={b.revealed} token={s.stats.pitches} label="실전 WebGL 경기장"/><GoldenMasterStage stage={fxStage} shot={fxPresentation} rival={!!routeChoice(s.stage,s.route)?.statBonus} match={s.stage}/>{isV10&&<><PixelCinema stage={fxStage} shot={fxPresentation}/><PixelVFX stage={fxStage} shot={fxPresentation} token={s.stats.pitches} drawCore={false}/></>}<ReadTrace s={s} stage={fxStage} shot={fxPresentation}/><div className={'intent '+b.intent.kind}><span>{s.phase!=='battle'?'판정 완료':'투수 의도'}</span><strong>{b.intent.name}</strong><b>{b.revealed?'실제 공 공개':'코스 경향 · 확정 예고 아님'}</b></div><div className={'actor-left '+(isV10?'has-smooth-actor ':'')+(s.phase==='between'&&!fx?'leaving-batter':'')} key={'batter-'+b.turn}>{isV10?<SmoothActor who="batter" stage={fxStage} shot={fxPresentation}/>:<Sprite who="batter" stage={fxStage} shot={fxPresentation} golden/>}<span className="batter-nameplate">#{currentBatter(s).number} {currentBatter(s).name}</span></div><div className={'actor-right '+(isV10?'has-smooth-actor ':'')+'pitcher-form-'+pitcherForm}>{isV10?<SmoothActor who="pitcher" stage={fxStage} shot={fxPresentation} variant={pitcherForm}/>:<Sprite who="pitcher" stage={fxStage} shot={fxPresentation} golden variant={pitcherForm}/>}{isV10&&<span className="pitcher-nameplate">{v10Pitcher?.name||'OPPONENT'}</span>}</div><Diamond s={s}/>{fx&&<FlightVisual key={'effect-'+s.stats.pitches} revealed={b.revealed} fx={fx} showCopy/>}{fxPresentation&&<JudgementVisual key={'judgement-'+s.stats.pitches+'-'+fxPresentation.kind} shot={fxPresentation} stage={fxStage} cinema={isV10}/>}{isV10&&<ClutchLayer stakes={fxStakes} stage={fxStage}/>}</section><ZoneBoard s={s} id={selected||"basic"} coveredOverride={activeStack.length?choice?.coverage:null} matchupOverride={activeStack.length?choice?.matchup:null} disabled={s.phase!=='battle'||!!fx||tour.open} onZone={z=>{if(!lock.current)persist(setAimZone(current.current,z));}}/><div className="pitch-read"><span>{s.phase!=='battle'?'RESULT':'READ'}</span><b>{s.phase!=='battle'?s.last.text:b.intent.detail}</b>{s.phase==='battle'&&<small>집중 +{b.aim} · 준비 {b.preparations}/2 · 손패 {b.hand.length}</small>}</div><section className="duel-table">{!isV10&&<GrowthPanel s={s} disabled={!!fx||tour.open||s.phase!=='battle'} onMode={toggleGrowth}/>}<div ref={eventsRef} className={'diamond-events '+(s.last?.kind==='repertoire'?'repertoire-event':'')} role="status"><b>{s.last?.text}</b>{s.last?.events?.slice(0,2).map((e,i)=><span key={i}>{e}</span>)}{s.last?.growthEvents?.map((e,i)=><b key={'g'+i} className="growth-event">{e}</b>)}</div>{s.phase==='pitch'&&<section className={'pa-result result-'+(b.revealed?.kind||'neutral')+' result-grade-'+(resultPresentation?.grade||'neutral')} aria-label="투구 결과"><span>REVEAL · SAME BATTER</span><strong className="result-call">{resultPresentation?.title||resultCall(b.revealed)}</strong><h2>{b.revealed.label}</h2><p>{b.balls}볼 {b.strikes}스트라이크 · {currentBatter(s).name} 그대로 타석에</p><FailureTimeline s={s}/><button className="primary next-batter" disabled={!!fx} onClick={()=>act(doNextPitch)}>다음 공 · 같은 타자</button></section>}{s.phase==='between'&&<section className={'pa-result result-'+(b.revealed?.kind||'neutral')+' result-grade-'+(resultPresentation?.grade||'neutral')} aria-label="타석 종료 결과"><span>PLATE APPEARANCE COMPLETE</span><strong className="result-call">{resultPresentation?.title||resultCall(b.revealed)}</strong><h2>{b.revealed?.label}</h2><p>{b.batterIndex+1}번 {currentBatter(s).name} · 타석 종료</p><p className="runner-summary">현재 주자 · {b.bases.map((id,i)=>id?(i+1)+'루 '+LINEUP.find(p=>p.id===id).name:null).filter(Boolean).join(' / ')||'없음'}</p><FailureTimeline s={s}/><button aria-label={`다음 타자 입장 · ${(b.batterIndex+1)%9+1}번 ${LINEUP[(b.batterIndex+1)%9].name}`} className="primary next-batter" disabled={!!fx} onClick={()=>act(doNextBatter)}>다음 타자 입장 · {(b.batterIndex+1)%9+1}번 {LINEUP[(b.batterIndex+1)%9].name}<span>NEXT BATTER →</span></button></section>}{s.phase==='battle'&&<>{!decisionMode?<section className={'decision-hub '+(firstDecision?'coach-focus':'')} aria-label="이번 타석 행동 선택"><div className="decision-copy"><span>{firstDecision?'첫 타석 가이드':'YOUR CALL'}</span><h2>{firstDecision?'투수 의도를 읽었습니다. 이제 하나만 선택하세요.':'이번 공, 어떻게 가져갈까?'}</h2><p>{firstDecision?'9존을 선택하고 카드 커버를 확인하세요. 볼을 기다리거나, 넓게 버티거나, 좁게 장타를 노립니다.':'준비와 스윙을 함께 비교하세요. 한 공에 스윙은 한 번입니다.'}</p></div><div className="action-dock"><button ref={prepareRef} className="action prepare" aria-label="준비하기" disabled={b.preparations>=2||!prepareHand.length||!!fx} onClick={()=>openDecision('prepare')}><span>1</span><strong>준비하기</strong><small>{b.preparations}/2 · {prepareHand.length}장</small></button><button ref={swingRef} className="action swing" aria-label="스윙하기" disabled={!!fx} onClick={()=>openDecision('swing')}><span>2</span><strong>스윙하기</strong><small>{isV10?'카드를 존에 최대 '+V10_SWING_STACK_MAX+'장 배치':swingHand.length+'장 + 기본 스윙'}</small></button><button ref={watchRef} className="action watch" aria-label="한 구 지켜보기" disabled={!!fx} onClick={()=>openDecision('watch')}><span>3</span><strong>한 구 지켜보기</strong><small>{b.strikes===2?'스트라이크면 삼진 · 볼이면 생존':'볼 / 스트라이크 확인'}</small></button></div></section>:decisionMode==='watch'?<section className="watch-confirm"><h2>이 공을 지켜볼까?</h2><p>{b.strikes===2?'스트라이크면 삼진. 볼이면 볼카운트가 쌓입니다.':'볼은 볼카운트 +1, 스트라이크는 +1. 다음 공에 카드 1장을 뽑습니다.'}</p><button onClick={()=>setDecisionMode(null)}>돌아가기</button><button className="primary" onClick={()=>act(doTake,true)}>지켜보기 · 공 진행</button></section>:<section ref={drawerRef} className="card-drawer" aria-label={decisionMode==='prepare'?'준비 카드 선택':'스윙 카드 선택'}><div className="drawer-head"><button className="drawer-back" onClick={()=>{setDecisionMode(null);setSelected(null);setSwingStack([]);setStackEdit(null)}}>← 돌아가기</button><div><span>{decisionMode==='prepare'?'PREPARE':'SWING'}</span><h2>{decisionMode==='prepare'?'스윙 전에 무엇을 준비할까?':'이 공을 어떻게 칠까?'}</h2></div><small>{visibleHand.length}장 · 손패 전체 {hand.length}장</small></div><div className="drawer-escape"><span>{b.strikes===2?'존 밖이면 볼, 존 안이면 삼진입니다.':'존 밖으로 올 것 같으면 치지 않아도 됩니다.'}</span><button className="drawer-watch" disabled={!!fx} onClick={()=>act(doTake,true)}>한 구 지켜보기</button></div>{isV10&&decisionMode==='swing'&&<div className="stack-discovery" role="note" aria-label="카드 겹치기 안내"><div className="stack-fan" aria-hidden="true"><i/><i/><i/><i/></div><div><span>NEW · SWING STACK</span><strong>한 장만 낼 필요 없습니다.</strong><p>메인 카드를 고른 뒤 최대 3장을 더 겹치세요. <b>커버는 넓어지고</b>, 대신 <em>투수 HP 피해 효율은 내려갑니다.</em></p></div></div>}<div className="duel-hand">{decisionMode==='swing'&&<button className="duel-card basic-card" aria-label="BASIC SWING" aria-pressed={selected==='basic'} onClick={()=>{setSelected('basic');setSwingStack([]);setStackEdit(null)}}><span className="card-cost">항상 사용</span><strong>BASIC SWING</strong><p>선택한 1존 · 카드 소비 없음</p>{b.growthMode==='patience'&&<small>기다림 성장으로 장타 가능</small>}<small>카드가 없어도 승부할 수 있습니다.</small></button>}{visibleHand.map(({id,entry,preview})=><Card key={id} kind={entry.kind} plus={entry.plus} relation={relationOf(id)} selected={selected===id} problem={preview.problem} preview={preview} onClick={()=>{if(!lock.current){setSelected(id);setSwingStack([]);setStackEdit(null)}}}/>)}{!visibleHand.length&&<p className="empty-hand">{decisionMode==='swing'?'스윙 카드는 없지만 BASIC SWING은 사용할 수 있습니다.':'지금 사용할 수 있는 준비 카드가 없습니다.'}</p>}{otherHand.length>0&&<div className="hand-divider" aria-hidden="true"><span>{decisionMode==='prepare'?'스윙':'준비'}</span></div>}{otherHand.map(({id,entry,preview})=><Card key={id} kind={entry.kind} plus={entry.plus} relation={relationOf(id)} selected={selected===id} problem={preview.problem} preview={preview} note={(CARDS[entry.kind].type==='skill'?'준비':'스윙') + ' 카드 · 누르면 전환'} onClick={()=>{if(!lock.current){setDecisionMode(CARDS[entry.kind].type==='skill'?'prepare':'swing');setSelected(id);setSwingStack([]);setStackEdit(null);}}}/>)}</div>{isV10&&decisionMode==='swing'&&selectedEntry&&selectedEntry.kind!=='bunt'&&b.growthMode!=='patience'&&<section className="swing-stack" aria-label="스윙 스택"><div className="stack-head"><div><span>SWING STACK · RANGE ↔ DAMAGE</span><strong>커버를 살수록, 한 방은 약해진다.</strong><p>메인 카드의 효과는 유지됩니다. 추가 카드는 빈 코스를 막는 보험이고, 추가 카드에만 맞으면 단타입니다.</p></div><div className="stack-efficiency"><small>HP 피해 효율</small><b>{Math.round((choice?.damageRate??1)*100)}%</b><em>{1+activeStack.length}장 사용</em></div></div><div className="stack-tradeoff" aria-label="카드 수별 HP 피해 효율">{V10_SWING_DAMAGE_RATES.map((rate,i)=><div key={rate} className={(1+activeStack.length===i+1?'current ':'')+(i<activeStack.length+1?'filled':'')}><span>{i+1}장</span><b>{Math.round(rate*100)}%</b><small>{['강공','균형','안전','올인'][i]}</small></div>)}</div><div className="stack-lane" aria-label="현재 겹친 카드"><div className="stack-slot main"><span>MAIN</span><strong>{CARDS[selectedEntry.kind].name}{selectedEntry.plus?'+':''}</strong><small>{ZONES[b.aimZone]} · 원래 효과 유지</small></div>{Array.from({length:V10_SWING_STACK_MAX-1},(_,i)=>{const x=activeStack[i],entry=x?byId(x.id):null;return x?<button type="button" key={x.id} className={'stack-slot support '+(stackEdit===x.id?'editing':'')} onClick={()=>setStackEdit(x.id)}><span>+{i+1}</span><strong>{CARDS[entry?.kind]?.name}{entry?.plus?'+':''}</strong><small>{ZONES[x.aimZone]} · 커버만</small><i aria-hidden="true">편집</i></button>:<div key={'empty'+i} className="stack-slot empty"><span>+{i+1}</span><strong>카드 추가</strong><small>{i===0?'여기서 빈 코스를 막기':'선택 사항'}</small></div>})}</div><div className="stack-candidates" aria-label="겹칠 카드 선택">{supportCandidates.map(({id,entry})=>{const picked=activeStack.some(x=>x.id===id),full=activeStack.length>=V10_SWING_STACK_MAX-1&&!picked;return <button type="button" key={id} className={picked?'picked':''} aria-pressed={picked} disabled={full} onClick={()=>{if(picked){setSwingStack(xs=>xs.filter(x=>x.id!==id));if(stackEdit===id)setStackEdit(null);}else{setSwingStack(xs=>[...xs,{id,aimZone:b.aimZone}].slice(0,V10_SWING_STACK_MAX-1));setStackEdit(id);}}}><span>{picked?'✓ STACK':'+ 겹치기'}</span><strong>{CARDS[entry.kind].name}{entry.plus?'+':''}</strong><small>{AXIS_NAMES[CARDS[entry.kind].axis]||'커버'} · 효과는 미발동</small></button>})}{!supportCandidates.length&&<p>지금 손패에는 더 겹칠 스윙 카드가 없습니다.</p>}</div>{stackEditItem&&<div className="stack-aim-editor"><div className="stack-aim-title"><div><span>추가 카드 코스</span><strong>{CARDS[byId(stackEditItem.id)?.kind]?.name}은 어디를 막을까?</strong></div><button type="button" onClick={()=>{setSwingStack(xs=>xs.filter(x=>x.id!==stackEditItem.id));setStackEdit(null)}}>이 카드 빼기</button></div><div className="assist-zone-grid" role="group" aria-label="추가 카드 노릴 존">{ZONES.map((name,z)=><button type="button" key={z} aria-label={'추가 카드 '+name} aria-pressed={stackEditItem.aimZone===z} className={stackEditItem.aimZone===z?'selected':''} onClick={()=>setSwingStack(xs=>xs.map(x=>x.id===stackEditItem.id?{...x,aimZone:z}:x))}><span>{z+1}</span><small>{name}</small></button>)}</div></div>}<div className="stack-verdict"><div><span>현재 커버</span><b>{choice?.coverage?.length||0}<i>/9</i></b></div><div><span>카드 소모</span><b>{1+activeStack.length}<i>장</i></b></div><div className="damage"><span>HP 피해</span><b>{Math.round((choice?.damageRate??1)*100)}<i>%</i></b></div><p>{activeStack.length?'안전하게 넓힌 만큼 피해 효율이 내려갑니다. 이 스윙 뒤 선택한 카드 '+(1+activeStack.length)+'장은 모두 버림으로 갑니다.':'한 장 승부는 HP 피해 100%. 더 겹칠수록 맞히기 쉬워지는 대신 피해가 줄어듭니다.'}</p></div></section>}<div className={'decision-preview '+(choice?'active':'')}>{choice?<><div><b>{choice.problem||choice.label}</b><span>{selectedEntry&&CARDS[selectedEntry.kind].type==='skill'?'준비 1회 · 공 소비 없음':'공 1개 진행 · 스윙은 한 번'}</span>{choice.hit!=null&&<><span>{choice.coverageLabel}{choice.sacrifice>0?' · 희생 작전':' · 범위 적중 시 안타'}</span><span>{choice.sacrifice>0?'희생 작전':'적중 뒤 실패 판정 없음'}{choice.sacrifice>0?' · 스트라이크일 때 '+(selectedEntry?.plus?'85':'70')+'% 성공':''} · 코스 확률과 타격 범위로 계산합니다.</span></>}{readLevel(s)===2&&choice.types&&choice.hit>0&&<span className="hit-profile">적중 후 안타 종류: {choice.types.filter(t=>t.p>.005).map(t=>t.label+' '+pct(t.p)).join(' / ')}</span>}{choice.growthText&&<b className="growth-preview">{choice.growthText}</b>}{choice.events?.slice(0,2).map((e,i)=><span key={i}>{e}</span>)}</div><button className="primary" disabled={!!choice.problem||!!fx} onClick={()=>act(doPlay,true)} data-testid="execute-action">{isV10&&decisionMode==='swing'&&selectedEntry?(activeStack.length?(1+activeStack.length)+'장 배치 스윙 · HP '+Math.round((choice?.damageRate??1)*100)+'%':CARDS[selectedEntry.kind].name+' · 단독 스윙 100%'):selected==='basic'?'기본 스윙':CARDS[selectedEntry?.kind]?.name+(selectedEntry?.plus?'+':'')+(CARDS[selectedEntry?.kind]?.type==='skill'?' · 준비 1회':' · 스윙')}</button></>:<><b>카드를 9존에 놓으세요.</b><span>카드를 놓은 위치가 노림존이 됩니다. 추가 카드를 더 놓으면 커버가 넓어집니다.</span></>}</div></section>}</>}<div className="table-footer"><div className="pile-buttons"><button onClick={()=>setModal('draw')}>뽑기 {b.draw.length}</button><button onClick={()=>setModal('discard')}>버림 {b.discard.length}</button></div><span className="deck-rule">선수는 베이스에 · 카드는 행동에</span></div></section></main>
    :isV10&&s.phase==='map'?<main className="duel-map stadium v10-run-map-screen"><div className="map-copy"><span className="eyebrow">HOMEBOUND / ROAD TO THE SHOW</span><h1>{s.runMap.completedNodeIds.length?'다음 원정을 고른다.':'첫 원정을 고른다.'}</h1><p>3아웃 전에 투수 HP를 0으로 만든다. 쉬운 길은 덱을 다듬고, 위험한 길은 더 큰 보상을 연다. 상대의 9존 성향과 이후 경로까지 읽고 결정하세요.</p><p className="route-run-summary">덱 {s.deck.length}장 · 돌파한 칸 {s.runMap.completedNodeIds.length}개 · 유물 {s.relics.length}</p><RewardJournal s={s}/></div><RunMap {...selectV10Map(s)} onSelect={id=>{const why=v10NodeProblem(current.current,id);if(why){setError(why);return}setError('');act(x=>enterV10Node(x,id))}}/></main>
    :isV10&&s.phase==='reward'?<main className="reward-screen growth-reward-screen"><span className="eyebrow">HOME SAFE / 강판</span><h1>{s.v10?.opponent?.name||'상대 투수'} 강판.</h1><p>{b.outs}아웃 · {s.stats.pitches}구 — 카드 한 장을 고르거나 건너뜁니다.</p><div className="reward-cards">{v10RewardOptions(s).map(kind=><Card key={kind} kind={kind} selected={selected===kind} onClick={()=>setSelected(kind)}/>)}</div><div className="reward-actions"><button className="primary" disabled={!selected} onClick={()=>act(x=>claimV10Reward(x,{type:'add',kind:selected}))}>{selected?CARDS[selected].name+' 받기':'카드를 고르세요'}</button><button onClick={()=>act(x=>claimV10Reward(x,{type:'skip'}))}>건너뛰기</button><button onClick={()=>setModal('deck')}>덱 보기</button></div></main>
    :isV10&&V10_UTILITY_PHASES.includes(s.phase)?<main className="reward-screen growth-reward-screen"><span className="eyebrow">ON THE ROAD / {v10Node?.routeLabel||'경로'}</span><h1>{V10_UTILITY_TITLES[s.phase]}</h1><p>{v10Node?.utility?.detail||'다음 승부 전에 한 가지를 정합니다.'}</p>{!v10UtilityOptions(s).length&&<p className="v10-empty-stop">{V10_UTILITY_EMPTY[s.phase]}</p>}<div className="reward-cards">{v10UtilityOptions(s).map((o,i)=>o.kind?<Card key={i} kind={o.kind} label={o.name} selected={selected===i} onClick={()=>setSelected(i)}/>:<button key={i} type="button" className={'duel-card skill '+(selected===i?'selected':'')} onClick={()=>setSelected(i)}><strong>{o.name}</strong><p className="card-rule">{V10_UTILITY_NOTES[o.type]}</p></button>)}</div><div className="reward-actions">{!!v10UtilityOptions(s).length&&<button className="primary" disabled={selected===null||selected===undefined} onClick={()=>act(x=>completeV10UtilityNode(x,v10UtilityOptions(x)[selected]))}>확정</button>}<button className={v10UtilityOptions(s).length?'':'primary'} onClick={()=>act(x=>completeV10UtilityNode(x,{type:'skip'}))}>{v10UtilityOptions(s).length?'그냥 지나간다':'지도로 돌아간다'}</button></div></main>
    :s.phase==='facility'?<main className="facility-screen stadium"><FacilityScreen s={s} choice={facilityChoice} target={selected}
      onChoice={setFacilityChoice} onTarget={setSelected} onConfirm={action=>act(x=>chooseFacility(x,action))}/></main>
    :s.phase==='map'?<main className="duel-map stadium"><div className="map-copy"><span className="eyebrow">{s.build===DECKBUILDER_BUILD?'HOMEBOUND / BUILD THE TEAM':'HOMEBOUND / FOUR DIAMONDS'}</span><h1>{s.build===DECKBUILDER_BUILD?'경기에서 카드를 얻고,\n이동 중 팀을 바꾼다.':'한 타석을 설계하고,\n다음 타자에게 이어라.'}</h1><p>{s.build===DECKBUILDER_BUILD?'각 승부는 3아웃. 승리하면 카드 한 장을 고르고, 다음 상대 전에는 시설 하나만 들를 수 있습니다. 모든 선택을 가질 수 없기 때문에 런마다 다른 팀이 됩니다.':<>각 승부는 3아웃.<br/>선수는 타순대로, 같은 타자가 여러 공을 승부합니다.<br/>세 번의 성장으로 한 길을 심화하거나 서로 연결하세요.</>}</p><GrowthSummary s={s}/>{s.build===DECKBUILDER_BUILD&&s.stage>0&&s.facilities?.[s.stage-1]?.type==='scouting'&&<p className="map-scout-badge">스카우팅 적용 · 이번 경기 읽기 {READ_LEVELS[readLevel(s)].name}</p>}<OpponentReport stage={s.stage} routeId={s.route}/><RewardJournal s={s}/>{s.build===DECKBUILDER_BUILD&&s.stage>0&&<RunStory s={s} compact/>}{s.fortune>0&&<p>다음 승부로 가져가는 행운: {s.fortune}/6</p>}</div>{s.build===DECKBUILDER_BUILD&&<RouteBranches s={s} onChoose={id=>act(x=>chooseRoute(x,id))} onStart={()=>act(startBattle)}/>}<div className="map-route">{STAGES.map((stage,i)=><div key={i} className={'route-node '+(i===s.stage?'current':'')+(i<s.stage?' cleared':'')}><span>{i<s.stage?'✓':'0'+(i+1)}</span><div><h2>{stage.name}</h2><p>{stage.sub}</p></div>{i===s.stage?(s.build===DECKBUILDER_BUILD?<small>{s.route?'상대 선택 완료':'상대를 선택하세요'}</small>:<button className="primary" onClick={()=>act(startBattle)}>승부 시작</button>):<small>{i<s.stage?'돌파':'대기'}</small>}</div>)}</div></main>
    :s.phase==='reward'?<main className="reward-screen growth-reward-screen"><span className="eyebrow">{s.build===DECKBUILDER_BUILD?'HOME SAFE / DECK DRAFT':'HOME SAFE / GROWTH'} {s.stage+1} OF 3</span><h1>{s.build===DECKBUILDER_BUILD?'이번 런의 야구를 직접 만든다.':'이 승리를, 다음 경기의 무기로.'}</h1><p>{b.runs}점 · {b.outs}아웃 — {s.build===DECKBUILDER_BUILD?'세 카드 중 한 장을 고르거나 건너뜁니다. 강화·제거·장비·스카우팅은 경기 뒤 이동 경로에서 따로 선택합니다.':'성장 1단계와 덱 변경 한 가지를 함께 확정합니다. 덱을 그대로 둘 수도 있습니다.'}</p>
      <GrowthSummary s={s}/>
      <RewardScreen s={s} growthChoice={growthChoice} action={rewardAction} target={selected}
        onGrowth={key=>{setGrowthChoice(key);setSelected(null);setRewardAction(null);}}
        onAction={type=>{setRewardAction(type);setSelected(null);}}
        onTarget={setSelected}
        onConfirm={action=>act(x=>chooseReward(x,action,s.build===DECKBUILDER_BUILD?null:growthChoice))}/>
      </main>
    :isV10?<main className="duel-result stadium"><span className="eyebrow">{s.phase==='won'?'RUN COMPLETE':'THREE OUTS'}</span><h1>{s.phase==='won'?'마지막 투수까지 끌어내렸다.':'삼아웃. 이 승부는 여기서 끝났다.'}</h1><p>돌파한 칸 {s.runMap.completedNodeIds.length}개 · 덱 {s.deck.length}장 · 안타 {s.stats.hits} · 볼넷 {s.stats.walks} · 파울 {s.stats.fouls} · 헛스윙 {s.stats.whiffs} · {s.stats.pitches}구</p><p className="route-run-summary">지나온 칸 · {s.runMap.completedNodeIds.map(id=>s.runMap.nodes.find(n=>n.id===id)?.name).filter(Boolean).join(' → ')||'없음'}</p><button className="primary" onClick={freshV10}>다시 도전</button><button onClick={()=>setModal('deck')}>덱 보기</button><button onClick={()=>setScreen('menu')}>타이틀로</button></main>
    :<main className="duel-result stadium"><span className="eyebrow">{s.phase==='won'?'EVERYBODY HOME':'THREE OUTS'}</span><h1>{s.phase==='won'?'타순을 연결해, 경기를 뒤집었다.':'베이스에 남겨 둔 가능성.'}</h1><p>{s.victories}/4 승부 · 총 {s.stats.runs}득점 · 완료 타석 {s.stats.appearances}회 · {s.stats.pitches}구</p><p>{BUILDS[s.build].name} · 안타 {s.stats.hits} · 볼넷 {s.stats.walks} · 파울 {s.stats.fouls} · 헛스윙 {s.stats.whiffs}</p><GrowthSummary s={s}/><RunStory s={s}/>{s.build===DECKBUILDER_BUILD?<><p className="growth-run-summary">내가 만든 덱 · 시작 9장 → 최종 {s.deck.length}장 · 카드 추가 {s.rewards.filter(r=>r.type==='add').length} / 시설 {s.facilities?.length||0}회 / 유물 {s.relics.length}</p><p className="route-run-summary">상대 선택 · {s.routeHistory?.map((id,i)=>routeChoice(i,id)?.name).filter(Boolean).join(' → ')||'없음'} · 고위험 승리 {s.routeHistory?.filter((id,i)=>(routeChoice(i,id)?.statBonus||0)>0).length||0}회</p></> :<p className="growth-run-summary">성장이 만든 플레이 · 기다림 승부 {s.growthStats.patienceSwings}회 / 연결 안타 {s.growthStats.relayHits}회 / 행운 해방 {s.growthStats.fortuneUses}회</p>}{s.phase==='lost'&&<p>잔루 {b.bases.filter(Boolean).length}명. 출루는 성공했지만, 홈으로 돌려보내지 못했습니다.</p>}<button className="primary" onClick={fresh}>다시 도전</button><button onClick={()=>setModal('deck')}>덱 보기</button></main>}
    {modal&&<div className="duel-backdrop" onClick={()=>setModal(null)}><section className="duel-modal" role="dialog" aria-modal="true" aria-label={modal==='help'?'플레이 방법':modal==='lineup'?'타순':'카드 정보'} onClick={e=>e.stopPropagation()}><button className="modal-close" aria-label="닫기" onClick={()=>setModal(null)}>×</button>{modal==='new'?<><h2>진행 중인 런을 새로 시작할까요?</h2><p>현재 V9 개발 저장만 교체합니다. 배포된 V8 및 이전 v5/v6/v7 저장은 유지됩니다.</p><button className="primary" onClick={fresh}>새 런으로 교체</button></>:modal==='lineup'?<><span className="eyebrow">BATTING ORDER</span><h2>오늘의 9명 타순</h2><div className="lineup-modal">{LINEUP.map((p,i)=><div key={p.id} className={b&&i===b.batterIndex?'at-bat':b?.bases.includes(p.id)?'on-base':''}><span>{i+1}</span><strong>#{p.number} {p.name}</strong><small>{b&&i===b.batterIndex?'현재 타자':b?.bases.includes(p.id)?'출루':'대기'}</small></div>)}</div></>:modal==='help'?<><span className="eyebrow">READ → BET → REVEAL → IMPACT</span><h2>주자와 아웃을 보고, 손패의 조합을 비교하세요.</h2><div className="combo-example">① 전광판과 투수 의도를 읽기<br/>② 준비하기 / 스윙하기 / 한 구 지켜보기 중 하나 선택<br/>③ 스윙 카드를 9존에 놓기 → 커버 확인 → 스윙<br/>④ 실제 공 확인 → 다음 공 또는 다음 타자 입장</div><p>준비 카드는 한 타석 최대 2회이며 투구를 소비하지 않습니다. MAIN RUN은 공격 카드를 9존에 직접 놓습니다. 첫 카드는 타격 효과를 내고 추가 카드는 커버가 됩니다. 한 장은 HP 피해 100%, 2장 80%, 3장 65%, 4장 50%이며 배치한 카드는 모두 소비됩니다. 헛스윙·파울이면 계속, 안타·인플레이 아웃·삼진·볼넷이면 타석 종료.</p><button className="primary" disabled={!showBattle||s?.phase!=='battle'} onClick={reopenTour}>웰컴 가이드 다시 보기</button>{(!showBattle||s?.phase!=='battle')&&<p>승부 중 다음 공을 선택하는 화면에서 가이드를 열 수 있습니다.</p>}<h3>성장 · 같은 카드를 다르게 쓴다</h3>{Object.entries(GROWTHS).map(([key,g])=><p key={key}><b>{g.name}</b> — {g.ranks[0]}</p>)}{GLOSSARY.map(([term,text])=><p key={term}><b>{term}</b> — {text}</p>)}<h3>카드 도감 · 13종</h3><div className="collection">{Object.keys(CARDS).map(kind=><Card key={kind} kind={kind}/>)}</div></>:pile?<><h2>{{deck:'행동 카드 덱 · 선수와 별개',draw:'뽑을 카드 · 순서 비공개',discard:'버린 카드'}[modal]}</h2><div className="collection">{[...pile].sort((a,b)=>a.kind.localeCompare(b.kind)).map(c=><Card key={c.id} kind={c.kind} plus={c.plus}/>)}</div>{!pile.length&&<p>비어 있습니다.</p>}</>:null}</section></div>}
    {tour.open&&tourStep&&<><div className="tour-catcher" aria-hidden="true"/>{tourRect&&<div className="tour-spotlight" data-tour-target={tourStep.target} aria-hidden="true" style={{top:tourRect.top,left:tourRect.left,width:tourRect.width,height:tourRect.height}}/>}<section className={'tour-card '+(tourCardTop?'tour-card-top':'tour-card-bottom')} role="dialog" aria-modal="true" aria-label="온보딩 가이드"><button className="tour-close" aria-label="가이드 닫기" onClick={()=>closeTour(true)}>×</button><span className="tour-eyebrow">{tourStep.eyebrow}</span><h2>{tourStep.title}</h2><p>{tourStep.text}</p><div className="tour-tip">{tourStep.tip}</div><div className="tour-dots" aria-hidden="true">{TOUR_STEPS.map((_,i)=><i key={i} className={i===tour.step?'on':''}/>)}</div><div className="tour-actions"><button onClick={()=>setTour(t=>({...t,step:Math.max(0,t.step-1)}))} disabled={tour.step===0}>이전</button><button onClick={()=>closeTour(true)}>건너뛰기</button>{tour.step<TOUR_STEPS.length-1?<button className="primary" onClick={()=>setTour(t=>({...t,step:t.step+1}))}>다음 설명</button>:<button className="primary" onClick={()=>closeTour(true)}>바로 플레이 시작</button>}</div></section></>}
  </div>;
}
