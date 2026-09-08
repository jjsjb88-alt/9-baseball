import React from 'react';
import { RUN_STAGES, RUN_PA_PER_STAGE, RUN_ZONE_NAMES, runRewardOptions } from './run-session.js';
const labels = { walk: '볼넷 · 1루 획득', single: '안타 · 1루 획득', double: '2루타 · 2루 획득', triple: '3루타 · 3루 획득', homerun: '홈런 · 4루 획득', out: '타구 아웃', strikeout: '삼진 아웃' };
export default function RunJourney({ run, error, onStart, onContinue, onReward, onExit, onRetrySave, onRestart, onNew }) {
  const stage = run && RUN_STAGES[run.stage];
  const terminal = run && ['won','lost'].includes(run.status);
  return <section className={`run-journey ${!run ? 'run-landing' : run.status === 'playing' ? 'run-playing' : ''}`} aria-label="쇼다운 런">
    {!run ? <>
      <div className="run-eyebrow">THE NIGHT RUN / 01</div>
      <h1>마지막 투수를<br/><em>읽어내라.</em></h1>
      <p>여섯 번의 승부. 하나의 덱.<br/>투수의 습관을 기억하고, 당신의 승부를 완성하세요.</p>
      <div className="run-facts"><span>약 30분</span><span>6라운드</span><span>48타석</span></div>
      <button className="run-primary" onClick={onNew}>30분 쇼다운 런 시작 →</button>
    </> : <>
      <div className="run-topline"><span className="run-eyebrow">THE NIGHT RUN</span><span>도전 {run.lives}/3 · {Math.floor(run.elapsedMs / 60000)}분 플레이</span></div>
      <ol className="run-route" aria-label="런 진행 경로">{RUN_STAGES.map((s,i) => <li key={s.name} aria-current={i === run.stage ? 'step' : undefined} className={i === run.stage ? 'current' : i < run.stage ? 'past' : ''}><span>{String(i+1).padStart(2,'0')}</span><small>{s.ai}</small></li>)}</ol>
      <div className="run-topline"><h2>{stage.pitcher}</h2><span>{run.stage+1} / 6</span></div>
      <div className="run-objective"><strong>{run.points}<small> / {stage.target}루</small></strong><span>타석 {run.pa} / {RUN_PA_PER_STAGE}<br/>안타·볼넷 1 / 2루타 2 / 홈런 4</span></div>
      <div className="run-progress" role="progressbar" aria-label="라운드 목표" aria-valuemin={0} aria-valuemax={stage.target} aria-valuenow={Math.min(stage.target,run.points)}><i style={{width:`${Math.min(100,run.points/stage.target*100)}%`}}/></div>
      {run.status === 'playing' ? <>
        <div className="run-count" aria-label="투구 카운트">BALL <b>{run.balls}</b> STRIKE <b>{run.strikes}</b><span>이번 타석 {run.paPitches}/12구</span></div>
        <p className="run-hint">{stage.hint}</p>
        <details className="run-notebook"><summary>투수 관찰 노트 · {run.history.length}구 / 내 최근 선택</summary><p>내 선택: {run.aims.slice(-8).map(z=>RUN_ZONE_NAMES[z]).join(' → ') || '아직 없음'}</p><div>{run.history.slice(-12).reverse().map((p,i)=><span key={i}>R{p.stage+1} · {p.balls}-{p.strikes} → {p.zone === 9 ? '볼' : RUN_ZONE_NAMES[p.zone]}</span>)}</div></details>
        <button className="run-text-button" onClick={onExit}>저장하고 나가기</button>
      </> : <div className="run-intermission">
        {run.status === 'intro' && <>
          <div className="run-eyebrow">ROUND {run.stage+1} · {stage.name}</div>
          <h3>{run.stage === 5 ? '이제, 마지막 승부.' : '이번 상대를 기억하세요.'}</h3><p>{stage.hint}</p>
          <p>8타석에서 {stage.target}루를 모으세요. 목표 미달은 도전 기회 1 소모. {run.stage === 5 ? '최종전 목표 미달은 런 종료입니다.' : '도전 기회가 남으면 다음 상대에게 진출합니다.'}</p>
          <p>시작 4숙련존 · 카드가 없으면 격자를 눌러 BASIC SWING. 12구까지 승부가 이어지면 끈기 보상으로 볼넷입니다.</p>
          <button className="run-primary" onClick={onStart}>타석에 들어서기 →</button>
        </>}
        {run.status === 'atbat' && <>
          <div className="run-eyebrow">AT BAT {run.pa} / 8</div><h3>{labels[run.lastOutcome]}</h3>
          <p>{Math.max(0,stage.target-run.points) ? `목표까지 ${stage.target-run.points}루. 다음 타석에서 승부를 이어가세요.` : '목표 달성. 남은 타석은 다음 상대를 위한 관찰 기회입니다.'}</p>
          <button className="run-primary" onClick={onContinue}>{run.pa === 8 ? '라운드 결과 확인 →' : '다음 타석 →'}</button>
        </>}
        {run.status === 'reward' && <>
          <div className="run-eyebrow">CLUBHOUSE / 선택은 하나</div><h3>{run.results.at(-1)?.cleared ? '다음 승부를 준비하자.' : '아직, 승부는 끝나지 않았다.'}</h3>
          <p>{run.results.at(-1)?.cleared ? '목표 달성. 다음 상대를 위한 보상을 고르세요.' : '목표 미달로 도전 기회를 1 소모했습니다. 회복하거나 덱을 성장시키세요.'}</p>
          <div className="run-rewards">{runRewardOptions(run).map(c=><button key={c.id} onClick={()=>onReward(c.id)}><strong>{c.title}</strong><span>{c.detail}</span><b>선택 →</b></button>)}</div>
        </>}
        {terminal && <>
          <div className="run-eyebrow">{run.status === 'won' ? 'NIGHT RUN / CHAMPION' : 'NIGHT RUN / FINISHED'}</div><h3>{run.status === 'won' ? '마지막 투수를 읽어냈다.' : '다음에는, 내가 읽는다.'}</h3>
          <p>{run.status === 'won' ? '최종전 목표 달성. 쇼다운 런 우승!' : run.lives === 0 ? '도전 기회를 모두 소모했습니다.' : '최종전 목표에 도달하지 못했습니다.'}</p>
          <div className="run-stats"><span><b>{run.pitches}</b>투구</span><span><b>{run.hits}</b>안타</span><span><b>{run.homeRuns}</b>홈런</span><span><b>{run.deepReads}</b>DEEP READ</span></div>
          <ul>{run.results.map(r=><li key={r.stage}>{RUN_STAGES[r.stage].pitcher} · {r.points}/{RUN_STAGES[r.stage].target}루 · {r.cleared ? '승리' : '미달'}</li>)}</ul>
          <button className="run-primary" onClick={onRestart}>새 런 시작 →</button>
        </>}
        <p className="run-deck-summary">숙련 {new Set(run.deck.filter(c=>c.kind==='zone').map(c=>c.zone)).size}존 · 덱 {run.deck.length}장{run.rewards.length ? ` · ${run.rewards.join(' / ')}` : ''}</p>
        <button className="run-text-button" onClick={onExit}>{terminal ? '메뉴로' : '저장하고 나가기'}</button>
      </div>}
    </>}
    {error && <div role="alert" className="run-error">{error}<button onClick={onRetrySave}>저장 다시 시도</button></div>}
  </section>;
}
