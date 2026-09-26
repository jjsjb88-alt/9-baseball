import React,{useLayoutEffect,useRef,useState} from 'react';
import {CARDS} from './cards.js';
import {publicProbabilities,V10_SWING_STACK_MAX,V10_RUNNER_PRESSURE,v10Shaken,v10MentalCap} from './engine.js';
import {intentLines,hpTicks,ZONE_WORDS} from './ballpark-copy.js';
import ZoneLinks from './ZoneLinks.jsx';
import {pitcherLine,momentOf} from './pitcher-voice.js';
import BallparkActors,{pixiAvailable} from './BallparkActors.jsx';
import {lessonFor,planText} from './DecisionDebrief.jsx';
import './ballpark.css';

/* V13 BALLPARK — the battle as one ballpark scene (docs/design/v13/BALLPARK.md).
   Same engine contract as the legacy screen: `selected` + battle.aimZone is the main card,
   `swingStack` [{id,aimZone}] the supports, and the parent plays them through playV10Action.
   BP-2: the pitch plays in the scene too — the ball flies to its zone at the impact beat, the
   verdict is one word, the HP ticks drop, and one button moves on. */
/* the baseball call in one word, big (from the engine's result, not the flavour title); the flavour
   line ("갈랐다", "한 칸 차이") goes under it. Hits are the only good calls besides walks/sacrifices. */
const HIT_WORD={extra:'장타',homer:'홈런','grand-slam':'만루 홈런'};
function callOf(r,shot){
  if(!r)return '';
  const k=/strikeout|-k$/.test(shot?.grade||'')||/K$/.test(shot?.kicker||'')?'삼진':null;
  if(r.kind==='hit')return HIT_WORD[shot?.kind]||'안타';
  if(r.kind==='whiff')return k||'헛스윙';
  if(r.kind==='called')return k||'스트라이크';
  if(r.kind==='foul')return k||'파울';
  if(r.kind==='ball')return /볼넷/.test(r.label||'')?'볼넷':'볼';
  if(r.kind==='out')return '아웃';
  if(r.kind==='sacrifice')return '희생타';
  return '';
}
const LANDED=new Set(['impact','slowmo','release','settle']);
/* camera: which results push the lens in (BP-9). big = homer, mid = extra/dead-center, near = one-zone miss */
export const CAMERA={homer:'big','grand-slam':'big',extra:'mid','dead-center':'mid','near-miss':'near','near-miss-k':'near'};
const lessonZoneName=z=>z===9?'존 밖':ZONE_WORDS[z]||'코스';


/* the glyph already draws the coverage; the face keeps only what it adds (정확 적중 HP +50% …) */
const effect=def=>(def.gives||[]).filter(g=>!/커버$/.test(g)).slice(0,1).join('');
const isSkill=entry=>CARDS[entry?.kind]?.type==='skill';
const CardGlyph=({zones})=><span className="bp-glyph" aria-hidden="true">{Array.from({length:9},(_,z)=><i key={z} className={zones?.includes(z)?'on':''}/>)}</span>;

