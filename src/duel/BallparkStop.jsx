import React,{useState} from 'react';
import {CARDS,upgradeText} from './cards.js';
import {V10_RELICS} from './v10-relics.js';
import {pitcherLine} from './pitcher-voice.js';
import stadium from '../../assets/duel/stadium.png';
import './ballpark.css';

/* V13 BALLPARK BP-4 — reward and facility stops (docs/design/v13/BALLPARK.md).
   One scene header, one line, the offers as cards, one button. Engine calls stay in the parent:
   onPick(option) confirms, onSkip() passes. `options` are engine options ({type,kind,id,relic}). */

const COPY={
  reward:{title:o=>(o?.name||'투수')+' 강판',line:'한 장 챙겨 가자.',go:'챙긴다',skip:'그냥 간다'},
  locker:{title:()=>'라커룸',line:'손에 안 붙는 배트는 두고 간다.',go:'뺀다',skip:'그냥 간다'},
  training:{title:()=>'타격 훈련',line:'한 장을 단련한다.',go:'단련한다',skip:'그냥 간다'},
  shop:{title:()=>'장비 상점',line:'하나만 들일 수 있다.',go:'들인다',skip:'그냥 간다'},
  rest:{title:()=>'휴식일',line:'하루 쉬면 다음 경기 타격 +8.',go:'쉰다',skip:'그냥 간다'},
};
const EMPTY={locker:'덱이 가장 얇다. 뺄 카드가 없다.',training:'더 단련할 카드가 없다.',shop:'덱이 가득 찼다.',rest:'쉴 것이 없다.'};

const Glyph=({zones})=><span className="bp-glyph" aria-hidden="true">{Array.from({length:9},(_,z)=><i key={z} className={zones?.includes(z)?'on':''}/>)}</span>;
/* coverage shape on a centred aim, for the card face */
const SHAPE={point:[4],column:[1,4,7],row:[3,4,5],cross:[1,3,4,5,7],all:[0,1,2,3,4,5,6,7,8]};
const effect=def=>(def?.gives||[]).filter(g=>!/커버$/.test(g)).slice(0,1).join('');

function Offer({o,on,count,onClick}){
  if(o.type==='relic'){const r=V10_RELICS[o.relic];
    return <button type="button" className={'bp-offer relic'+(on?' on':'')} aria-pressed={on} onClick={onClick}>
      <b className="bp-mark">{r?.mark}</b><strong>{r?.name}</strong><span>{r?.text}</span></button>;}
  if(o.type==='rest')return <button type="button" className={'bp-offer rest'+(on?' on':'')} aria-pressed={on} onClick={onClick}>
    <b className="bp-mark">+8</b><strong>컨디션 회복</strong><span>다음 경기 타격 +8</span></button>;
  const def=CARDS[o.kind],skill=def?.type==='skill';
  return <button type="button" className={'bp-offer'+(skill?' skill':'')+(on?' on':'')} aria-pressed={on} onClick={onClick} data-card-kind={o.kind}>
    {skill?<b className="bp-mark">준비</b>:<Glyph zones={SHAPE[def?.shape]||[4]}/>}
    <strong>{def?.name}{o.type==='upgrade'&&<sup>+</sup>}</strong>
    <span>{o.type==='upgrade'?upgradeText(o.kind):effect(def)||def?.role}</span>
    {count>1&&<small>덱에 {count}장</small>}
  </button>;
}

export default function BallparkStop({kind,opponent=null,portrait=null,options=[],deck=[],deckCount=0,onPick,onSkip,onDeck,onInspect}){
  const [sel,setSel]=useState(null);
  const c=COPY[kind]||COPY.rest,o=options[sel];
  /* the locker lists the whole deck: one button per card kind, not one per copy */
  const shown=kind==='locker'?options.filter((x,i)=>options.findIndex(y=>y.kind===x.kind)===i):options;
  const count=k=>deck.filter(d=>d.kind===k).length;
  /* the knocked-out pitcher gets the last word: her line lands big, next to her portrait */
  const voice=kind==='reward'?pitcherLine(opponent?.artId,'knockout',deckCount):'';
  const after=o?(o.type==='add'?deckCount+1:o.type==='remove'?deckCount-1:deckCount):deckCount;
  return <main className={'bp-stop stop-'+kind} aria-label={c.title(opponent)}>
    <div className="bp-bar"><span>{kind==='reward'?'승리':'쉬어 가는 곳'}</span><span className="bp-piles"><button type="button" onClick={onDeck}>덱 {deckCount}{after!==deckCount&&<> → <b>{after}</b></>}</button></span></div>
    <header className="bp-shead" style={{'--bp-sky':`url(${stadium})`}}>
      {portrait&&<button type="button" className="bp-sport" aria-label={opponent?.name+' 초상 크게 보기'} onClick={e=>onInspect?.(opponent,e)}><img alt="" src={portrait}/></button>}
      <div className={'bp-stitle'+(voice?' has-voice':'')}>{voice&&<q className="bp-kovoice" data-testid="bp-kovoice">{voice}</q>}<h1>{c.title(opponent)}</h1><p>{options.length?c.line:EMPTY[kind]||''}</p></div>
    </header>
    <div className="bp-offers">
      {shown.map(x=>{const i=options.indexOf(x);return <Offer key={i} o={x} on={sel===i} count={kind==='locker'?count(x.kind):0} onClick={()=>setSel(sel===i?null:i)}/>;})}
    </div>
    <div className="bp-verbs stop">
      {!!options.length&&<button type="button" className="bp-verb go" data-testid="bp-stop-go" disabled={!o} onClick={()=>o&&onPick?.(o)}>{c.go}</button>}
      <button type="button" className={'bp-verb '+(options.length?'wait':'go')} data-testid="bp-stop-skip" onClick={onSkip}>{options.length?c.skip:'지도로'}</button>
    </div>
  </main>;
}
