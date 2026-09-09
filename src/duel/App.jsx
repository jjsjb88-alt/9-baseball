import React,{useEffect,useId,useRef,useState} from 'react';
import {CARDS,TYPE_NAMES,STAGES,GLOSSARY,REWARDS} from './cards.js';
import {createDuel,startBattle,playCard,endTurn,chooseCard,previewCard,readDuel,saveDuel} from './engine.js';
import './duel.css';
import {cue} from './audio.js';
import batterSheet from '../../assets/duel/batter.png';
import pitcherSheet from '../../assets/duel/pitcher.png';

const iconPaths={bat:'M8 26L25 7L29 7L29 11L11 28Z',shield:'M7 6H25V20L16 29L7 20Z',eye:'M3 14L10 8H22L29 14V18L22 24H10L3 18ZM13 12V20H19V12Z',book:'M4 7H14L16 9L18 7H28V25H18L16 27L14 25H4Z',ball:'M10 5H22L27 10V22L22 27H10L5 22V10ZM10 10V22H12V10ZM20 10V22H22V10Z',comet:'M3 5L19 11L25 11L29 15V23L23 29H15L11 25L9 17ZM15 17V23H23V17Z',double:'M4 9H12V17H4ZM20 17H28V25H20ZM12 17H20V19H12Z',diamond:'M16 3L29 16L16 29L3 16ZM16 9L9 16L16 23L23 16Z',target:'M5 5H27V27H5ZM9 9V23H23V9ZM13 13H19V19H13Z',spark:'M18 2L6 19H14L12 30L27 12H18Z',moon:'M15 3H21L17 7V17L23 23H29L25 28H13L5 20V10L10 5Z',sun:'M13 2H19V7H13ZM13 25H19V30H13ZM2 13H7V19H2ZM25 13H30V19H25ZM10 10H22V22H10Z'};
function PixelIcon({art}){return <svg viewBox="0 0 32 32" aria-hidden="true" shapeRendering="crispEdges"><path fill="currentColor" fillRule="evenodd" d={iconPaths[art]}/></svg>;}
function Card({kind,onClick,selected,problem,preview,label}){const c=CARDS[kind];return <button className={`duel-card ${c.type} ${selected?'selected':''} ${problem?'unavailable':''}`} onClick={onClick} aria-label={label||c.name} aria-pressed={!!selected}>
  <span className="card-cost">{c.type==='skill'?'S+1':'타'}</span><span className="card-type">{TYPE_NAMES[c.type]}</span><div className="card-art"><PixelIcon art={c.art}/></div><strong>{c.name}</strong><span className="card-rule">{c.text}</span><span className={'card-foot '+(preview?.outs?'out-warning':preview?.runs?'run-reward':'')}>{preview&&!preview.problem?`${preview.label} · +${preview.runs}점 / ${preview.outs}OUT`:c.flavor}</span></button>;}
function Sprite({who,frame=0}){
  const clip=useId(),pitcher=who==='pitcher',height=pitcher?724:793;
  // Generated poses are NOT evenly spaced. Explicit atlas bounds prevent adjacent limbs leaking into a frame.
  const [x,width,offset]=(pitcher?[[0,600,70],[740,500,-600],[1280,892,-1300]]:[[0,660,70],[680,730,-550],[1420,563,-1250]])[frame];
  return <svg aria-hidden="true" className="duel-sprite" viewBox={`0 0 ${height} ${height}`} style={{overflow:'visible'}}><defs><clipPath id={clip}><rect x={x} y="0" width={width} height={height}/></clipPath></defs><g transform={`translate(${offset} 0)`}><image clipPath={`url(#${clip})`} href={pitcher?pitcherSheet:batterSheet} width={pitcher?2172:1983} height={height}/></g></svg>;
}

