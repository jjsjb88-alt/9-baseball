import React,{useState} from 'react';
import {CARDS,READ_LEVELS,ZONES,bandFor,rangeFor,shadeFor,shadeNameFor} from './cards.js';
import {createV10Duel,enterV10Node,playV10Action,advanceV10Pitch,advanceV10Batter,claimV10Reward,
  v10UtilityOptions,completeV10UtilityNode,v10RewardOptions,selectV10Pitcher,selectV10Combat,selectV10Map,
  saveV10Duel,readV10Duel,setAimZone,coverage,previewCard,currentBatter,publicProbabilities,readLevel} from './engine.js';
import PitcherHpHud from './PitcherHpHud.jsx';
import CombatResultSummary from './CombatResultSummary.jsx';
import RunMap from './RunMap.jsx';
import './v10-ui.css';

/* V10 연결부. 엔진 selector를 UI 셸의 props 모양으로 옮기는 일만 한다.
   전투 규칙은 engine.js, 표시 규칙은 v10-copy.js가 갖는다. */

const UTILITY_PHASES=['training','locker','shop','rest'];
const PHASE_TITLES={training:'타격 훈련',locker:'라커룸',shop:'장비 상점',rest:'휴식일'};
const zoneName=zone=>zone===9?'존 밖':ZONES[zone]||'코스 미확인';
/* 엔진은 lastCombat.choice를 카드 kind로, actualPitch를 존 번호로 준다. 화면 문구로 옮기는 건 여기 일이다. */
const choiceName=kind=>kind==='take'?'한 구 지켜보기':kind==='basic'?'기본 스윙':CARDS[kind]?.name||kind;

