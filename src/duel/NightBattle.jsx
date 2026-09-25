import React,{useLayoutEffect,useRef,useState} from 'react';
import {CARDS} from './cards.js';
import {publicProbabilities,V10_SWING_STACK_MAX} from './engine.js';
import {intentLines,hpTicks,ZONE_WORDS} from './nightgame-copy.js';
import './nightgame.css';

/* V13 NG-1 — the battle decision as one night-game scene (docs/design/v13/NIGHTGAME.md).
   Same engine contract as the legacy screen: `selected` + battle.aimZone is the main card,
   `swingStack` [{id,aimZone}] the supports, and the parent plays them through playV10Action.
   Pitch presentation and results stay on the legacy screen for now (NG-2). */

const isSkill=entry=>CARDS[entry?.kind]?.type==='skill';
const CardGlyph=({zones})=><span className="ng-glyph" aria-hidden="true">{Array.from({length:9},(_,z)=><i key={z} className={zones?.includes(z)?'on':''}/>)}</span>;

export default function NightBattle({
  s,hand,selected,swingStack,choice,locked=false,
  pitcher,batter,label,pitcherArt,batterArt,
  onSelect,onAim,onStack,onSwing,onTake,onDetail,onPile,
}){
  const b=s.battle,rootRef=useRef(null);
  const [armed,setArmed]=useState(null);
  useLayoutEffect(()=>{
    const root=rootRef.current,header=document.querySelector('.duel-header');
    if(!root)return;
    const set=()=>root.style.setProperty('--ng-top',(header?.getBoundingClientRect().height||0)+'px');
    set();window.addEventListener('resize',set);return()=>window.removeEventListener('resize',set);
  },[]);

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
  const cover=new Set(stack.length?choice?.primaryCoverage||[]:(!mainIsSkill&&selected?choice?.coverage||[]:[]));
  const support=new Set(stack.length?(choice?.supportCoverages||[]).flatMap(x=>x.coverage):[]);
  const lines=intentLines(b.intent);
  const ticks=hpTicks(pitcher?.hp,pitcher?.maxHp);

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
  const verbSub=!selected?'카드를 고른다':mainIsSkill?mainName+' · 준비 '+prepLeft+'회 남음'
    :[mainName+(stack.length?' 외 '+stack.length+'장':''),ZONE_WORDS[b.aimZone]||'',rate].filter(Boolean).join(' · ');
  const coach=choice?.problem||(armed?byId(armed)&&CARDS[byId(armed).entry.kind].name+' — 덮을 칸을 누른다.':lines.coach);
  const tokens=[selected&&!mainIsSkill?{z:b.aimZone,n:1}:null,...stack.map((x,i)=>({z:x.aimZone,n:i+2}))].filter(Boolean);

  const cardButton=x=>{
    const def=CARDS[x.entry.kind],problem=x.preview?.problem,inStack=stack.findIndex(y=>y.id===x.id);
    const state=selected===x.id?' main':inStack>=0?' support':armed===x.id?' armed':'';
    return <button key={x.id} type="button" className={'ng-card'+state+(problem?' off':'')} aria-pressed={selected===x.id||inStack>=0}
      data-card-kind={x.entry.kind} disabled={locked} onClick={()=>pickSwing(x.id)}>
      <CardGlyph zones={x.preview?.coverage}/>
      <strong>{def.name}{x.entry.plus&&<sup>+</sup>}</strong>
      <span>{problem||(def.gives||[]).slice(0,2).join(' · ')}</span>
      {selected===x.id&&<b className="ng-order">1</b>}{inStack>=0&&<b className="ng-order">{inStack+2}</b>}
    </button>;
  };

  return <main ref={rootRef} className="ng-battle" aria-label="타석">
    <div className="ng-bar">
      <span>{label}</span>
      <span>{b.batterIndex+1}번 · <b>#{batter?.number} {batter?.name}</b></span>
      <span className="ng-piles"><button type="button" onClick={()=>onPile?.('draw')}>덱 {b.draw?.length??0}</button><button type="button" onClick={()=>onPile?.('discard')}>버림 {b.discard?.length??0}</button></span>
    </div>

    <section className="ng-scene">
      <div className="ng-bg" aria-hidden="true"/>
      <div className="ng-haze" aria-hidden="true"/>
      <div className="ng-pitcher" aria-hidden="true">{pitcherArt}</div>
      <div className="ng-ptag" aria-label={`${pitcher?.name} 투수 HP ${pitcher?.hp} / ${pitcher?.maxHp}`}>
        <span>{pitcher?.name}</span>
        <span className="ng-ticks" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} className={i<ticks?'':'lost'}/>)}</span>
        <small aria-hidden="true">HP {pitcher?.hp} / {pitcher?.maxHp}</small>
      </div>
      {lines.whisper&&<p className="ng-whisper">{lines.whisper}</p>}
      <div className="ng-batter" aria-hidden="true">{batterArt}</div>

      <div className="ng-zone" role="group" aria-label="노릴 코스">
        {ZONE_WORDS.map((word,z)=>{
          const share=(probs[z]||0)/inZone,dead=!live.includes(z),tok=tokens.filter(t=>t.z===z);
          return <button key={z} type="button" disabled={locked} onClick={()=>pickZone(z)}
            aria-label={word+(dead?' · 던지지 않는 코스':'')+(b.aimZone===z?' · 노림':'')} aria-pressed={b.aimZone===z}
            className={'ng-cell'+(dead?' dead':'')+(cover.has(z)?' cover':'')+(support.has(z)?' assist':'')+(b.aimZone===z&&selected&&!mainIsSkill?' aim':'')+(armed?' target':'')}
            style={{'--heat':dead?0:Math.min(1,share*3).toFixed(2)}}>
            {tok.map(t=><b key={t.n} className="ng-token">{t.n}</b>)}
          </button>;
        })}
        <span className="ng-side l">몸쪽</span><span className="ng-side r">바깥쪽</span>
        <span className="ng-ball">존 밖 {Math.round((probs[9]||0)*100)}%</span>
      </div>

      <div className="ng-count" aria-label={`볼 ${b.balls} 스트라이크 ${b.strikes} 아웃 ${b.outs}`}>
        {[['B',b.balls,4],['S',b.strikes,3],['O',b.outs,3]].map(([k,v,n])=><div key={k}>{k}{Array.from({length:n-1},(_,i)=><u key={i} className={i<v?'on':''}/>)}</div>)}
      </div>
      <div className="ng-bases" aria-label={'주자 '+[0,1,2].filter(i=>b.bases?.[i]).map(i=>i+1+'루').join(', ')||'주자 없음'}>
        {[1,2,0].map(i=><i key={i} className={'base-'+(i+1)+(b.bases?.[i]?' on':'')}/>)}
      </div>
    </section>

    <p className="ng-coach">{coach}</p>

    <div className="ng-hand" aria-label="손패">
      <button type="button" className={'ng-card basic'+(selected==='basic'?' main':'')} aria-pressed={selected==='basic'} disabled={locked} onClick={()=>pickSwing('basic')}>
        <CardGlyph zones={[b.aimZone]}/><strong>맨손 스윙</strong><span>카드 없이 한 칸</span>{selected==='basic'&&<b className="ng-order">1</b>}
      </button>
      {swingCards.map(cardButton)}
      {prepCards.map(x=>{const def=CARDS[x.entry.kind],problem=x.preview?.problem;
        return <button key={x.id} type="button" className={'ng-token-card'+(selected===x.id?' main':'')+(problem||!prepLeft?' off':'')} aria-pressed={selected===x.id}
          data-card-kind={x.entry.kind} disabled={locked} onClick={()=>pickPrep(x.id)}>
          <strong>{def.name}</strong><span>{problem||'준비 '+prepLeft+'회'}</span>
        </button>;})}
    </div>

    <div className="ng-verbs">
      <button type="button" className="ng-verb go" data-testid="ng-swing" disabled={locked||!selected||!!choice?.problem} onClick={onSwing}>
        {verb}<small>{verbSub}</small>
      </button>
      <button type="button" className="ng-verb wait" data-testid="ng-take" disabled={locked} onClick={onTake}>지켜본다</button>
      {mainEntry&&<button type="button" className="ng-info" aria-label={mainName+' 카드 설명'} onClick={()=>onDetail?.(mainEntry)}>ⓘ</button>}
    </div>
  </main>;
}
