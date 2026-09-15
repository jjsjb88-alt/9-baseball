import React,{useEffect,useId,useRef,useState} from 'react';
import {CARDS,TYPE_NAMES,STAGES,GLOSSARY,LINEUP,BUILDS,ZONES,GROWTHS,growthCost,rewardChoices,AXES,AXIS_NAMES,ROLES,REWARD_ACTIONS,AFFINITY_CARDS,upgradeText,canUpgrade,DECK_MIN,DECK_MAX,
  READ_LEVELS,RELICS,RELIC_OFFERS,bandFor,rangeFor,shadeFor,shadeNameFor,observeScore,cardText,ZONE_ORDER,DECKBUILDER_BUILD,FACILITIES,FACILITY_ROUTES,ROUTE_CHOICES,routeChoice} from './cards.js';
import {createDuel,startBattle,chooseRoute,battleTarget,playCard,endTurn,chooseReward,chooseFacility,facilityProblem,previewCard,readDuel,saveDuel,advanceBatter,currentBatter,advancePitch,setAimZone,coverage,publicProbabilities,pitchClue,matchup,setGrowthMode,growthProblem,readLevel,knownPitchZones} from './engine.js';
import {deckProfile,diagnose,applyRewardToDeck,rewardProblem,profileDelta,relationsFor,growthConflict} from './deck.js';
import './duel.css';
import {coverageText} from './information.js';
import {cue} from './audio.js';
import {presentationFor,presentationTimeline} from './presentation.js';
import {haptic} from './haptics.js';
import batterSheet from '../../assets/duel/batter.png';
import pitcherSheet from '../../assets/duel/pitcher.png';

