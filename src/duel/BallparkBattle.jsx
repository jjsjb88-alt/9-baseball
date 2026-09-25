import React,{useLayoutEffect,useRef,useState} from 'react';
import {CARDS} from './cards.js';
import {publicProbabilities,V10_SWING_STACK_MAX} from './engine.js';
import {intentLines,hpTicks,ZONE_WORDS} from './ballpark-copy.js';
import './ballpark.css';

/* V13 BALLPARK — the battle as one ballpark scene (docs/design/v13/BALLPARK.md).
   Same engine contract as the legacy screen: `selected` + battle.aimZone is the main card,
   `swingStack` [{id,aimZone}] the supports, and the parent plays them through playV10Action.
   BP-2: the pitch plays in the scene too — the ball flies to its zone at the impact beat, the
   verdict is one word, the HP ticks drop, and one button moves on. */
const LANDED=new Set(['impact','slowmo','release','settle']);
const GOOD=new Set(['hit','extra','homer','jammed','lucky','sacrifice','draw','survive']);

/* the glyph already draws the coverage; the face keeps only what it adds (정확 적중 HP +50% …) */
const effect=def=>(def.gives||[]).filter(g=>!/커버$/.test(g)).slice(0,1).join('');
const isSkill=entry=>CARDS[entry?.kind]?.type==='skill';
const CardGlyph=({zones})=><span className="bp-glyph" aria-hidden="true">{Array.from({length:9},(_,z)=><i key={z} className={zones?.includes(z)?'on':''}/>)}</span>;