export default function V10App({onExit}){
  const [initial]=useState(()=>{try{return readV10Duel(localStorage)}catch{return null}});
  const [s,setS]=useState(initial);
  const [seed,setSeed]=useState('20261010');
  const [selected,setSelected]=useState(null);
  const [error,setError]=useState('');

  const push=next=>{
    if(!next||next===s)return;
    setS(next);setSelected(null);
    try{saveV10Duel(localStorage,next);setError('')}catch{setError('저장 실패: 이 창을 닫으면 진행을 잃을 수 있습니다.')}
  };
  const start=()=>push(createV10Duel(Number(seed)>>>0));

  if(!s)return (
    <main className="v10-screen v10-screen-intro">
      <span className="eyebrow">9ZONE V10 · PITCHER HP</span>
      <h1>투수를 끌어내려라.</h1>
      <p>점수가 아니라 투수 HP가 승부를 끝낸다. 파울도, 한 칸 차이도 투수를 깎는다.<br/>HP 0이면 강판, 보상 한 장, 그리고 다음 갈림길.</p>
      <label className="v10-seed">시드 <input type="number" min="0" max="4294967295" value={seed} onChange={event=>setSeed(event.target.value)}/></label>
      <div className="v10-screen-actions">
        <button className="v10-primary" onClick={start}>런 시작</button>
        {onExit&&<button onClick={onExit}>V9로 돌아가기</button>}
      </div>
    </main>
  );

  const battle=s.battle,pitcher=selectV10Pitcher(s),combat=selectV10Combat(s),revealed=battle?.revealed;
  const inCombat=['battle','pitch','between'].includes(s.phase);
  const hand=battle?battle.hand.map(id=>s.deck.find(card=>card.id===id)).filter(Boolean):[];
  const covered=battle?coverage(s,selected||'basic'):[];
  const preview=battle&&selected?previewCard(s,selected):null;
  /* 읽기 없이 치면 못 이기는 승부다. 엔진이 공개한 만큼만, 등급대로 보여준다. */
  const odds=battle?(battle.pending?publicProbabilities(s):battle.intent.probabilities):null;
  const level=battle?readLevel(s):0;
  const oddsText=value=>level===2?rangeFor(value):level===1?bandFor(value):shadeNameFor(value);

  const header=(
    <header className="v10-bar">
      <strong>9ZONE V10</strong>
      <small>덱 {s.deck.length}장 · {s.stats.pitches}구</small>
      <button onClick={()=>{if(confirm('지금 런을 버리고 새로 시작할까요?'))start()}}>새 런</button>
      {onExit&&<button onClick={onExit}>V9</button>}
    </header>
  );

  const resultRow=combat?(
    <CombatResultSummary
      choice={{card:choiceName(combat.choice),zone:zoneName(revealed?.aimZone)}}
      actualPitch={{type:battle?.intent?.name,zone:zoneName(combat.actualPitch)}}
      verdict={combat.verdict}
      damage={combat.damage}
      hpAfter={combat.hpAfter}
    />
  ):null;

  return (
    <div className="v10-app">
      {header}
      {error&&<p className="v10-save-error" role="alert">{error}</p>}

      {s.phase==='map'&&(
        <main className="v10-screen">
          <span className="eyebrow">경로 선택</span>
          <h1>어디로 갈까.</h1>
          <RunMap {...selectV10Map(s)} onSelect={id=>push(enterV10Node(s,id))}/>
        </main>
      )}

      {inCombat&&pitcher&&(
        <main className="v10-screen v10-combat">
          <PitcherHpHud {...pitcher}/>
          <p className="v10-count">
            <b>{battle.batterIndex+1}번 {currentBatter(s).name}</b>
            <span>{battle.balls}볼 {battle.strikes}스트라이크 · {battle.outs}아웃</span>
          </p>
          <p className="v10-intent"><span>투수 의도</span><b>{battle.intent?.name}</b><small>읽기 · {READ_LEVELS[level].name}</small></p>
          <p className="v10-read">{battle.intent?.detail}</p>

          <div className="v10-zones" role="group" aria-label="노릴 코스">
            {ZONES.map((label,zone)=>(
              <button
                key={zone}
                type="button"
                className={`v10-zone shade-${shadeFor(odds[zone])}${battle.aimZone===zone?' is-aim':''}${covered.includes(zone)?' is-covered':''}`}
                aria-pressed={battle.aimZone===zone}
                aria-label={`${label} · ${oddsText(odds[zone])}${covered.includes(zone)?' · 카드 범위 안':''}`}
                data-odds={odds[zone].toFixed(4)}
                disabled={s.phase!=='battle'}
                onClick={()=>push(setAimZone(s,zone))}
              >
                <b>{label}</b>
                <i>{oddsText(odds[zone])}</i>
              </button>
            ))}
          </div>
          <p className="v10-note">존 밖 {oddsText(odds[9])} · 밝을수록 자주 오는 코스다. 카드 범위 안(초록)에 실제 공이 들어오면 안타 확정.</p>

          {resultRow}

          {s.phase==='battle'&&(
            <>
              <div className="v10-hand">
                <button type="button" className={`v10-card${selected==='basic'?' is-picked':''}`} onClick={()=>setSelected('basic')}>
                  <strong>기본 스윙</strong><small>고른 1존 · 카드 소비 없음</small>
                </button>
                {hand.map(card=>(
                  <button key={card.id} type="button" className={`v10-card${selected===card.id?' is-picked':''}`} onClick={()=>setSelected(card.id)}>
                    <strong>{CARDS[card.kind].name}{card.plus?'+':''}</strong>
                    <small>{CARDS[card.kind].rule}</small>
                  </button>
                ))}
              </div>
              <div className="v10-actions">
                <button type="button" onClick={()=>push(playV10Action(s,{type:'take'}))}>한 구 지켜보기</button>
                <button type="button" className="v10-primary" disabled={!selected||!!preview?.problem}
                  onClick={()=>push(playV10Action(s,{type:'card',id:selected}))}>
                  {selected?`${choiceName(selected==='basic'?'basic':s.deck.find(c=>c.id===selected)?.kind)} 실행`:'카드를 고르세요'}
                </button>
              </div>
              {preview?.problem&&<p className="v10-note">{preview.problem}</p>}
            </>
          )}

          {s.phase==='pitch'&&<button className="v10-primary v10-next" onClick={()=>push(advanceV10Pitch(s))}>다음 공 · 같은 타자</button>}
          {s.phase==='between'&&<button className="v10-primary v10-next" onClick={()=>push(advanceV10Batter(s))}>다음 타자 입장</button>}
        </main>
      )}

      {s.phase==='reward'&&(
        <main className="v10-screen">
          <span className="eyebrow">강판 · 카드 보상</span>
          <h1>{s.v10?.opponent?.name||'상대 투수'}를 끌어내렸다.</h1>
          {resultRow}
          <div className="v10-hand">
            {v10RewardOptions(s).map(kind=>(
              <button key={kind} type="button" className="v10-card" onClick={()=>push(claimV10Reward(s,{type:'add',kind}))}>
                <strong>{CARDS[kind].name}</strong><small>{CARDS[kind].rule}</small>
              </button>
            ))}
          </div>
          <button onClick={()=>push(claimV10Reward(s,{type:'skip'}))}>건너뛰기</button>
        </main>
      )}

      {UTILITY_PHASES.includes(s.phase)&&(
        <main className="v10-screen">
          <span className="eyebrow">경로 구간</span>
          <h1>{PHASE_TITLES[s.phase]}</h1>
          <div className="v10-hand">
            {v10UtilityOptions(s).map((option,index)=>(
              <button key={index} type="button" className="v10-card" onClick={()=>push(completeV10UtilityNode(s,option))}>
                <strong>{option.name}</strong>
                <small>{option.type==='upgrade'?'이 카드를 강화한다':option.type==='remove'?'이 카드를 덱에서 뺀다':option.type==='add'?'이 카드를 덱에 넣는다':'다음 전투에서 타격 기술 +8'}</small>
              </button>
            ))}
          </div>
          <button onClick={()=>push(completeV10UtilityNode(s,{type:'skip'}))}>그냥 지나간다</button>
        </main>
      )}

      {['won','lost'].includes(s.phase)&&(
        <main className="v10-screen v10-screen-end">
          <span className="eyebrow">{s.phase==='won'?'RUN COMPLETE':'THREE OUTS'}</span>
          <h1>{s.phase==='won'?'마지막 투수까지 끌어내렸다.':'삼아웃. 여기서 끝났다.'}</h1>
          <p>덱 {s.deck.length}장 · 돌파한 칸 {s.runMap.completedNodeIds.length}개 · {s.stats.pitches}구</p>
          {resultRow}
          <button className="v10-primary" onClick={start}>다시 도전</button>
        </main>
      )}
    </div>
  );
}