function Diamond({s,preview}){
  const b=s.battle;
  return <div className="living-diamond" aria-label="베이스에 묶인 카드">
    <div className="base-lines"/>
    {[2,1,0].map(i=>{const id=b.bases[i],c=s.deck.find(c=>c.id===id),after=preview?.bases?.[i],ghost=after&&s.deck.find(c=>c.id===after);
      return <div key={i+'-'+(id||'empty')} className={'base-slot base-'+(i+1)+(id?' occupied':'')+(preview&&after!==id?' changing':'')}><span>{i+1}루 {id?'· 덱에서 이탈':'· 비어 있음'}</span>{c?<><PixelIcon art={CARDS[c.kind].art}/><b>{CARDS[c.kind].name}</b></>:<b className="empty-base">◇</b>}{preview&&after!==id&&<small>→ {ghost?CARDS[ghost.kind].name:'비워짐'}</small>}</div>;
    })}
    <div className="home-plate"><b>HOME</b><span>득점 = 카드 복귀</span></div>
  </div>;
}
export default function Duel(){
  const [initial]=useState(()=>{try{return {save:readDuel(localStorage)}}catch{return {error:'저장을 읽지 못했습니다. 새 런을 시작할 수 있습니다.'}}});
  const [s,setS]=useState(initial.save),[screen,setScreen]=useState('menu'),[modal,setModal]=useState(null),[selected,setSelected]=useState(null),[fx,setFx]=useState(null),[frame,setFrame]=useState(0),[error,setError]=useState(initial.error||''),[sound,setSound]=useState(false);
  const current=useRef(s),lock=useRef(false),timers=useRef([]);
  useEffect(()=>()=>timers.current.forEach(clearTimeout),[]);
  useEffect(()=>{const close=e=>{if(e.key==='Escape')setModal(null)};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[]);
  function persist(next){current.current=next;setS(next);try{saveDuel(localStorage,next);setError('')}catch{setError('저장 실패: 이 창을 닫으면 진행을 잃을 수 있습니다.');}}
  function act(fn,animate=false){
    if(lock.current)return;const next=fn(current.current);if(next===current.current)return;
    persist(next);setSelected(null);
    if(animate){lock.current=true;if(sound)cue(next.last.kind);setFx(next.last);setFrame(1);
      const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      timers.current=[setTimeout(()=>setFrame(2),reduced?10:180),setTimeout(()=>{setFx(null);setFrame(0);lock.current=false;timers.current=[]},reduced?60:650)];
    }
  }
  function fresh(){persist(createDuel());setScreen('run');setModal(null);setSelected(null)}
  const b=s?.battle,showBattle=screen==='run'&&b&&(s.phase==='battle'||fx),byId=id=>s.deck.find(c=>c.id===id),choice=selected&&b?.hand.includes(selected)?previewCard(s,selected):null;
  const pile=modal&&['draw','discard','bench','deck'].includes(modal)?(modal==='deck'?s.deck:b[modal].map(byId)):null;
  return <div className="duel-app diamond-app">
    <header className="duel-header"><button className="wordmark" onClick={()=>{if(!lock.current)setScreen('menu')}}>9ZONE<span> HOMEBOUND</span></button><span className="edition">THE DIAMOND IS YOUR DECK</span><nav><button aria-label={'소리 '+(sound?'켜짐':'꺼짐')} onClick={()=>{if(!sound)cue('skill');setSound(!sound)}}>♪ {sound?'ON':'OFF'}</button>{s&&<button onClick={()=>setModal('deck')}>덱 {s.deck.length}</button>}<button onClick={()=>setModal('help')}>규칙</button></nav></header>
    {error&&<div className="save-error" role="alert">{error}<button onClick={()=>s&&persist(s)}>저장 재시도</button></div>}
    {screen==='menu'?<main className="duel-title stadium"><div className="title-copy"><span className="eyebrow">BASEBALL × A LIVING DECK</span><h1>네 덱이,<br/><em>베이스 위를 달린다.</em></h1><p>안타를 치면 그 카드는 손에서 사라진다.<br/>홈으로 불러들여라. 점수와 카드가 함께 돌아온다.</p><div className="title-actions"><button className="primary" onClick={()=>s&&!['won','lost'].includes(s.phase)?setModal('new'):fresh()}>새 런 시작</button>{s&&<button onClick={()=>setScreen('run')}>이어하기</button>}</div><small>적 체력 없음 · 3아웃 · 출루한 카드 잠금 · 득점하면 복귀<br/>핵심 규칙 검증판 / 4승부 · 3번의 덱 선택</small></div><div className="title-actor"><Sprite who="batter"/></div></main>
    :showBattle?<main className="duel-combat">
      <div className="battle-ribbon"><span>{s.stage+1} / 4 — {STAGES[s.stage].name}</span><b>타석 {b.turn}</b><span>안타는 끝이 아니라, 카드의 이동이다.</span></div>
      <section className={'duel-arena stadium '+(fx?.kind==='hit'?'impact':'')} aria-label="승부 구장">
        <div className="diamond-score"><span>RUNS / TARGET</span><strong>{b.runs}<i> / {STAGES[s.stage].target}</i></strong><div>OUT <b>{'●'.repeat(b.outs)}{'○'.repeat(3-b.outs)}</b></div></div>
        <div className={'intent '+b.intent.kind}><span>공개 수비 · 이유가 있는 변화</span><strong>{b.intent.name}</strong><b>필요 컨택 {b.intent.need}</b></div>
        <div className="count-board"><span>이번 타석</span><strong>{b.strikes} <i>STRIKE</i></strong><div>노림 <b>+{b.aim}</b></div></div>
        <div className="actor-left"><Sprite who="batter" frame={fx?.kind==='hit'?frame:0}/></div><div className="actor-right"><Sprite who="pitcher" frame={fx?.kind==='pitch'?frame:0}/></div>
        <Diamond s={s} preview={choice&&!choice.problem?choice:null}/>
        {fx&&<div key={s.stats.pitches} className={'duel-fx '+fx.kind}><span className="pixel-ball"/><strong>{fx.runs?'HOME! +'+fx.runs:fx.outs?fx.outs+' OUT':fx.kind==='hit'?'ON BASE':''}</strong></div>}
      </section>
      <div className="diamond-reason">{b.intent.detail}</div>
      <section className="duel-table">
        <div className="table-toolbar"><div className="buffs"><span>손패 <b>{b.hand.length}</b></span><span>베이스 잠금 <b>{b.bases.filter(Boolean).length}</b></span><span>벤치 <b>{b.bench.length}</b></span></div><button className="end-turn" disabled={!!fx} onClick={()=>act(endTurn,true)}>한 구 지켜보기<span>{b.strikes===2?'삼진 · 아웃 +1':'스트라이크 +1 · 카드 1장'}</span></button></div>
        <div className="diamond-events" role="status"><b>{s.last?.text}</b>{s.last?.events.map((e,i)=><span key={i}>{e}</span>)}</div>
        <div className="duel-hand">{b.hand.map(id=>{const p=previewCard(s,id);return <Card key={id} kind={byId(id).kind} selected={selected===id} problem={p.problem} preview={p} onClick={()=>{if(!lock.current){if(selected===id)act(x=>playCard(x,id),true);else setSelected(id)}}}/>})}{!b.hand.length&&<p className="empty-hand">베이스와 벤치에 카드가 묶였습니다. 한 구 지켜보기로 다른 카드를 찾으세요.</p>}</div>
        <div className="decision-preview">{choice?<><b>{choice.problem||choice.label+' · '+choice.runs+'점 / '+choice.outs+'아웃'}</b>{choice.contact!=null&&<span>현재 컨택 {choice.contact} / 필요 {b.intent.need}</span>}{choice.events?.map((e,i)=><span key={i}>{e}</span>)}<button className="primary" disabled={!!choice.problem||!!fx} onClick={()=>act(x=>playCard(x,selected),true)}>카드 사용</button></>:<span>카드를 골라 보세요. 득점·아웃·베이스 이동을 먼저 보여줍니다.</span>}</div>
        <div className="table-footer"><div className="pile-buttons"><button onClick={()=>setModal('draw')}>뽑을 카드 {b.draw.length}</button><button onClick={()=>setModal('discard')}>버린 카드 {b.discard.length}</button><button onClick={()=>setModal('bench')}>벤치 {b.bench.length}</button></div><span className="deck-rule">베이스의 카드는 뽑을 수 없다. 홈에 오면 돌아온다.</span></div>
      </section>
    </main>:s.phase==='map'?<main className="duel-map stadium"><div className="map-copy"><span className="eyebrow">HOMEBOUND / FOUR DIAMONDS</span><h1>체력을 깎지 마.<br/>주자를 돌려보내.</h1><p>각 승부는 3아웃.<br/>다음 승부에서는 베이스와 벤치의 카드도 복귀.<br/>손패를 바꾸는 세 번의 보상을 선택하세요.</p></div><div className="map-route">{STAGES.map((stage,i)=><div key={i} className={'route-node '+(i===s.stage?'current':'')+(i<s.stage?' cleared':'')}><span>{i<s.stage?'✓':'0'+(i+1)}</span><div><h2>{stage.name}</h2><p>{stage.sub}</p></div>{i===s.stage?<button className="primary" onClick={()=>act(startBattle)}>승부 시작</button>:<small>{i<s.stage?'돌파':'대기'}</small>}</div>)}</div></main>
    :s.phase==='reward'?<main className="reward-screen"><span className="eyebrow">HOME SAFE / REWARD {s.stage+1} OF 3</span><h1>어떤 방식으로 돌아오게 할까?</h1><p>{b.runs}점 · {b.outs}아웃 — 다음 승부에서 모든 카드가 덱으로 복귀합니다.</p><div className="reward-cards">{REWARDS[s.stage].map(kind=><Card key={kind} kind={kind} selected={selected===kind} onClick={()=>setSelected(kind)}/>)}</div><div className="reward-actions"><button className="primary" disabled={!selected} onClick={()=>act(x=>chooseCard(x,selected))}>선택한 카드 획득</button><button onClick={()=>act(x=>chooseCard(x,'skip'))}>건너뛰기 · 덱을 얇게 유지</button></div></main>
    :<main className="duel-result stadium"><span className="eyebrow">{s.phase==='won'?'EVERYBODY HOME':'THREE OUTS'}</span><h1>{s.phase==='won'?'덱이 한 바퀴, 경기가 뒤집혔다.':'베이스에 남겨 둔 가능성.'}</h1><p>{s.victories}/4 승부 · 총 {s.stats.runs}득점 · 득점 복귀 {s.stats.returned}회</p>{s.phase==='lost'&&<p>잔루 {b.bases.filter(Boolean).length}장. 출루는 성공했지만, 홈으로 돌려보내지 못했습니다.</p>}<button className="primary" onClick={fresh}>다시 도전</button><button onClick={()=>setModal('deck')}>덱 보기</button></main>}
    {modal&&<div className="duel-backdrop" onClick={()=>setModal(null)}><section className="duel-modal" role="dialog" aria-modal="true" aria-label={modal==='help'?'플레이 방법':'카드 정보'} onClick={e=>e.stopPropagation()}><button className="modal-close" aria-label="닫기" onClick={()=>setModal(null)}>×</button>{modal==='new'?<><h2>진행 중인 런을 새로 시작할까요?</h2><p>HOMEBOUND 저장만 교체합니다. 이전 DUGOUT 저장은 유지됩니다.</p><button className="primary" onClick={fresh}>새 런으로 교체</button></>:modal==='help'?<><span className="eyebrow">THE DIAMOND IS YOUR DECK</span><h2>베이스에 묶인 카드가 다음 선택을 바꾼다.</h2><div className="combo-example">타이밍 맞추기 → 담장 넘기기 → 강타 카드가 2루에 묶임<br/>대주자 교체 → 강타 카드를 회수하고 작전 카드를 2루에 남김<br/>주자 불러들이기 → 득점 + 베이스 카드 손패 복귀</div><p>카드 선택 후 다시 클릭하거나 ‘카드 사용’. 빨간 아웃 예고도 선택할 수 있습니다. 때로는 한 아웃을 지불하는 것이 유리합니다.</p>{GLOSSARY.map(([term,text])=><p key={term}><b>{term}</b> — {text}</p>)}<h3>카드 도감 · 12종</h3><div className="collection">{Object.keys(CARDS).map(kind=><Card key={kind} kind={kind}/>)}</div></>:pile?<><h2>{{deck:'현재 덱 · 베이스와 벤치 포함',draw:'뽑을 카드 · 순서 비공개',discard:'버린 카드',bench:'벤치 · 이번 승부에서 사용 불가'}[modal]}</h2><div className="collection">{[...pile].sort((a,b)=>a.kind.localeCompare(b.kind)).map(c=><Card key={c.id} kind={c.kind}/>)}</div>{!pile.length&&<p>비어 있습니다.</p>}</>:null}</section></div>}
  </div>;
}