export default function BallparkBattle({
  s,hand,selected,swingStack,choice,locked=false,
  pitcher,label,pitcherArt,batterArt,
  fxStage=null,shot=null,impactAt=0,playToken=0,onNext=null,nextLabel='',
  onSelect,onAim,onStack,onSwing,onTake,onDetail,onPile,
}){
  const b=s.battle,rootRef=useRef(null),sceneRef=useRef(null),pitcherRef=useRef(null),zoneRef=useRef(null),flightRef=useRef(null);
  const r=b.revealed,inFx=!!fxStage,deciding=s.phase==='battle'&&!inFx&&!locked;
  const judged=!!r&&s.last?.kind!=='skill'&&(inFx||s.phase!=='battle');
  const landed=!inFx||LANDED.has(fxStage);
  const showVerdict=!!shot&&(inFx||s.phase!=='battle')&&(landed||!judged);
  const [armed,setArmed]=useState(null);
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
  const coach=!deciding?'':choice?.problem||(armed?'덮을 칸을 누른다':lines.coach);
  const tokens=judged?[r.coverage?.length?{z:r.aimZone,n:1}:null,...(r.supportZones||[]).map((z,i)=>({z,n:i+2}))].filter(Boolean)
    :[selected&&!mainIsSkill?{z:b.aimZone,n:1}:null,...stack.map((x,i)=>({z:x.aimZone,n:i+2}))].filter(Boolean);
  const good=GOOD.has(shot?.kind);

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

  return <main ref={rootRef} className={'bp-battle'+(deciding?'':' resolving')+(inFx?' fx-'+fxStage:'')} aria-label="타석">
    <div className="bp-bar">
      <span>{label}</span>
      <span className="bp-piles"><button type="button" onClick={()=>onPile?.('draw')}>덱 {b.draw?.length??0}</button><button type="button" onClick={()=>onPile?.('discard')}>버림 {b.discard?.length??0}</button></span>
    </div>

    <section className="bp-scene" ref={sceneRef}>
      <div className="bp-bg" aria-hidden="true"/>
      <div className="bp-haze" aria-hidden="true"/>
      <div className="bp-pitcher" ref={pitcherRef} aria-hidden="true">{pitcherArt}</div>
      <div className="bp-ptag" aria-label={`${pitcher?.name} 투수 HP ${pitcher?.hp} / ${pitcher?.maxHp}`}>
        <span>{pitcher?.name}</span>
        <span className="bp-ticks" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} className={tickClass(i)}/>)}</span>
        {damage>0&&<b className="bp-damage" key={'d'+playToken}>-{damage}</b>}
        <small aria-hidden="true">HP {judged&&!landed?(pitcher?.hp||0)+(pitcher?.lastDamage||0):pitcher?.hp} / {pitcher?.maxHp}</small>
      </div>
      {showVerdict&&<div className={'bp-verdict'+(good?' good':'')} key={'v'+playToken+(shot.title||'')} role="status">{r?.label&&judged&&<small>{r.label}</small>}<strong>{shot.title}</strong></div>}
      {judged&&inFx&&!landed&&<i className="bp-flight" ref={flightRef} key={'f'+playToken} aria-hidden="true"/>}
      <div className="bp-batter" aria-hidden="true">{batterArt}</div>

      <div className="bp-zone" ref={zoneRef} role="group" aria-label="노릴 코스">
        {ZONE_WORDS.map((word,z)=>{
          const share=(probs[z]||0)/inZone,dead=!live.includes(z),tok=tokens.filter(t=>t.z===z);
          const actual=judged&&landed&&r.zone===z;
          return <button key={z} type="button" disabled={!deciding} onClick={()=>pickZone(z)}
            aria-label={word+(dead?' · 던지지 않는 코스':'')+(b.aimZone===z?' · 노림':'')} aria-pressed={b.aimZone===z}
            className={'bp-cell'+(dead?' dead':'')+(cover.has(z)?' cover':'')+(support.has(z)?' assist':'')+(aimAt===z?' aim':'')+(armed?' target':'')+(actual?' actual'+(good?' good':''):'')}
            style={{'--heat':dead?0:Math.min(1,share*3).toFixed(2)}}>
            {tok.map(t=><b key={t.n} className="bp-token">{t.n}</b>)}{actual&&<i className="bp-pitch-mark" aria-label="실제 공"/>}
          </button>;
        })}
        <span className="bp-side l">몸쪽</span><span className="bp-side r">바깥쪽</span>
        {judged?<span className={'bp-ball'+(landed&&r.zone===9?' actual':'')}>{landed&&r.zone===9?'존 밖으로 빠졌다':'존 밖'}</span>
          :<span className="bp-ball">존 밖 {Math.round((probs[9]||0)*100)}%</span>}
      </div>

      <div className="bp-count" aria-label={`볼 ${b.balls} 스트라이크 ${b.strikes} 아웃 ${b.outs}`}>
        {[['B',b.balls,4],['S',b.strikes,3],['O',b.outs,3]].map(([k,v,n])=><div key={k}>{k}{Array.from({length:n-1},(_,i)=><u key={i} className={i<v?'on':''}/>)}</div>)}
      </div>
      <div className="bp-bases" aria-label={'주자 '+[0,1,2].filter(i=>b.bases?.[i]).map(i=>i+1+'루').join(', ')||'주자 없음'}>
        {[1,2,0].map(i=><i key={i} className={'base-'+(i+1)+(b.bases?.[i]?' on':'')}/>)}
      </div>
    </section>

    <p className="bp-coach">{coach}</p>

    <div className="bp-hand" aria-label="손패">
      <button type="button" className={'bp-card basic'+(selected==='basic'?' main':'')} aria-pressed={selected==='basic'} disabled={!deciding} onClick={()=>pickSwing('basic')}>
        <CardGlyph zones={[b.aimZone]}/><strong>맨손 스윙</strong>{selected==='basic'&&<b className="bp-order">1</b>}
      </button>
      {swingCards.map(cardButton)}
      {prepCards.map(x=>{const def=CARDS[x.entry.kind],problem=x.preview?.problem;
        return <button key={x.id} type="button" className={'bp-token-card'+(selected===x.id?' main':'')+(problem||!prepLeft?' off':'')} aria-pressed={selected===x.id}
          data-card-kind={x.entry.kind} disabled={!deciding} onClick={()=>pickPrep(x.id)}>
          <strong>{def.name}</strong><span>{problem||'준비 '+prepLeft+'회'}</span>
        </button>;})}
    </div>

    {onNext&&!deciding&&s.phase!=='battle'?<div className="bp-verbs next">
      <button type="button" className="bp-verb go" data-testid="bp-next" disabled={inFx} onClick={onNext}>{nextLabel}</button>
    </div>:<div className="bp-verbs">
      <button type="button" className="bp-verb go" data-testid="bp-swing" disabled={!deciding||!selected||!!choice?.problem} onClick={onSwing}>
        {verb}{verbSub&&<small>{verbSub}</small>}
      </button>
      <button type="button" className="bp-verb wait" data-testid="bp-take" disabled={!deciding} onClick={onTake}>지켜본다</button>
      {mainEntry&&deciding&&<button type="button" className="bp-info" aria-label={mainName+' 카드 설명'} onClick={()=>onDetail?.(mainEntry)}>ⓘ</button>}
    </div>}
  </main>;
}