export default function BallparkBattle({
  s,hand,selected,swingStack,choice,locked=false,
  pitcher,label,pitcherArt,batterArt,
  fxStage=null,shot=null,impactAt=0,playToken=0,onNext=null,nextLabel='',vfx=null,pitcherAtlas=null,artId=null,batterPoses=null,
  onSelect,onAim,onStack,onSwing,onTake,onDetail,onPile,
  autoLesson=false,autoPlan=null,onExitLesson=null,
}){
  const b=s.battle,rootRef=useRef(null),sceneRef=useRef(null),pitcherRef=useRef(null),zoneRef=useRef(null),flightRef=useRef(null);
  const r=b.revealed,inFx=!!fxStage,deciding=s.phase==='battle'&&!inFx&&!locked;
  const judged=!!r&&s.last?.kind!=='skill'&&(inFx||s.phase!=='battle');
  const landed=!inFx||LANDED.has(fxStage);
  const showVerdict=!!shot&&(inFx||s.phase!=='battle')&&(landed||!judged);
  const [armed,setArmed]=useState(null);
  /* which actors Pixi has taken over (null = DOM actors only) */
  const [pixi,setPixi]=useState(null);
  const [canPixi]=useState(()=>!!batterPoses&&pixiAvailable());
  useLayoutEffect(()=>{
    const root=rootRef.current,header=document.querySelector('.duel-header');
    if(!root)return;
    const set=()=>root.style.setProperty('--bp-top',(header?.getBoundingClientRect().height||0)+'px');
    set();window.addEventListener('resize',set);return()=>window.removeEventListener('resize',set);
  },[]);
  /* the ball leaves the pitcher's glove and lands on its cell (or beside the zone) at the impact beat */
  useLayoutEffect(()=>{
    const f=flightRef.current,scene=sceneRef.current,p=pitcherRef.current,zone=zoneRef.current;
    if(!f||!scene||!p||!zone||!r)return;
    const sr=scene.getBoundingClientRect(),pr=p.getBoundingClientRect(),zr=zone.getBoundingClientRect();
    const z=r.zone,x1=z===9?zr.right+zr.width*.18:zr.left+zr.width*((z%3)+.5)/3,y1=z===9?zr.top+zr.height*.5:zr.top+zr.height*(Math.floor(z/3)+.5)/3;
    f.style.setProperty('--x0',(pr.left+pr.width*.45-sr.left)+'px');f.style.setProperty('--y0',(pr.top+pr.height*.42-sr.top)+'px');
    f.style.setProperty('--x1',(x1-sr.left)+'px');f.style.setProperty('--y1',(y1-sr.top)+'px');
    f.style.setProperty('--delay',Math.max(0,impactAt-360)+'ms');
  },[playToken,judged,inFx]);

  const byId=id=>hand.find(x=>x.id===id);
  const swingCards=hand.filter(x=>!isSkill(x.entry)),prepCards=hand.filter(x=>isSkill(x.entry));
  const mainEntry=selected&&selected!=='basic'?byId(selected)?.entry:null;
  const mainIsSkill=isSkill(mainEntry);
  const canStack=!!(mainEntry&&!mainIsSkill&&mainEntry.kind!=='bunt'&&b.growthMode!=='patience');
  const stack=canStack?swingStack.filter(x=>x.id!==selected&&byId(x.id)):[];
  const prepLeft=Math.max(0,2-(b.preparations||0));

  const probs=b.pending?publicProbabilities(s):b.intent?.probabilities||[];
  const live=b.intent?.repertoire||[0,1,2,3,4,5,6,7,8];
  const inZone=probs.slice(0,9).reduce((a,x)=>a+x,0)||1;
  const cover=new Set(judged?r.primaryCoverage||r.coverage||[]:stack.length?choice?.primaryCoverage||[]:(!mainIsSkill&&selected?choice?.coverage||[]:[]));
  const support=new Set(judged?(r.supportCoverages||[]).flatMap(x=>x.coverage):stack.length?(choice?.supportCoverages||[]).flatMap(x=>x.coverage):[]);
  const aimAt=judged?(r.coverage?.length?r.aimZone:null):(selected&&!mainIsSkill?b.aimZone:null);
  const lines=intentLines(b.intent);
  const damage=judged&&landed?Math.max(0,pitcher?.lastDamage||0):0;
  const ticks=hpTicks(pitcher?.hp,pitcher?.maxHp),ticksWere=judged?hpTicks((pitcher?.hp||0)+(pitcher?.lastDamage||0),pitcher?.maxHp):ticks;
  /* lit, lit until the ball lands, then dropping, then gone */
  const tickClass=i=>i<ticks?'':i<ticksWere?(landed?'drop':''):'lost';
  /* 멘탈 게이지: 실점으로 쌓이는 흔들림. 칸 수 = 막별 상한(1막 3 · 2막 2 · 3막 1). 공이 닿기 전엔 이전 값. */
  const mentalCap=v10MentalCap(s),combat=s.v10?.lastCombat;
  const shaken=judged&&!landed&&Number.isInteger(combat?.shakenBefore)?combat.shakenBefore:v10Shaken(s);
  const shakenRose=judged&&landed&&combat?.shakenAfter>combat?.shakenBefore;
  /* 주자 압박: 지금 루상 주자로 안타를 치면 붙는 피해 배율 */
  const runners=(b.bases||[]).filter(Boolean).length,runnerPct=Math.round(runners*V10_RUNNER_PRESSURE*100);

  function pickSwing(id){
    if(locked)return;
    setArmed(null);
    if(selected===id){onSelect(null);onStack([]);return;}
    if(stack.some(x=>x.id===id)){onStack(stack.filter(x=>x.id!==id));return;}
    const kind=byId(id)?.entry?.kind;
    /* with a main card on the board, another swing card becomes a support: it waits for a zone */
    if(canStack&&id!=='basic'&&kind!=='bunt'&&stack.length<V10_SWING_STACK_MAX-1){setArmed(id);return;}
    onSelect(id);onStack([]);
  }
  function pickPrep(id){if(locked)return;setArmed(null);onStack([]);onSelect(selected===id?null:id);}
  function pickZone(z){
    if(locked)return;
    if(armed){onStack([...stack,{id:armed,aimZone:z}]);setArmed(null);return;}
    onAim(z);
  }

  const mainName=selected==='basic'?'맨손 스윙':mainEntry?CARDS[mainEntry.kind].name:null;
  const rate=choice?.damageRate!=null?'피해 ×'+Number(choice.damageRate).toFixed(2).replace(/0$/,''):'';
  const verb=mainIsSkill?'준비한다':'휘두른다';
  /* only what the board does not already show: the HP multiplier, or the prepare uses left */
  const verbSub=!selected?'':mainIsSkill?prepLeft+'회 남음':rate;
  /* where the pitch is likely to go, as numbers: the share of every pitch (balls included), shown while deciding */
  const pct=z=>Math.round((probs[z]||0)*100);
  const topCell=live.reduce((a,z)=>(probs[z]||0)>(probs[a]||0)?z:a,live[0]);
  const tokens=judged?[r.coverage?.length?{z:r.aimZone,n:1}:null,...(r.supportZones||[]).map((z,i)=>({z,n:i+2}))].filter(Boolean)
    :[selected&&!mainIsSkill?{z:b.aimZone,n:1}:null,...stack.map((x,i)=>({z:x.aimZone,n:i+2}))].filter(Boolean);
  const call=judged?callOf(r,shot):'';
  /* a pitch in the ball band: say plainly what happened (players could not tell a chase from a miss) */
  const swung=!!r?.coverage?.length,outside=judged&&r.zone===9;
  const outNote=outside?(swung?'볼에 손이 나갔다':'볼을 골라냈다'):'';
  /* the first time a player swings at a ball, say once what a ball is (playtest: "유인구고 뭐고 못 알아보겠음") */
  const [chaseHint,setChaseHint]=useState(()=>{try{return localStorage.getItem('9zone-hint-chase')!=='done';}catch{return true;}});
  const [hintAt,setHintAt]=useState(null);
  const chased=!deciding&&outNote==='볼에 손이 나갔다'&&landed;
  const firstChase=chased&&(chaseHint||hintAt===playToken);
  /* the lens pivots on the bat's contact point; every .bp-cam layer gets its own offset so they zoom as one */
  const cam=inFx&&shot?CAMERA[shot.grade]||null:null;
  useLayoutEffect(()=>{
    const scene=sceneRef.current;if(!cam||!scene)return;
    const bat=scene.querySelector('.bp-batter');if(!bat)return;
    scene.style.setProperty('--cam-x',Math.round(bat.offsetLeft+bat.offsetWidth*.58)+'px');
    scene.style.setProperty('--cam-y',Math.round(bat.offsetTop+bat.offsetHeight*.52)+'px');
    for(const el of scene.querySelectorAll('.bp-cam')){el.style.setProperty('--ox',el.offsetLeft+'px');el.style.setProperty('--oy',el.offsetTop+'px');}
  },[cam,playToken]);
  useLayoutEffect(()=>{if(chased&&chaseHint){setHintAt(playToken);setChaseHint(false);try{localStorage.setItem('9zone-hint-chase','done');}catch{}}},[chased,chaseHint,playToken]);
  const coach=firstChase?'볼은 참으면 볼넷이 된다. 바깥 띠로 올 것 같으면 지켜본다.':!deciding?'':choice?.problem||(armed?'덮을 칸을 누른다':lines.coach);
  const good=judged&&(r.kind==='hit'||r.kind==='sacrifice'||call==='볼넷');
  /* the pitcher's one-liner: once when she takes the mound, then after each pitch that lands */
  const moment=showVerdict&&judged&&landed?momentOf({call,chased:outNote==='볼에 손이 나갔다',knockedOut:(pitcher?.hp??1)===0})
    :deciding&&!(b.history?.length)&&b.turn===1?'entry':null;
  const voice=moment?pitcherLine(artId,moment,playToken):'';

  /* Experimental lesson: keep the real battle, but explicitly separate the Slay-the-Spire
     decision from the autobattler payoff. The player plans; once the verb is pressed,
     their inputs are done and Pixi gets the stage until the result is readable. */
  const lessonPhase=deciding?'plan':inFx?'watch':judged?'review':'plan';
  const lessonCombat=s.v10?.lastCombat||null;
  const currentPlanCards=selected?[mainName,...stack.map(x=>CARDS[byId(x.id)?.entry?.kind]?.name||'지원')].filter(Boolean):[];
  const currentPlanZones=selected&&!mainIsSkill?[lessonZoneName(b.aimZone),...stack.map(x=>lessonZoneName(x.aimZone))]:[];
  const lessonCards=lessonPhase==='plan'?currentPlanCards:(autoPlan?.cards||[]);
  const lessonZones=lessonPhase==='plan'?currentPlanZones:(autoPlan?.zones||[]);
  const watchBeat={windup:'투수가 시작한다',impact:'빌드가 부딪힌다',slowmo:'판정 순간',release:'결과가 전개된다',settle:'마무리'}[fxStage]||'자동 실행 중';
  const reviewText=lessonCombat
    ?(lessonCombat.verdict||call||'판정')+' · 실제 '+(lessonCombat.pitchLabel||'코스')+' · 투수 HP -'+(lessonCombat.damage||0)
    :(call||shot?.title||'결과를 확인한다');
  const showDebrief=!autoLesson&&judged&&landed&&!inFx&&s.phase!=='battle'&&!!lessonCombat;
  const debriefLesson=showDebrief?lessonFor(lessonCombat,r):null;
  const debriefPlan=showDebrief?planText(lessonCombat):'';
  const debriefActual=showDebrief?(lessonCombat.pitchLabel||lessonZoneName(r?.zone)):'';
  const debriefDamage=showDebrief&&lessonCombat.damage>0?'HP -'+lessonCombat.damage:'';

  const cardButton=x=>{
    const def=CARDS[x.entry.kind],problem=x.preview?.problem,inStack=stack.findIndex(y=>y.id===x.id);
    const state=selected===x.id?' main':inStack>=0?' support':armed===x.id?' armed':'';
    return <button key={x.id} type="button" className={'bp-card'+state+(problem?' off':'')} aria-pressed={selected===x.id||inStack>=0}
      data-card-kind={x.entry.kind} disabled={!deciding} onClick={()=>pickSwing(x.id)}>
      <CardGlyph zones={x.preview?.coverage}/>
      <strong>{def.name}{x.entry.plus&&<sup>+</sup>}</strong>
      {(problem||effect(def))&&<span>{problem||effect(def)}</span>}
      {selected===x.id&&<b className="bp-order">1</b>}{inStack>=0&&<b className="bp-order">{inStack+2}</b>}
    </button>;
  };

  return <main ref={rootRef} className={'bp-battle'+(autoLesson?' auto-lesson':'')+(deciding?'':' resolving')+(inFx?' fx-'+fxStage:'')} aria-label="타석">
    <div className="bp-bar">
      <span>{label}</span>
      <span className="bp-piles"><button type="button" onClick={()=>onPile?.('draw')}>덱 {b.draw?.length??0}</button><button type="button" onClick={()=>onPile?.('discard')}>버림 {b.discard?.length??0}</button></span>
    </div>

    <section className={'bp-scene'+(pixi?.batter?' pixi-batter':'')+(pixi?.pitcher?' pixi-pitcher':'')+(inFx?' fx-stage-'+fxStage+(shot?' fx-'+(shot.grade||shot.kind):''):'')+(cam?' cam-'+cam:'')} ref={sceneRef} aria-label="승부 구장">
      <div className="bp-bg bp-cam" aria-hidden="true"/>
      <div className="bp-haze" aria-hidden="true"/>
      {autoLesson&&<aside className={'bp-auto-lesson '+lessonPhase} data-testid="bp-auto-lesson" aria-live="polite">
        <header>
          <span>BUILD → BATTLE</span>
          <button type="button" onClick={onExitLesson}>체험 종료</button>
        </header>
        <ol aria-label="전략 자동전투 흐름">
          <li className={lessonPhase==='plan'?'on':''}><b>1</b><span>설계</span></li>
          <li className={lessonPhase==='watch'?'on':''}><b>2</b><span>자동 실행</span></li>
          <li className={lessonPhase==='review'?'on':''}><b>3</b><span>복기</span></li>
        </ol>
        {lessonPhase==='plan'&&<div className="bp-auto-copy">
          <strong>{selected?'이 빌드를 확정한다':'먼저 빌드를 만든다'}</strong>
          <small>{selected?'버튼을 누른 뒤에는 손을 떼고 결과를 본다.':'카드와 존을 고른다. 지원 카드를 얹으면 한 번의 스윙이 길어진다.'}</small>
        </div>}
        {lessonPhase==='watch'&&<div className="bp-auto-copy watch">
          <strong>AUTO RESOLVE · {watchBeat}</strong>
          <small>지금은 조작하지 않는다. 방금 만든 빌드가 투수와 싸우는 장면을 본다.</small>
        </div>}
        {lessonPhase==='review'&&<div className="bp-auto-copy review">
          <strong>{reviewText}</strong>
          <small>{lessonCombat?.connectCount?'CONNECT '+lessonCombat.connectCount+' · 연결 보너스가 실제 피해에 반영됐다.':autoPlan?.kind==='take'?'지켜보기 역시 하나의 빌드 선택이다. 다음 공의 정보와 손패를 산다.':'노린 코스와 실제 공을 비교하고 다음 설계를 바꾼다.'}</small>
        </div>}
        {!!lessonCards.length&&<div className="bp-auto-plan" aria-label="현재 빌드">
          {lessonCards.map((name,i)=><span key={i}><b>{i+1}</b>{name}{lessonZones[i]?<em>{lessonZones[i]}</em>:null}</span>)}
          {autoPlan?.coverage>0&&lessonPhase!=='plan'&&<i>{autoPlan.coverage}존 커버</i>}
        </div>}
      </aside>}
      {canPixi&&<BallparkActors sceneRef={sceneRef} pitcherAtlas={pitcherAtlas} artId={artId} batterPoses={batterPoses} pitchZone={judged?r.zone:null} shot={shot} fxStage={fxStage} playToken={playToken} knockedOut={judged&&(pitcher?.hp??1)===0} onReady={setPixi}/>}
      <div className="bp-pitcher bp-cam" ref={pitcherRef} aria-hidden="true">{pitcherArt}</div>
      <div className="bp-pcol">
      <div className="bp-ptag" aria-label={`${pitcher?.name} 투수 HP ${pitcher?.hp} / ${pitcher?.maxHp}`}>
        <span>{pitcher?.name}</span>
        <span className="bp-ticks" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} className={tickClass(i)}/>)}</span>
        {damage>0&&<b className="bp-damage" key={'d'+playToken}>-{damage}</b>}
        <small aria-hidden="true">HP {judged&&!landed?(pitcher?.hp||0)+(pitcher?.lastDamage||0):pitcher?.hp} / {pitcher?.maxHp}</small>
        <span className={'bp-mental'+(shaken?' shaken':'')+(shaken>=mentalCap?' max':'')+(shakenRose?' rose':'')} data-testid="bp-mental"
          data-shaken={shaken} data-cap={mentalCap} key={'m'+shaken} aria-label={`투수 흔들림 ${shaken} / ${mentalCap}`+(shaken?' · 볼 증가 · 읽기 +1':'')}>
          <em>흔들림</em><span aria-hidden="true">{Array.from({length:mentalCap},(_,i)=><i key={i} className={i<shaken?'on':''}/>)}</span>
        </span>
        {deciding&&runners>0&&<span className="bp-press" data-testid="bp-press" aria-label={`주자 ${runners}명 · 안타 피해 +${runnerPct}%`}><em>주자 압박</em><b>+{runnerPct}%</b></span>}
      </div>
      {voice&&<q className={'bp-voice m-'+moment} key={'q'+playToken+moment} data-testid="bp-voice">{voice}</q>}
      </div>
      {showVerdict&&<div className={'bp-verdict'+(good?' good':'')} key={'v'+playToken+(shot.title||'')} role="status"><strong>{call||shot.title}</strong>{(outNote||call&&shot.title&&shot.title!==call)&&<small>{outNote||shot.title}</small>}</div>}
      {inFx&&vfx}
      {inFx&&<i className="bp-flash" key={'x'+playToken+fxStage} aria-hidden="true"/>}
      {fxStage==='slowmo'&&shot?.motion?.slowmo>0&&<span className="bp-slowmo" aria-hidden="true">{shot.grade==='near-miss'||shot.grade==='near-miss-k'?'ONE ZONE':shot.grade==='homer'||shot.grade==='grand-slam'?'TIME STOPS':'SLOW'}</span>}
      {cam==='near'&&fxStage==='slowmo'&&<i className="bp-letterbox" key={'lb'+playToken} aria-hidden="true"/>}
      {judged&&inFx&&!landed&&!pixi?.pitcher&&<i className="bp-flight" ref={flightRef} key={'f'+playToken} aria-hidden="true"/>}
      <div className="bp-batter bp-cam" aria-hidden="true">{batterArt}</div>

      <div className={'bp-zone'+(cover.size?' has-cover':'')} ref={zoneRef} role="group" aria-label="노릴 코스">
        {ZONE_WORDS.map((word,z)=>{
          const share=(probs[z]||0)/inZone,dead=!live.includes(z),tok=tokens.filter(t=>t.z===z);
          const actual=judged&&landed&&r.zone===z;
          return <button key={z} type="button" disabled={!deciding} onClick={()=>pickZone(z)}
            aria-label={word+(dead?' · 던지지 않는 코스':'')+(b.aimZone===z?' · 노림':'')} aria-pressed={b.aimZone===z}
            className={'bp-cell'+(dead?' dead':'')+(cover.has(z)?' cover':'')+(support.has(z)?' assist':'')+(aimAt===z?' aim':'')+(armed?' target':'')+(actual?' actual'+(good?' good':''):'')}
            style={{'--heat':dead?0:Math.min(1,share*3).toFixed(2)}}>
            {dead&&!cover.has(z)&&<small className="bp-dead">안 던짐</small>}{!dead&&deciding&&<span className={'bp-pct'+(z===topCell?' top':'')}>{pct(z)}%</span>}{tok.map(t=><b key={t.n} className="bp-token" data-board-order={t.n}>{t.n}</b>)}{actual&&<i className="bp-pitch-mark" aria-label="실제 공"/>}
          </button>;
        })}
        {/* CONNECT: the order links the engine scored, solid = connected (+HP back), dashed = broken */}
        <ZoneLinks links={judged?r.stackLinks:stack.length?choice?.stackPlan?.links:null}/>
        <span className="bp-side l">몸쪽</span><span className="bp-side r">바깥쪽</span>
        {/* the ball band: the ring around the nine cells is where balls go. Swing at one = a whiff,
            watch one = a ball. It is drawn so the out-of-zone pitch has a place players can see. */}
        <span className={'bp-band'+(outside&&landed?' hit':'')} aria-hidden="true"><em>바깥 띠 = 볼{deciding?' '+pct(9)+'%':''}</em></span>
        {judged&&landed&&outside&&<i className="bp-pitch-mark outside" aria-label="실제 공 · 볼"/>}
      </div>

      <div className="bp-count" aria-label={`볼 ${b.balls} 스트라이크 ${b.strikes} 아웃 ${b.outs}`}>
        {[['B',b.balls,4],['S',b.strikes,3],['O',b.outs,3]].map(([k,v,n])=><div key={k}>{k}{Array.from({length:n-1},(_,i)=><u key={i} className={i<v?'on':''}/>)}</div>)}
      </div>
      <div className="bp-bases" aria-label={'주자 '+[0,1,2].filter(i=>b.bases?.[i]).map(i=>i+1+'루').join(', ')||'주자 없음'}>
        {[1,2,0].map(i=><i key={i} className={'base-'+(i+1)+(b.bases?.[i]?' on':'')}/>)}
      </div>
    </section>

    <p className={'bp-coach'+(voice?' has-voice':'')}><span className="bp-coach-text">{coach}</span>{voice&&<q className={'bp-voice-strip m-'+moment} key={'qs'+playToken+moment}><b>{pitcher?.name}</b>{voice}</q>}</p>

    {showDebrief?<aside className={'bp-debrief tone-'+(debriefLesson?.tone||'neutral')} data-testid="bp-debrief" aria-label="이번 공 복기">
      <div className="bp-dstep plan">
        <span>PLAN</span>
        <strong>{debriefPlan}</strong>
        <small>{lessonCombat.aimLabel||'노림 코스'}</small>
      </div>
      <i aria-hidden="true">→</i>
      <div className="bp-dstep actual">
        <span>ACTUAL</span>
        <strong>{debriefActual}</strong>
        <small>{debriefDamage||lessonCombat.verdict||call}</small>
      </div>
      <i aria-hidden="true">→</i>
      <div className="bp-dstep next">
        <span>NEXT</span>
        <strong>{debriefLesson?.title}</strong>
        <small>{debriefLesson?.text}</small>
      </div>
    </aside>:<div className="bp-hand" aria-label="손패">
      <button type="button" className={'bp-card basic'+(selected==='basic'?' main':'')} data-card-kind="basic" aria-pressed={selected==='basic'} disabled={!deciding} onClick={()=>pickSwing('basic')}>
        <CardGlyph zones={[b.aimZone]}/><strong>맨손 스윙</strong>{selected==='basic'&&<b className="bp-order">1</b>}
      </button>
      {swingCards.map(cardButton)}
      {prepCards.map(x=>{const def=CARDS[x.entry.kind],problem=x.preview?.problem;
        return <button key={x.id} type="button" className={'bp-token-card'+(selected===x.id?' main':'')+(problem||!prepLeft?' off':'')} aria-pressed={selected===x.id}
          data-card-kind={x.entry.kind} disabled={!deciding} onClick={()=>pickPrep(x.id)}>
          <strong>{def.name}</strong><span>{problem||'준비 '+prepLeft+'회'}</span>
        </button>;})}
    </div>}

    {onNext&&!deciding&&s.phase!=='battle'?<div className="bp-verbs next">
      <button type="button" className="bp-verb go" data-testid="bp-next" disabled={inFx} onClick={onNext}>{nextLabel}</button>
    </div>:<div className="bp-verbs">
      <button type="button" className="bp-verb go" data-testid="bp-swing" disabled={!deciding||!selected||!!choice?.problem} onClick={onSwing}>
        {verb}{verbSub&&<small>{verbSub}</small>}
      </button>
      <button type="button" className="bp-verb wait" data-testid="bp-take" disabled={!deciding} onClick={onTake}>지켜본다</button>
      {mainEntry&&deciding&&<button type="button" className="bp-info" aria-label={mainName+' 카드 설명'} onClick={e=>onDetail?.(mainEntry,e.currentTarget)}>ⓘ</button>}
    </div>}
  </main>;
}
