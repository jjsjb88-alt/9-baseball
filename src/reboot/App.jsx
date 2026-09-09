import React, {useEffect,useRef,useState} from 'react';
import {CARDS,OUTCOMES,PITCHERS,READ_NAMES,SAVE_KEY,ZONES} from './data.js';
import {newRun,startMatch,commitPitch,nextPitch,chooseReward,rewardOptions,serializeRun,readRun} from './engine.js';
import {playCue} from './audio.js';
import './reboot.css';

const time = ms => `${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
function Mark(){return <span className="ll-mark" aria-hidden="true">9<span>z</span></span>;}
function Pitcher({number='17',action=false}) {return <svg className={`ll-pitcher ${action?'throwing':''}`} viewBox="0 0 180 220" fill="none" aria-hidden="true">
  <ellipse cx="91" cy="210" rx="57" ry="6" fill="#000" opacity=".25"/>
  <g className="ll-player-body"><path d="M73 115L60 162 45 202 64 205 88 166 94 145 113 173 128 204 147 204 132 161 112 115" fill="#c6cec9" stroke="#73827d" strokeWidth="2"/>
  <path d="M48 198L40 210 67 210 66 201M126 201L129 211 156 211 144 201" fill="#1c2a30"/>
  <path d="M70 60L47 73 40 107 55 119 69 88 70 126 115 126 117 87 139 99 151 85 129 64 108 60" fill="currentColor" stroke="#183139" strokeWidth="3"/>
  <path d="M88 60V119M69 119H115M68 72L54 79M115 72L128 78" stroke="#f0eedb" strokeWidth="3" opacity=".7"/>
  <path d="M47 106L65 89 77 88 80 102 56 121Z" fill="#ba8a65"/>
  <path d="M72 77L95 73 106 85 100 108 79 111 66 96Z" fill="#603f2e" stroke="#b89062" strokeWidth="3"/>
  <path d="M76 79L82 99M84 77L90 99M92 80L96 94" stroke="#b89062" strokeWidth="2"/>
  <path d="M147 87L150 58 139 47 129 51 134 66 132 91Z" fill="#cfa17f"/>
  <circle cx="137" cy="47" r="7" fill="#eeefdf"/>
  <path d="M77 31L78 52 90 64 103 53 107 29" fill="#d4ac8e"/>
  <path d="M76 34Q70 11 91 10Q112 10 109 35Z" fill="#243b43"/><path d="M77 29L112 30 123 37 77 36Z" fill="#12242c"/>
  <path d="M82 46L90 49 99 46" stroke="#79644f" strokeWidth="2"/><text x="97" y="88" fill="#17323c" fontSize="14" fontWeight="900">{number}</text></g>
  </svg>;}
function MiniZone({zone}){return <span className="ll-mini-zone" aria-hidden="true">{Array.from({length:9},(_,i)=><i key={i} className={i===zone?'on':''}/>)}</span>;}
function Bases({bases}) {return <div className="ll-bases" aria-label={`주자: ${bases.map((on,i)=>on?`${i+1}루`:'').filter(Boolean).join(', ')||'없음'}`}><i className={bases[1]?'on':''}/><i className={bases[2]?'on':''}/><i className={bases[0]?'on':''}/><small>◆</small></div>;}

export default function LastLight(){
  const [run,setRun]=useState(null),[saved,setSaved]=useState(null),[error,setError]=useState('');
  const [zone,setZone]=useState(null),[cardIndex,setCardIndex]=useState(null),[wager,setWager]=useState(0);
  const [animation,setAnimation]=useState(null),[paused,setPaused]=useState(false),[help,setHelp]=useState(false),[confirmNew,setConfirmNew]=useState(false);
  const [muted,setMuted]=useState(true),[clock,setClock]=useState(0);
  const ref=useRef(null),elapsed=useRef(0),timer=useRef(null),audioTimer=useRef(null),locked=useRef(false);
  useEffect(()=>{try{setSaved(readRun(window.localStorage));}catch{setError('이 브라우저의 저장 기록을 읽지 못했습니다. 새 런은 시작할 수 있습니다.');}},[]);
  const persist=s=>{try{window.localStorage.setItem(SAVE_KEY,serializeRun(s));setError('');return true;}catch{setError('자동 저장에 실패했습니다. 이 창을 닫기 전에 저장을 다시 시도하세요.');return false;}};
  const update=s=>{const next={...s,elapsedMs:elapsed.current};ref.current=next;setRun(next);setSaved(next);persist(next);return next;};
  useEffect(()=>{
    if(!run||paused||help||run.phase==='finished')return;
    let last=Date.now();const id=setInterval(()=>{const now=Date.now();if(!document.hidden)elapsed.current+=Math.min(1500,now-last);last=now;setClock(elapsed.current);},1000);
    return()=>clearInterval(id);
  },[!!run,run?.phase,paused,help]);
  useEffect(()=>{
    const save=()=>{if(ref.current)try{window.localStorage.setItem(SAVE_KEY,serializeRun({...ref.current,elapsedMs:elapsed.current}));}catch{}};
    window.addEventListener('pagehide',save);return()=>window.removeEventListener('pagehide',save);
  },[]);
  useEffect(()=>()=>{clearTimeout(timer.current);clearTimeout(audioTimer.current);},[]);
  useEffect(()=>{if(!run||['brief','bench','finished'].includes(run.phase))window.scrollTo(0,0);},[run?.phase]);
  const resetInput=()=>{setZone(null);setCardIndex(null);setWager(0);};
  const launch=(resume)=>{
    window.scrollTo(0,0);
    clearTimeout(timer.current);clearTimeout(audioTimer.current);locked.current=false;setAnimation(null);setPaused(false);setConfirmNew(false);resetInput();
    const next=resume||newRun();elapsed.current=next.elapsedMs;setClock(next.elapsedMs);update(next);playCue('click',muted);
  };
  const commit=(take=false)=>{
    if(locked.current||paused||help||ref.current?.phase!=='pitch'||(!take&&zone===null))return;
    const next=commitPitch(ref.current,{zone,cardIndex,wager:take?0:wager,take});if(next===ref.current)return;
    locked.current=true;update(next);setCardIndex(null);setAnimation(next.last);playCue('pitch',muted);
    audioTimer.current=setTimeout(()=>playCue(next.last.outcome==='homerun'?'homerun':next.last.runs||['single','double','triple'].includes(next.last.outcome)?'hit':'click',muted),700);
    timer.current=setTimeout(()=>{locked.current=false;setAnimation(null);},1750);
  };
  const proceed=()=>{if(locked.current)return;resetInput();update(nextPitch(ref.current));};
  const exit=()=>{
    if(locked.current)return;
    const next={...ref.current,elapsedMs:elapsed.current};if(!persist(next))return;
    setSaved(next);ref.current=null;setRun(null);setPaused(false);resetInput();
  };
  useEffect(()=>{
    const keys=e=>{
      if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;
      if(e.key==='Escape'&&run&&!animation&&!help){setPaused(p=>!p);return;}
      if(paused||help||animation||run?.phase!=='pitch')return;
      if(/^[1-9]$/.test(e.key)){setZone(Number(e.key)-1);e.preventDefault();}
    };window.addEventListener('keydown',keys);return()=>window.removeEventListener('keydown',keys);
  },[run?.phase,paused,help,animation]);
  const opponent=run&&PITCHERS[run.match], ready=run?.phase==='pitch'&&!animation;
  const shown=run?.last, showResult=run?.phase==='result'&&!animation;
  const covered = i => zone!==null && (i===zone || run?.hand[cardIndex]==='cover'&&Math.floor(i/3)===Math.floor(zone/3)&&Math.abs(i-zone)===1);
  const newButton=()=>saved&&saved.phase!=='finished'?setConfirmNew(true):launch();
  return <div className={`ll-app ${!run?'ll-home':''}`}>
    <header className="ll-header"><a className="ll-brand" href="#" onClick={e=>{e.preventDefault();if(run&&!animation)setPaused(true);}}><Mark/><span>9ZONE<small>LAST LIGHT</small></span></a>
      <div className="ll-header-center">{run?<><span className="ll-live-dot"/> NIGHT SERIES <i>/</i> {time(clock)}</>:'A BASEBALL MIND GAME'}</div>
      <nav><button onClick={()=>setHelp(true)} aria-label="플레이 방법">? <span>플레이 방법</span></button><button aria-pressed={!muted} onClick={()=>{setMuted(!muted);playCue('click',!muted);}}>{muted?'소리 OFF':'소리 ON'}</button>{run&&<button disabled={!!animation} onClick={()=>setPaused(true)} aria-label="일시정지">Ⅱ</button>}</nav>
    </header>
    {error&&<div className="ll-error" role="alert">{error}{run&&<button onClick={()=>persist({...ref.current,elapsedMs:elapsed.current})}>저장 다시 시도</button>}</div>}
    {!run ? <main className="ll-landing"><div className="ll-landing-copy"><p className="ll-eyebrow"><span/> THE LAST LIGHT IS YOURS</p><h1>한 구를 읽고.<br/><em>경기를 바꿔라.</em></h1><p className="ll-lead">상대에게는 습관이 있다.<br/>당신에게는, 마지막 한 수가 있다.</p><div className="ll-landing-actions"><button className="ll-primary" onClick={newButton}>새로운 런 시작 <span>↗</span></button>{saved&&saved.phase!=='finished'&&<button className="ll-secondary" onClick={()=>launch(saved)}>이어하기 · MATCH {saved.match+1}</button>}</div><p className="ll-meta">1 PLAYER <i/> 약 30분 목표 <i/> 자동 저장</p></div>
      <div className="ll-invitation"><div className="ll-ticket-top"><span>INVITATION / 001</span><span>9Z</span></div><h2>THE NIGHT<br/>SERIES<span>2026</span></h2><p>세 명의 투수.<br/>아홉 번의 공격 이닝.<br/>당신만의 승부.</p><ol>{PITCHERS.map((p,i)=><li key={p.id}><span>0{i+1}</span><strong>{p.title}</strong><small>{p.target}점</small></li>)}</ol><div className="ll-ticket-bottom">READ · BET · REVEAL · IMPACT</div></div>
      <div className="ll-landing-foot"><span>확률을 고르는 게임이 아니다.</span><span>투수를 이해하는 게임이다. ↗</span></div></main>
    : <main className="ll-game"><div className="ll-route">{PITCHERS.map((p,i)=><div key={p.id} className={run.match===i?'active':run.match>i?'complete':''}><b>{run.match>i?'✓':`0${i+1}`}</b><span>{p.title}</span><small>{p.name}</small></div>)}</div>
      {run.phase==='brief'?<section className="ll-brief"><div><p className="ll-eyebrow">MATCH 0{run.match+1} / SCOUTING REPORT</p><h1>{opponent.name}<span>{opponent.title}</span></h1><p className="ll-lead">{opponent.intro}</p><div className="ll-brief-goal"><strong>{opponent.target}<small>RUNS</small></strong><p>3번의 공격 이닝 안에 {opponent.target}점을 만드세요.<br/>주자를 진루시켜 홈으로 불러들여야 합니다.</p></div><button className="ll-primary" onClick={()=>update(startMatch(ref.current))}>플레이 볼 <span>→</span></button><p className="ll-fine">코스를 고르고 → 카드로 베팅 → 스윙. 카드 없이도 칠 수 있습니다.</p></div><div className="ll-brief-art" style={{color:opponent.color}}><span>{opponent.number}</span><Pitcher number={opponent.number}/><p>RHP / NIGHT SERIES</p></div></section>
      :run.phase==='bench'?<section className="ll-bench"><p className="ll-eyebrow">THE DUGOUT / {run.nextMatch?'MATCH CLEAR':'INNING BREAK'}</p><h1>{run.nextMatch?'한 명을 읽어냈다.':'다음 이닝은, 다르게.'}</h1><p className="ll-lead">{run.score}득점 · {run.nextMatch?'다음 투수를 만나기 전':'다시 타석에 서기 전'}, 성장 하나를 선택하세요.</p><div className="ll-reward-grid">{rewardOptions(run).map((r,i)=><button key={r.id} onClick={()=>{resetInput();update(chooseReward(ref.current,r.id));}}><span className="ll-reward-no">0{i+1}</span><small>{r.tag}</small><h2>{r.title}</h2>{r.zone!==undefined&&<div className="ll-reward-zone"><MiniZone zone={r.zone}/><b>{ZONES[r.zone]}</b></div>}<p>{r.text}</p><strong>선택하고 진행 →</strong></button>)}</div><p className="ll-fine">이닝마다 손패 4장을 새로 받습니다. 숙련 {run.mastery.length}존 · 접촉 +{run.contactBonus} · 타구 질 +{run.powerBonus}</p></section>
      :run.phase==='finished'?<section className="ll-finish"><p className="ll-eyebrow">NIGHT SERIES / {run.won?'CHAMPION':'RUN COMPLETE'}</p><h1>{run.won?<>마지막 조명은<br/><em>당신의 것.</em></>:<>오늘의 승부는<br/>여기까지.</>}</h1><p className="ll-lead">{run.won?'세 투수를 모두 넘어섰습니다.':`${opponent.name}의 벽을 넘지 못했습니다. 다음에는 패턴을 기억하세요.`}</p><div className="ll-final-stats">{[[time(run.elapsedMs),'플레이 시간'],[run.stats.runs,'총 득점'],[run.stats.hits,'안타'],[run.stats.reads,'정확한 읽기'],[run.stats.homeRuns,'홈런']].map(([v,l])=><div key={l}><strong>{v}</strong><span>{l}</span></div>)}</div><div className="ll-match-results">{run.matches.map(m=><p key={m.match}><span>{PITCHERS[m.match].title}</span><b>{m.score} / {PITCHERS[m.match].target}</b><small>{m.won?'CLEAR':'DEFEAT'}</small></p>)}</div><button className="ll-primary" onClick={()=>launch()}>다시 도전 <span>↗</span></button><button className="ll-link" onClick={exit}>메인으로</button></section>
      :<><div className="ll-arena">
        <aside className="ll-scout"><p className="ll-eyebrow">ON THE MOUND</p><div className="ll-scout-identity"><div className="ll-portrait" style={{color:opponent.color}}><span>{opponent.number}</span><Pitcher number={opponent.number} action={!!animation}/></div><h2>{opponent.name}<small>{opponent.title}</small></h2></div><div className="ll-scout-note"><span>SCOUT'S NOTE</span><p>{opponent.tell}</p></div><div className="ll-mastery"><span>나의 숙련 코스 <b>{run.mastery.length}/9</b></span><div>{ZONES.map((z,i)=><i key={z} className={run.mastery.includes(i)?'on':''} title={z}>{i+1}</i>)}</div><small>숙련존은 접촉과 타구 질에 유리합니다.</small></div></aside>
        <section className={`ll-field ${animation?'is-pitching':''} ${animation?.outcome==='homerun'?'is-homerun':''}`} aria-label="타격 존">
          <div className="ll-field-heading"><span><i className="ll-live-dot"/>{animation?'REVEAL':showResult?'IMPACT':'READ THE PITCH'}</span><small>{ready?'공개 확률 · 실제 의도는 숨겨져 있습니다':`${shown?.type||''} ${shown?.speed||''} km/h`}</small></div>
          <div className="ll-count"><div>B <b>{run.balls}</b></div><div>S <b>{run.strikes}</b></div><span>{run.paPitches}/12구</span></div>
          <div className="ll-zone-wrap"><div className="ll-zone-grid">{ZONES.map((name,i)=><button key={name} aria-label={`${name} 코스`} aria-pressed={zone===i} disabled={!ready||paused||help} onClick={()=>{setZone(i);playCue('click',muted);}} className={`${covered(i)?'selected':''} ${showResult&&shown.actual===i?'revealed':''} ${run.mastery.includes(i)?'mastered':''}`} style={{'--heat':ready?run.pitch.publicOdds[i]:0}}><span className="ll-zone-key">{i+1}</span><span className="ll-zone-name">{name}</span>{ready?<strong>{Math.round(run.pitch.publicOdds[i]*100)}<small>%</small></strong>:<strong>{showResult&&shown.actual===i?'●':'·'}</strong>}<i/></button>)}</div><div className="ll-plate"/><span className="ll-waste">존 밖 {ready?`${Math.round(run.pitch.publicOdds[9]*100)}%`:shown?.actual===9?'●':'—'}</span></div>
          {animation&&<div className="ll-pitch-animation" aria-hidden="true"><i className="ll-flying-ball" style={{'--ball-x':`${animation.actual===9?145:((animation.actual%3)-1)*70}px`,'--ball-y':`${animation.actual===9?92:(Math.floor(animation.actual/3)-1)*70}px`}}/><div className="ll-impact-ring"/><div className="ll-impact-word">{animation.read==='deep'?'DEEP READ':OUTCOMES[animation.outcome][0]}</div></div>}
          <div className={`ll-field-caption ${showResult?'result':''}`} aria-live="polite">{animation?'투구를 확인하는 중…':showResult?<><span>{READ_NAMES[shown.read]}</span><strong>{OUTCOMES[shown.outcome][1]}{shown.runs>0&&` · +${shown.runs}득점`}</strong><small>{OUTCOMES[shown.outcome][2]}</small></>:<><strong>{zone===null?'어디로 올까?':`${ZONES[zone]}를 기다린다.`}</strong><small>{zone===null?'코스를 선택한 뒤 아래에서 승부를 결정하세요.':'카드를 쓰거나, 기본 스윙으로 손패를 아끼세요.'}</small></>}</div>
        </section>
        <aside className="ll-match-panel"><div className="ll-score-title"><span>MATCH 0{run.match+1}</span><b>{run.inning}회 공격</b></div><div className="ll-score"><strong>{run.score}</strong><span>/</span><b>{opponent.target}<small>목표 득점</small></b></div><div className="ll-score-line"><span>OUT</span><div>{[0,1,2].map(i=><i key={i} className={i<(run.outs%3===0&&showResult&&run.outs>0?3:run.outs%3)?'on':''}/>)}</div><Bases bases={run.bases}/></div><div className="ll-inning-dots">{[1,2,3].map(i=><span key={i} className={i===run.inning?'on':''}>{i} INNING</span>)}</div>
          <div className="ll-history"><div><span>PITCH LOG</span><small>최근 5구</small></div>{run.history.slice(-5).reverse().map((h,i)=><div className="ll-history-row" key={`${run.stats.pitches-i}`}><MiniZone zone={h.actual}/><span><b>{h.actual===9?'존 밖':ZONES[h.actual]}</b><small>{h.balls}-{h.strikes} · {h.type}</small></span><em>{OUTCOMES[h.outcome][1]}</em></div>)}{!run.history.length&&<p>첫 공부터 관찰하세요.<br/>투구가 끝나면 기록이 남습니다.</p>}</div>
        </aside>
      </div>
      <details className="ll-mobile-log"><summary>관찰 노트 · 최근 12구</summary><div>{run.history.slice(-12).reverse().map((h,i)=><p key={i}><MiniZone zone={h.actual}/><span>M{h.match+1} · {h.balls}-{h.strikes} → {h.actual===9?'존 밖':ZONES[h.actual]} · {OUTCOMES[h.outcome][1]}</span></p>)}{!run.history.length&&<p>투구가 끝나면 기록이 남습니다.</p>}</div></details>
      <section className="ll-bet-dock" aria-label="카드 베팅"><div className="ll-hand-header"><h2>YOUR HAND <span>카드는 승부의 방식이다.</span></h2><small>손패 {run.hand.length} · 덱 {run.draw.length} · 버림 {run.discard.length}</small></div><div className="ll-hand">{run.hand.map((key,i)=>{const c=CARDS[key];return <button className={`ll-card ${cardIndex===i?'chosen':''}`} disabled={!ready} key={`${key}-${i}`} aria-pressed={cardIndex===i} aria-label={`${c.name} 카드 ${i+1}`} onClick={()=>{setCardIndex(cardIndex===i?null:i);playCue('click',muted);}} style={{'--card-color':c.color}}><div><span>{c.en}</span><b>{c.mark}</b></div><strong>{c.name}</strong><p>{c.text}</p><small>{c.detail}</small></button>;})}<button className={`ll-basic ${cardIndex===null?'chosen':''}`} disabled={!ready} aria-pressed={cardIndex===null} onClick={()=>setCardIndex(null)}><b>↗</b><strong>기본 스윙</strong><span>카드 소비 없음</span></button></div>
        <div className="ll-action-bar"><div className="ll-wager"><span>집중 <b>{run.focus}</b><small> / 5</small></span><div role="group" aria-label="집중 베팅">{[0,1,2].map(n=><button key={n} disabled={!ready||run.focus<n} aria-pressed={wager===n} onClick={()=>setWager(n)}>{n===0?'아낀다':`+${n} 건다`}</button>)}</div><small>맞게 읽으면 강해지고, 틀리면 더 위험합니다.</small></div><div className="ll-main-actions">{showResult?<button className="ll-primary" onClick={proceed}>{shown.terminal&&run.outs>0&&run.outs%3===0&&['out','strikeout'].includes(shown.outcome)?'이닝 결과 확인':'다음 공 준비'} <span>→</span></button>:<><button className="ll-take" disabled={!ready} onClick={()=>commit(true)}>지켜보기 <small>집중 +1</small></button><button className="ll-primary" disabled={!ready||zone===null} onClick={()=>commit(false)}>{animation?'승부 중…':zone===null?'코스를 선택하세요':'스윙 확정'}<span>↗</span></button></>}</div></div>
      </section><footer className="ll-game-foot"><span>READ → BET → REVEAL → IMPACT</span><span>숫자 1–9: 코스 선택 · ESC: 일시정지</span></footer></>}
    </main>}
    {(help||paused||confirmNew)&&<div className="ll-modal-backdrop"><section className="ll-modal" role="dialog" aria-modal="true" aria-label={help?'플레이 방법':confirmNew?'새 런 확인':'일시정지'}>
      {help?<><p className="ll-eyebrow">HOW TO PLAY</p><h2>야구를 몰라도,<br/>상대를 읽으면 된다.</h2><ol><li><b>READ · 9개 코스 중 하나를 고른다.</b><p>숫자는 공개 확률. 투수의 실제 습관과는 다릅니다. 투구 기록과 카운트를 함께 보세요.</p></li><li><b>BET · 손패 1장과 집중을 건다.</b><p>카드는 타격 방식, 숙련존은 익숙한 코스입니다. 집중은 정확히 읽으면 이득, 틀리면 대가를 치르는 베팅입니다. 기본 스윙은 무제한입니다.</p></li><li><b>IMPACT · 주자를 홈으로 불러들인다.</b><p>3아웃이면 이닝 종료. 3이닝 안에 목표 득점을 넘겨야 다음 투수로 갑니다. 각 타석의 12구째까지 승부가 안 나면 볼넷 처리합니다.</p></li></ol><p className="ll-fine">플레이 시간은 약 30분을 목표로 설계했습니다. 실제 판단 속도·탈락 시점에 따라 달라집니다. 소리는 기본 OFF입니다.</p><button className="ll-primary" onClick={()=>setHelp(false)}>알겠어, 시작하자 <span>→</span></button></>
      :confirmNew?<><p className="ll-eyebrow">NEW RUN</p><h2>새 승부를 시작할까요?</h2><p>진행 중인 LAST LIGHT 저장 기록을 덮어씁니다. 이전 프로토타입의 저장 기록은 건드리지 않습니다.</p><button className="ll-primary" onClick={()=>launch()}>새 런으로 교체</button><button className="ll-link" onClick={()=>setConfirmNew(false)}>취소</button></>
      :<><p className="ll-eyebrow">TIME OUT</p><h2>잠깐, 숨을 고르자.</h2><p>진행 상황은 이 브라우저에 저장됩니다. 다른 기기와 자동으로 동기화되지는 않습니다.</p><button className="ll-primary" onClick={()=>setPaused(false)}>승부 계속하기 <span>→</span></button><button className="ll-secondary" onClick={exit}>저장하고 메인으로</button>{error&&<p role="alert">{error}</p>}</>}
    </section></div>}
  </div>;
}