const TOUR_KEY='9zone-zones-tour-v5';
const TOUR_STEPS=[
  {eyebrow:'WELCOME 1 / 6',target:'scoreboard',title:'먼저 전광판을 봅니다',text:'현재 타자, 다음 타자, 목표 득점, 스트라이크, 아웃을 여기서 먼저 확인하세요. 가장 먼저 읽어야 하는 정보입니다.',tip:'지금 밝게 보이는 전광판만 먼저 확인하면 됩니다.'},
  {eyebrow:'WELCOME 2 / 6',target:'arena',title:'가운데는 승부 상황입니다',text:'투수의 경향과 주자를 읽으세요. 아래 9존에서 코스를 선택하고 카드마다 달라지는 커버 범위를 확인합니다.',tip:'투수 의도와 주자 배치를 같이 읽어보세요.'},
  {eyebrow:'WELCOME 3 / 6',target:'prepare',title:'첫 번째 행동 · 준비하기',text:'준비하기는 타석을 바로 끝내지 않고 다음 스윙을 유리하게 만드는 행동입니다. 한 타석에서 최대 두 번까지 사용할 수 있습니다.',tip:'당장 치기보다 먼저 세팅하고 싶을 때 사용합니다.'},
  {eyebrow:'WELCOME 4 / 6',target:'swing',title:'두 번째 행동 · 스윙하기',text:'실제 공이 카드의 타격 범위에 들어오면 안타 확정입니다. 타자·투수 스탯으로 안타 종류만 달라집니다. 헛스윙과 파울이면 같은 타석이 이어집니다.',tip:'넓게 버틸지, 좁게 장타를 노릴지 고릅니다.'},
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
function Sprite({who,frame=0}){const clip=useId(),pitcher=who==='pitcher',height=pitcher?724:793;const [x,width,offset]=(pitcher?[[0,600,70],[740,500,-600],[1280,892,-1300]]:[[0,660,70],[680,730,-550],[1420,563,-1250]])[frame];return <svg aria-hidden="true" className="duel-sprite" viewBox={`0 0 ${height} ${height}`} style={{overflow:'visible'}}><defs><clipPath id={clip}><rect x={x} y="0" width={width} height={height}/></clipPath></defs><g transform={`translate(${offset} 0)`}><image clipPath={`url(#${clip})`} href={pitcher?pitcherSheet:batterSheet} width={pitcher?2172:1983} height={height}/></g></svg>;}
function Diamond({s,preview}){const b=s.battle;return <div className="living-diamond" aria-label="베이스 주자"><div className="base-lines"/>{[2,1,0].map(i=>{const id=b.bases[i],c=LINEUP.find(p=>p.id===id),after=preview?.bases?.[i],ghost=after&&LINEUP.find(p=>p.id===after);return <div key={i+'-'+(id||'empty')} className={'base-slot base-'+(i+1)+(id?' occupied':'')+(preview&&after!==id?' changing':'')}><span>{i+1}루</span>{c?<><span className="runner-number">#{c.number}</span><b>{c.name}</b></>:<b className="empty-base">◇</b>}{preview&&after!==id&&<small>→ {ghost?ghost.name:'비워짐'}</small>}</div>;})}<div className="home-plate"><b>HOME</b><span>득점</span></div></div>;}
function CountLights({value,max}){return <span className="count-lights" aria-label={`${value}/${max}`}>{Array.from({length:max},(_,i)=><i key={i} className={i<value?'on':''}/>)}</span>;}
function Scoreboard({s,onLineup,targetRef}){const b=s.battle,batter=currentBatter(s),next=LINEUP[(b.batterIndex+1)%LINEUP.length];return <section ref={targetRef} className="scoreboard" aria-label="야구 전광판"><div className="scoreboard-player"><span>AT BAT · {b.batterIndex+1}번</span><strong>#{batter.number} {batter.name}</strong><small>NEXT · {next.name}</small></div><div className="scoreboard-score"><span>RUN / TARGET</span><strong>{b.runs}<i>/</i>{battleTarget(s)}</strong><small>{s.stage+1} / 4 · {STAGES[s.stage].name}</small></div><div className="scoreboard-count"><div><b>B</b><CountLights value={Math.min(b.balls,4)} max={4}/></div><div><b>S</b><CountLights value={Math.min(b.strikes,3)} max={3}/></div><div><b>O</b><CountLights value={Math.min(b.outs,3)} max={3}/></div><button onClick={onLineup}>타순 보기</button></div></section>;}

const pct=x=>Math.round(x*100)+'%';
function resultCall(revealed){
  if(!revealed)return '결과';
  if(revealed.label==='볼넷')return '볼넷';
  if(revealed.label?.includes('삼진'))return '삼진';
  return {hit:'안타',foul:'파울',whiff:'헛스윙',ball:'볼',called:'스트라이크',out:'아웃',sacrifice:'희생'}[revealed.kind]||'결과';
}
function ZoneBoard({s,id,onZone,disabled}){
  const b=s.battle,p=b.pending?publicProbabilities(s):b.intent.probabilities;
  const duel=matchup(s,id||'basic'),entry=s.deck.find(c=>c.id===id),sacrifice=entry?.kind==='bunt';
  const covered=b.revealed?.coverage||coverage(s,id||'basic'),proficient=BUILDS[s.build].zones,clue=pitchClue(s);
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
        const title=ruledOut?'단서 밖':certain?'확정':dead&&showUnused?'안 씀':level===0?shadeNameFor(p[z]):dead?'0%':level===1?rangeFor(p[z]):pct(p[z]);
        const figure=b.revealed?(b.revealed.zone===z?'●':'·'):title;
        return <button key={z} ref={el=>zoneButtons.current[z]=el} aria-label={name} aria-describedby={'zone-read-'+z} title={title} aria-pressed={b.aimZone===z} disabled={disabled}
          tabIndex={b.aimZone===z?0:-1} onKeyDown={e=>moveZone(e,z)} onClick={()=>onZone(z)}
          className={'zone-cell shade-'+shadeFor(p[z])+' '+((dead&&showUnused)||ruledOut?'unused ':'')+(covered.includes(z)?'covered ':'')+(b.aimZone===z?'aimed ':'')+(b.revealed?.zone===z?'actual':'')}>
          <span>{name}</span><strong id={'zone-read-'+z}>{figure}</strong><small>{proficient.includes(z)?'★ 숙련':'비숙련'}{b.aimZone===z?' · 노림':''}</small>
        </button>;
      })}
    </div>
    <p className="zone-legend">왼쪽 몸쪽 / 오른쪽 바깥 · 테두리 = 커버 · ★ 4숙련존</p>
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
        <div className="reward-cards">{pool.map(kind=><Card key={kind} kind={kind} selected={chosenAction==='add'&&target===kind} onClick={()=>{onAction('add');onTarget(kind);}}/>)}</div>
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
        {action==='add'&&<div className="reward-cards">{pool.map(kind=><Card key={kind} kind={kind} selected={target===kind} onClick={()=>onTarget(kind)}/>)}</div>}
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
  return <details className="reward-journal" open><summary>내가 만든 팀 · 지난 선택</summary><ol>{s.rewards.flatMap((r,i)=>{
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
export default function Duel(){
  const [initial]=useState(()=>{try{return {save:readDuel(localStorage)}}catch{return {error:'저장을 읽지 못했습니다. 새 런을 시작할 수 있습니다.'}}});
  const [growthChoice,setGrowthChoice]=useState(null),[rewardAction,setRewardAction]=useState(null),[facilityChoice,setFacilityChoice]=useState(null);
  const [build,setBuild]=useState(DECKBUILDER_BUILD),[trialSeed,setTrialSeed]=useState('20260910');
  const [s,setS]=useState(initial.save),[screen,setScreen]=useState('menu'),[modal,setModal]=useState(null),[selected,setSelected]=useState(null),[decisionMode,setDecisionMode]=useState(null),[tour,setTour]=useState({open:false,step:0}),[tourRect,setTourRect]=useState(null),[fx,setFx]=useState(null),[fxStage,setFxStage]=useState(null),[frame,setFrame]=useState(0),[error,setError]=useState(initial.error||''),[sound,setSound]=useState(false);
  const current=useRef(s),lock=useRef(false),timers=useRef([]),tourDismissed=useRef(false);
  const scoreboardRef=useRef(null),arenaRef=useRef(null),prepareRef=useRef(null),swingRef=useRef(null),watchRef=useRef(null),eventsRef=useRef(null);
  const showPreview=id=>{const p=previewCard(s,id);return {...p,coverageLabel:p.coverage?coverageText(s,id):undefined};};
  const b=s?.battle,showBattle=screen==='run'&&b&&(['battle','pitch','between'].includes(s.phase)||fx),fxPresentation=fx?presentationFor(s):null,resultPresentation=b?.revealed?presentationFor(s):null,byId=id=>s.deck.find(c=>c.id===id),choice=selected&&(selected==='basic'||b?.hand.includes(selected))?showPreview(selected):null;
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
  const plannedRelations=selectedEntry?relationsFor(selectedEntry,hand.map(x=>x.entry)):new Map();
  const relationOf=id=>{const g=b&&growthConflict(byId(id),b.growthMode);
    return g?{kind:'conflict',why:g}:plannedRelations.get(id)||activeRelations.get(id)||null;};
  const firstDecision=showBattle&&s.phase==='battle'&&s.stage===0&&b.turn===1&&b.preparations===0&&b.strikes===0&&s.stats.appearances===0;
  const tourStep=TOUR_STEPS[tour.step];
  const tourCardTop=['prepare','swing','watch','events'].includes(tourStep?.target);

  useEffect(()=>()=>timers.current.forEach(clearTimeout),[]);
  useEffect(()=>{const close=e=>{if(e.key==='Escape'){setModal(null);setDecisionMode(null);setSelected(null);tourDismissed.current=true;try{localStorage.setItem(TOUR_KEY,'done')}catch{}setTour(t=>t.open?{open:false,step:0}:t);}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[]);
  useEffect(()=>{if(!showBattle||s?.phase!=='battle'||tour.open||tourDismissed.current)return;try{if(localStorage.getItem(TOUR_KEY)==='done')return;}catch{}setTour({open:true,step:0});},[showBattle,s?.phase,tour.open]);
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

  function persist(next){current.current=next;setS(next);try{saveDuel(localStorage,next);setError('')}catch{setError('저장 실패: 이 창을 닫으면 진행을 잃을 수 있습니다.');}}
  function rememberTour(){tourDismissed.current=true;try{localStorage.setItem(TOUR_KEY,'done')}catch{}}
  function closeTour(markSeen=true){if(markSeen)rememberTour();setTourRect(null);setTour({open:false,step:0});}
  function reopenTour(){if(!showBattle||s.phase!=='battle')return;setModal(null);setSelected(null);setDecisionMode(null);setTour({open:true,step:0});}
  function act(fn,animate=false){if(lock.current||tour.open)return;const next=fn(current.current);if(next===current.current)return;persist(next);setSelected(null);setGrowthChoice(null);setRewardAction(null);setFacilityChoice(null);setDecisionMode(null);if(animate){const shot=presentationFor(next),reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,timeline=presentationTimeline(shot,reduced),pitchJudgement=!!next.battle?.revealed&&next.last?.kind!=='skill';lock.current=true;setFx(next.last);setFxStage('windup');setFrame(1);if(sound)cue(pitchJudgement?'pitch':shot?.cue||next.last.kind);const scheduled=[setTimeout(()=>{setFxStage('impact');setFrame(2);if(sound&&pitchJudgement)cue(shot?.cue||next.last.kind);haptic(timeline.haptic);},timeline.impactAt)];if(timeline.slowmo>0)scheduled.push(setTimeout(()=>setFxStage('slowmo'),timeline.impactAt+timeline.freeze));scheduled.push(setTimeout(()=>setFxStage('release'),timeline.releaseAt),setTimeout(()=>setFxStage('settle'),timeline.settleAt),setTimeout(()=>{setFx(null);setFxStage(null);setFrame(0);lock.current=false;timers.current=[]},timeline.duration));timers.current=scheduled;}}
  function fresh(){setGrowthChoice(null);setRewardAction(null);setFacilityChoice(null);persist(createDuel(Number(trialSeed)>>>0,build));setScreen('run');setModal(null);setSelected(null);setDecisionMode(null);setTour({open:false,step:0});}
  function toggleGrowth(mode){if(lock.current||tour.open)return;persist(setGrowthMode(current.current,mode));}
  function openDecision(mode){if(lock.current)return;setSelected(null);setDecisionMode(mode)}

  return <div className={'duel-app diamond-app'+(fxPresentation?' presentation-'+fxPresentation.kind:'')+(fxStage?' presentation-stage-'+fxStage:'')}>
    <header className="duel-header"><button className="wordmark" onClick={()=>{if(!lock.current)setScreen('menu')}}>9ZONE<span> HOMEBOUND</span></button><span className="edition">BUILD YOUR BASEBALL · V9.2</span><nav><button aria-label={'소리 '+(sound?'켜짐':'꺼짐')} onClick={()=>{if(!sound)cue('skill');setSound(!sound)}}>♪ {sound?'ON':'OFF'}</button>{s&&<button onClick={()=>setModal('deck')}>덱</button>}<button onClick={()=>setModal('help')}>?</button></nav></header>
    {error&&<div className="save-error" role="alert">{error}<button onClick={()=>s&&persist(s)}>저장 재시도</button></div>}
    {screen==='menu'?<main className="duel-title stadium"><div className="title-copy"><span className="eyebrow">READ → BET → REVEAL → IMPACT</span><h1>내가 기다릴 공.<br/><em>내가 만드는 타격.</em></h1><p><b>MAIN RUN</b> · 약한 9장으로 시작해, 네 선택으로 타격 스타일을 완성합니다.<br/>완성형 세 덱은 튜토리얼이자 빌드의 가능성을 보여주는 체험 모드입니다.</p><div className="build-picker v9-build-picker" aria-label="런 방식">{Object.entries(BUILDS).map(([key,d])=><button key={key} aria-pressed={build===key} onClick={()=>setBuild(key)}><span className="build-mode">{key===DECKBUILDER_BUILD?'MAIN RUN':'완성형 체험'}</span><strong>{d.name}</strong><small>{d.description}</small></button>)}</div><label className="trial-seed">비교용 시드 <input aria-label="비교용 시드" type="number" min="0" max="4294967295" value={trialSeed} onChange={e=>setTrialSeed(e.target.value)}/><span>같은 시드 = 같은 첫 투구 · 이후 카운트에 따라 변화</span></label><div className="title-actions"><button className="primary" onClick={()=>s&&!['won','lost'].includes(s.phase)?setModal('new'):fresh()}>새 런 시작</button>{s&&<button onClick={()=>setScreen('run')}>이어하기</button>}</div><small>4숙련존 · 볼넷 · 파울 생존 · BASIC SWING<br/>9ZONE V9.2 / 4경기 · 3카드 보상 · 3시설 · 상대 브랜치</small></div><div className="title-actor"><Sprite who="batter"/></div></main>
:showBattle?<main className={'duel-combat release-combat'+(fxPresentation?' fx-'+fxPresentation.kind:'')+(fxStage?' fx-stage-'+fxStage:'')}><div className="battle-ribbon"><span>{s.stage+1} / 4</span><b>{STAGES[s.stage].name}</b><span>타석 {b.turn}</span></div><Scoreboard s={s} onLineup={()=>setModal('lineup')} targetRef={scoreboardRef}/><section ref={arenaRef} className={'duel-arena stadium '+(fx?.kind==='hit'?'impact':'')+(s.phase==='between'?' between':'')} aria-label="승부 구장"><div className={'intent '+b.intent.kind}><span>{s.phase!=='battle'?'판정 완료':'투수 의도'}</span><strong>{b.intent.name}</strong><b>{b.revealed?'실제 공 공개':'코스 경향 · 확정 예고 아님'}</b></div><div className={'actor-left '+(s.phase==='between'&&!fx?'leaving-batter':'')} key={'batter-'+b.turn}><Sprite who="batter" frame={fx?.kind==='hit'||fx?.kind==='out'?frame:0}/><span className="batter-nameplate">#{currentBatter(s).number} {currentBatter(s).name}</span></div><div className="actor-right"><Sprite who="pitcher" frame={fx?.kind==='pitch'?frame:0}/></div><Diamond s={s}/>{fx&&<div key={'effect-'+s.stats.pitches} className={'duel-fx '+fx.kind+' '+(b.revealed?.label.includes('홈런')?'flight-homer':b.revealed?.label.includes('땅볼')?'flight-ground':b.revealed?.label.includes('바가지')?'flight-bloop':'flight-line')}><span className="pixel-ball"/><strong>{fx.runs?'HOME! +'+fx.runs:fx.outs?fx.outs+' OUT':fx.kind==='hit'?b.revealed?.label:''}</strong>{fx.growthEvents?.length>0&&<em className="growth-impact">{fx.growthEvents[0]}</em>}</div>}{fxPresentation&&<div key={'judgement-'+s.stats.pitches+'-'+fxPresentation.kind} className={'judgement-layer judgement-'+fxPresentation.kind+' stage-'+(fxStage||'windup')} aria-hidden="true"><span className="judgement-wash"/><span className="judgement-flash"/><span className="judgement-vignette"/><span className="pitch-ball"/><span className="speed-lines"/>{fxPresentation.motion?.slowmo>0&&<span className="slowmo-mark">{fxPresentation.grade==='near-miss'?'ONE ZONE':fxPresentation.grade==='lucky'?'HANG TIME':fxPresentation.grade==='jammed'?'OFF BARREL':fxPresentation.grade==='dead-center'?'LOCKED':fxPresentation.grade==='homer'?'TIME STOPS':'SLOW'}</span>}<span className="judgement-ring ring-a"/><span className="judgement-ring ring-b"/><span className="judgement-ring ring-c"/><span className="judgement-slash slash-a"/><span className="judgement-slash slash-b"/><span className="judgement-spark spark-1"/><span className="judgement-spark spark-2"/><span className="judgement-spark spark-3"/><span className="judgement-spark spark-4"/><span className="judgement-spark spark-5"/><span className="judgement-spark spark-6"/><div className="judgement-copy"><span>{fxPresentation.kicker}</span><strong>{fxPresentation.title}</strong><em>{fxPresentation.detail}</em></div></div>}</section><ZoneBoard s={s} id={selected||"basic"} disabled={s.phase!=='battle'||!!fx||tour.open} onZone={z=>{if(!lock.current)persist(setAimZone(current.current,z));}}/><div className="pitch-read"><span>{s.phase!=='battle'?'RESULT':'READ'}</span><b>{s.phase!=='battle'?s.last.text:b.intent.detail}</b>{s.phase==='battle'&&<small>집중 +{b.aim} · 준비 {b.preparations}/2 · 손패 {b.hand.length}</small>}</div><section className="duel-table"><GrowthPanel s={s} disabled={!!fx||tour.open||s.phase!=='battle'} onMode={toggleGrowth}/><div ref={eventsRef} className={'diamond-events '+(s.last?.kind==='repertoire'?'repertoire-event':'')} role="status"><b>{s.last?.text}</b>{s.last?.events?.slice(0,2).map((e,i)=><span key={i}>{e}</span>)}{s.last?.growthEvents?.map((e,i)=><b key={'g'+i} className="growth-event">{e}</b>)}</div>{s.phase==='pitch'&&<section className={'pa-result result-'+(b.revealed?.kind||'neutral')+' result-grade-'+(resultPresentation?.grade||'neutral')} aria-label="투구 결과"><span>REVEAL · SAME BATTER</span><strong className="result-call">{resultPresentation?.title||resultCall(b.revealed)}</strong><h2>{b.revealed.label}</h2><p>{b.balls}볼 {b.strikes}스트라이크 · {currentBatter(s).name} 그대로 타석에</p><button className="primary next-batter" disabled={!!fx} onClick={()=>act(advancePitch)}>다음 공 · 같은 타자</button></section>}{s.phase==='between'&&<section className={'pa-result result-'+(b.revealed?.kind||'neutral')+' result-grade-'+(resultPresentation?.grade||'neutral')} aria-label="타석 종료 결과"><span>PLATE APPEARANCE COMPLETE</span><strong className="result-call">{resultPresentation?.title||resultCall(b.revealed)}</strong><h2>{b.revealed?.label}</h2><p>{b.batterIndex+1}번 {currentBatter(s).name} · 타석 종료</p><p className="runner-summary">현재 주자 · {b.bases.map((id,i)=>id?(i+1)+'루 '+LINEUP.find(p=>p.id===id).name:null).filter(Boolean).join(' / ')||'없음'}</p><button aria-label={`다음 타자 입장 · ${(b.batterIndex+1)%9+1}번 ${LINEUP[(b.batterIndex+1)%9].name}`} className="primary next-batter" disabled={!!fx} onClick={()=>act(advanceBatter)}>다음 타자 입장 · {(b.batterIndex+1)%9+1}번 {LINEUP[(b.batterIndex+1)%9].name}<span>NEXT BATTER →</span></button></section>}{s.phase==='battle'&&<>{!decisionMode?<section className={'decision-hub '+(firstDecision?'coach-focus':'')} aria-label="이번 타석 행동 선택"><div className="decision-copy"><span>{firstDecision?'첫 타석 가이드':'YOUR CALL'}</span><h2>{firstDecision?'투수 의도를 읽었습니다. 이제 하나만 선택하세요.':'이번 공, 어떻게 가져갈까?'}</h2><p>{firstDecision?'9존을 선택하고 카드 커버를 확인하세요. 볼을 기다리거나, 넓게 버티거나, 좁게 장타를 노립니다.':'준비와 스윙을 함께 비교하세요. 한 공에 스윙은 한 번입니다.'}</p></div><div className="action-dock"><button ref={prepareRef} className="action prepare" aria-label="준비하기" disabled={b.preparations>=2||!prepareHand.length||!!fx} onClick={()=>openDecision('prepare')}><span>1</span><strong>준비하기</strong><small>{b.preparations}/2 · {prepareHand.length}장</small></button><button ref={swingRef} className="action swing" aria-label="스윙하기" disabled={!!fx} onClick={()=>openDecision('swing')}><span>2</span><strong>스윙하기</strong><small>{swingHand.length}장 + 기본 스윙</small></button><button ref={watchRef} className="action watch" aria-label="한 구 지켜보기" disabled={!!fx} onClick={()=>openDecision('watch')}><span>3</span><strong>한 구 지켜보기</strong><small>{b.strikes===2?'스트라이크면 삼진 · 볼이면 생존':'볼 / 스트라이크 확인'}</small></button></div></section>:decisionMode==='watch'?<section className="watch-confirm"><h2>이 공을 지켜볼까?</h2><p>{b.strikes===2?'스트라이크면 삼진. 볼이면 볼카운트가 쌓입니다.':'볼은 볼카운트 +1, 스트라이크는 +1. 다음 공에 카드 1장을 뽑습니다.'}</p><button onClick={()=>setDecisionMode(null)}>돌아가기</button><button className="primary" onClick={()=>act(endTurn,true)}>지켜보기 · 공 진행</button></section>:<section className="card-drawer" aria-label={decisionMode==='prepare'?'준비 카드 선택':'스윙 카드 선택'}><div className="drawer-head"><button className="drawer-back" onClick={()=>{setDecisionMode(null);setSelected(null)}}>← 상황으로</button><div><span>{decisionMode==='prepare'?'PREPARE':'SWING'}</span><h2>{decisionMode==='prepare'?'스윙 전에 무엇을 준비할까?':'이 공을 어떻게 칠까?'}</h2></div><small>{visibleHand.length}장 · 손패 전체 {hand.length}장</small></div><div className="duel-hand">{decisionMode==='swing'&&<button className="duel-card basic-card" aria-label="BASIC SWING" aria-pressed={selected==='basic'} onClick={()=>setSelected('basic')}><span className="card-cost">항상 사용</span><strong>BASIC SWING</strong><p>선택한 1존 · 카드 소비 없음</p>{b.growthMode==='patience'&&<small>기다림 성장으로 장타 가능</small>}<small>카드가 없어도 승부할 수 있습니다.</small></button>}{visibleHand.map(({id,entry,preview})=><Card key={id} kind={entry.kind} plus={entry.plus} relation={relationOf(id)} selected={selected===id} problem={preview.problem} preview={preview} onClick={()=>{if(!lock.current)setSelected(id)}}/>)}{!visibleHand.length&&<p className="empty-hand">{decisionMode==='swing'?'스윙 카드는 없지만 BASIC SWING은 사용할 수 있습니다.':'지금 사용할 수 있는 준비 카드가 없습니다.'}</p>}{otherHand.length>0&&<div className="hand-divider" aria-hidden="true"><span>{decisionMode==='prepare'?'스윙':'준비'}</span></div>}{otherHand.map(({id,entry,preview})=><Card key={id} kind={entry.kind} plus={entry.plus} relation={relationOf(id)} selected={selected===id} problem={preview.problem} preview={preview} note={(CARDS[entry.kind].type==='skill'?'준비':'스윙') + ' 카드 · 누르면 전환'} onClick={()=>{if(!lock.current){setDecisionMode(CARDS[entry.kind].type==='skill'?'prepare':'swing');setSelected(id);}}}/>)}</div><div className={'decision-preview '+(choice?'active':'')}>{choice?<><div><b>{choice.problem||choice.label}</b><span>{selectedEntry&&CARDS[selectedEntry.kind].type==='skill'?'준비 1회 · 공 소비 없음':'공 1개 진행 · 스윙은 한 번'}</span>{choice.hit!=null&&<><span>{choice.coverageLabel}{choice.sacrifice>0?' · 희생 작전':' · 범위 적중 시 안타'}</span><span>{choice.sacrifice>0?'희생 작전':'적중 뒤 실패 판정 없음'}{choice.sacrifice>0?' · 스트라이크일 때 '+(selectedEntry?.plus?'85':'70')+'% 성공':''} · 코스 확률과 타격 범위로 계산합니다.</span></>}{readLevel(s)===2&&choice.types&&choice.hit>0&&<span className="hit-profile">적중 후 안타 종류: {choice.types.filter(t=>t.p>.005).map(t=>t.label+' '+pct(t.p)).join(' / ')}</span>}{choice.growthText&&<b className="growth-preview">{choice.growthText}</b>}{choice.events?.slice(0,2).map((e,i)=><span key={i}>{e}</span>)}</div><button className="primary" disabled={!!choice.problem||!!fx} onClick={()=>act(x=>playCard(x,selected),true)} data-testid="execute-action">{selected==='basic'?'기본 스윙':CARDS[selectedEntry?.kind]?.name+(selectedEntry?.plus?'+':'')+(CARDS[selectedEntry?.kind]?.type==='skill'?' · 준비 1회':' · 스윙')}</button></>:<><b>카드 한 장을 선택하세요.</b><span>카드와 노릴 존을 고르면 커버·안타·파울 확률을 보여줍니다.</span></>}</div></section>}</>}<div className="table-footer"><div className="pile-buttons"><button onClick={()=>setModal('draw')}>뽑기 {b.draw.length}</button><button onClick={()=>setModal('discard')}>버림 {b.discard.length}</button></div><span className="deck-rule">선수는 베이스에 · 카드는 행동에</span></div></section></main>
    :s.phase==='facility'?<main className="facility-screen stadium"><FacilityScreen s={s} choice={facilityChoice} target={selected}
      onChoice={setFacilityChoice} onTarget={setSelected} onConfirm={action=>act(x=>chooseFacility(x,action))}/></main>
    :s.phase==='map'?<main className="duel-map stadium"><div className="map-copy"><span className="eyebrow">{s.build===DECKBUILDER_BUILD?'HOMEBOUND / BUILD THE TEAM':'HOMEBOUND / FOUR DIAMONDS'}</span><h1>{s.build===DECKBUILDER_BUILD?'경기에서 카드를 얻고,\n이동 중 팀을 바꾼다.':'한 타석을 설계하고,\n다음 타자에게 이어라.'}</h1><p>{s.build===DECKBUILDER_BUILD?'각 승부는 3아웃. 승리하면 카드 한 장을 고르고, 다음 상대 전에는 시설 하나만 들를 수 있습니다. 모든 선택을 가질 수 없기 때문에 런마다 다른 팀이 됩니다.':<>각 승부는 3아웃.<br/>선수는 타순대로, 같은 타자가 여러 공을 승부합니다.<br/>세 번의 성장으로 한 길을 심화하거나 서로 연결하세요.</>}</p><GrowthSummary s={s}/>{s.build===DECKBUILDER_BUILD&&s.stage>0&&s.facilities?.[s.stage-1]?.type==='scouting'&&<p className="map-scout-badge">스카우팅 적용 · 이번 경기 읽기 {READ_LEVELS[readLevel(s)].name}</p>}<OpponentReport stage={s.stage} routeId={s.route}/><RewardJournal s={s}/>{s.fortune>0&&<p>다음 승부로 가져가는 행운: {s.fortune}/6</p>}</div>{s.build===DECKBUILDER_BUILD&&<RouteBranches s={s} onChoose={id=>act(x=>chooseRoute(x,id))} onStart={()=>act(startBattle)}/>}<div className="map-route">{STAGES.map((stage,i)=><div key={i} className={'route-node '+(i===s.stage?'current':'')+(i<s.stage?' cleared':'')}><span>{i<s.stage?'✓':'0'+(i+1)}</span><div><h2>{stage.name}</h2><p>{stage.sub}</p></div>{i===s.stage?(s.build===DECKBUILDER_BUILD?<small>{s.route?'상대 선택 완료':'상대를 선택하세요'}</small>:<button className="primary" onClick={()=>act(startBattle)}>승부 시작</button>):<small>{i<s.stage?'돌파':'대기'}</small>}</div>)}</div></main>
    :s.phase==='reward'?<main className="reward-screen growth-reward-screen"><span className="eyebrow">{s.build===DECKBUILDER_BUILD?'HOME SAFE / DECK DRAFT':'HOME SAFE / GROWTH'} {s.stage+1} OF 3</span><h1>{s.build===DECKBUILDER_BUILD?'이번 런의 야구를 직접 만든다.':'이 승리를, 다음 경기의 무기로.'}</h1><p>{b.runs}점 · {b.outs}아웃 — {s.build===DECKBUILDER_BUILD?'세 카드 중 한 장을 고르거나 건너뜁니다. 강화·제거·장비·스카우팅은 경기 뒤 이동 경로에서 따로 선택합니다.':'성장 1단계와 덱 변경 한 가지를 함께 확정합니다. 덱을 그대로 둘 수도 있습니다.'}</p>
      <GrowthSummary s={s}/>
      <RewardScreen s={s} growthChoice={growthChoice} action={rewardAction} target={selected}
        onGrowth={key=>{setGrowthChoice(key);setSelected(null);setRewardAction(null);}}
        onAction={type=>{setRewardAction(type);setSelected(null);}}
        onTarget={setSelected}
        onConfirm={action=>act(x=>chooseReward(x,action,s.build===DECKBUILDER_BUILD?null:growthChoice))}/>
      </main>
    :<main className="duel-result stadium"><span className="eyebrow">{s.phase==='won'?'EVERYBODY HOME':'THREE OUTS'}</span><h1>{s.phase==='won'?'타순을 연결해, 경기를 뒤집었다.':'베이스에 남겨 둔 가능성.'}</h1><p>{s.victories}/4 승부 · 총 {s.stats.runs}득점 · 완료 타석 {s.stats.appearances}회 · {s.stats.pitches}구</p><p>{BUILDS[s.build].name} · 안타 {s.stats.hits} · 볼넷 {s.stats.walks} · 파울 {s.stats.fouls} · 헛스윙 {s.stats.whiffs}</p><GrowthSummary s={s}/>{s.build===DECKBUILDER_BUILD?<><p className="growth-run-summary">내가 만든 덱 · 시작 9장 → 최종 {s.deck.length}장 · 카드 추가 {s.rewards.filter(r=>r.type==='add').length} / 시설 {s.facilities?.length||0}회 / 유물 {s.relics.length}</p><p className="route-run-summary">상대 선택 · {s.routeHistory?.map((id,i)=>routeChoice(i,id)?.name).filter(Boolean).join(' → ')||'없음'} · 고위험 승리 {s.routeHistory?.filter((id,i)=>(routeChoice(i,id)?.statBonus||0)>0).length||0}회</p></> :<p className="growth-run-summary">성장이 만든 플레이 · 기다림 승부 {s.growthStats.patienceSwings}회 / 연결 안타 {s.growthStats.relayHits}회 / 행운 해방 {s.growthStats.fortuneUses}회</p>}{s.phase==='lost'&&<p>잔루 {b.bases.filter(Boolean).length}명. 출루는 성공했지만, 홈으로 돌려보내지 못했습니다.</p>}<button className="primary" onClick={fresh}>다시 도전</button><button onClick={()=>setModal('deck')}>덱 보기</button></main>}
    {modal&&<div className="duel-backdrop" onClick={()=>setModal(null)}><section className="duel-modal" role="dialog" aria-modal="true" aria-label={modal==='help'?'플레이 방법':modal==='lineup'?'타순':'카드 정보'} onClick={e=>e.stopPropagation()}><button className="modal-close" aria-label="닫기" onClick={()=>setModal(null)}>×</button>{modal==='new'?<><h2>진행 중인 런을 새로 시작할까요?</h2><p>현재 V9 개발 저장만 교체합니다. 배포된 V8 및 이전 v5/v6/v7 저장은 유지됩니다.</p><button className="primary" onClick={fresh}>새 런으로 교체</button></>:modal==='lineup'?<><span className="eyebrow">BATTING ORDER</span><h2>오늘의 9명 타순</h2><div className="lineup-modal">{LINEUP.map((p,i)=><div key={p.id} className={b&&i===b.batterIndex?'at-bat':b?.bases.includes(p.id)?'on-base':''}><span>{i+1}</span><strong>#{p.number} {p.name}</strong><small>{b&&i===b.batterIndex?'현재 타자':b?.bases.includes(p.id)?'출루':'대기'}</small></div>)}</div></>:modal==='help'?<><span className="eyebrow">READ → BET → REVEAL → IMPACT</span><h2>주자와 아웃을 보고, 손패의 조합을 비교하세요.</h2><div className="combo-example">① 전광판과 투수 의도를 읽기<br/>② 준비하기 / 스윙하기 / 한 구 지켜보기 중 하나 선택<br/>③ 9존에서 코스 선택 → 커버·확률 확인 → 카드 사용<br/>④ 실제 공 확인 → 다음 공 또는 다음 타자 입장</div><p>준비 카드는 한 타석 최대 2회이며 투구를 소비하지 않습니다. 스윙은 한 공을 소비합니다. 헛스윙·파울이면 계속, 안타·인플레이 아웃·삼진·볼넷이면 타석 종료.</p><button className="primary" disabled={!showBattle||s?.phase!=='battle'} onClick={reopenTour}>웰컴 가이드 다시 보기</button>{(!showBattle||s?.phase!=='battle')&&<p>승부 중 다음 공을 선택하는 화면에서 가이드를 열 수 있습니다.</p>}<h3>성장 · 같은 카드를 다르게 쓴다</h3>{Object.entries(GROWTHS).map(([key,g])=><p key={key}><b>{g.name}</b> — {g.ranks[0]}</p>)}{GLOSSARY.map(([term,text])=><p key={term}><b>{term}</b> — {text}</p>)}<h3>카드 도감 · 13종</h3><div className="collection">{Object.keys(CARDS).map(kind=><Card key={kind} kind={kind}/>)}</div></>:pile?<><h2>{{deck:'행동 카드 덱 · 선수와 별개',draw:'뽑을 카드 · 순서 비공개',discard:'버린 카드'}[modal]}</h2><div className="collection">{[...pile].sort((a,b)=>a.kind.localeCompare(b.kind)).map(c=><Card key={c.id} kind={c.kind} plus={c.plus}/>)}</div>{!pile.length&&<p>비어 있습니다.</p>}</>:null}</section></div>}
    {tour.open&&tourStep&&<><div className="tour-catcher" aria-hidden="true"/>{tourRect&&<div className="tour-spotlight" data-tour-target={tourStep.target} aria-hidden="true" style={{top:tourRect.top,left:tourRect.left,width:tourRect.width,height:tourRect.height}}/>}<section className={'tour-card '+(tourCardTop?'tour-card-top':'tour-card-bottom')} role="dialog" aria-modal="true" aria-label="온보딩 가이드"><button className="tour-close" aria-label="가이드 닫기" onClick={()=>closeTour(true)}>×</button><span className="tour-eyebrow">{tourStep.eyebrow}</span><h2>{tourStep.title}</h2><p>{tourStep.text}</p><div className="tour-tip">{tourStep.tip}</div><div className="tour-dots" aria-hidden="true">{TOUR_STEPS.map((_,i)=><i key={i} className={i===tour.step?'on':''}/>)}</div><div className="tour-actions"><button onClick={()=>setTour(t=>({...t,step:Math.max(0,t.step-1)}))} disabled={tour.step===0}>이전</button><button onClick={()=>closeTour(true)}>건너뛰기</button>{tour.step<TOUR_STEPS.length-1?<button className="primary" onClick={()=>setTour(t=>({...t,step:t.step+1}))}>다음 설명</button>:<button className="primary" onClick={()=>closeTour(true)}>바로 플레이 시작</button>}</div></section></>}
  </div>;
}
