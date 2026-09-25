import React from 'react';
import stadium from '../../assets/duel/stadium.png';
import './ballpark.css';

/* V13 BALLPARK BP-5 — the end of a run. Players said the old screen had "too many strange options":
   a stats line, the path list, a cause chain and three buttons. Now: who stopped you, three numbers,
   one button to go again, one to leave. */
export default function BallparkEnd({won=false,pitcher=null,portrait=null,cleared=0,hits=0,pitches=0,onAgain,onTitle,onInspect}){
  return <main className={'bp-stop bp-end'+(won?' won':'')} aria-label={won?'런 완주':'런 종료'}>
    <div className="bp-bar"><span>{won?'완주':'경기 종료'}</span><span/></div>
    <header className="bp-shead" style={{'--bp-sky':`url(${stadium})`}}>
      {portrait&&<button type="button" className="bp-sport" aria-label={pitcher?.name+' 초상 크게 보기'} onClick={e=>onInspect?.(pitcher,e)}><img alt="" src={portrait}/></button>}
      <div className="bp-stitle"><h1>{won?'마지막 마운드까지.':'쓰리 아웃.'}</h1>
        <p>{won?'모든 투수를 끌어내렸다.':pitcher?`${pitcher.name}에게 막혔다. HP ${pitcher.hp} 남았다.`:'여기까지.'}</p></div>
    </header>
    <dl className="bp-endstats">
      <div><dt>지나온 곳</dt><dd>{cleared}</dd></div>
      <div><dt>안타</dt><dd>{hits}</dd></div>
      <div><dt>던진 공</dt><dd>{pitches}</dd></div>
    </dl>
    <div className="bp-verbs stop">
      <button type="button" className="bp-verb go" data-testid="bp-end-again" onClick={onAgain}>다시 도전</button>
      <button type="button" className="bp-verb wait" onClick={onTitle}>타이틀</button>
    </div>
  </main>;
}
