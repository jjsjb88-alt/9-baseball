import React,{useEffect,useMemo,useState} from 'react';
import {hpTicks} from './ballpark-copy.js';
import stadium from '../../assets/duel/stadium.png';
import './ballpark.css';

/* V13 BALLPARK BP-3 — the run map (docs/design/v13/BALLPARK.md).
   One act at a time. Pitchers are black silhouettes, the places you can go now glow, a tap shows
   the colour portrait and one line below (phones) or to the right (landscape/desktop).
   Same data and entry as the legacy RunMap: selectV10Map(s) and onEnter(id). */

const FIGHTS=new Set(['battle','elite','boss']);
const TAG={battle:'정규전',elite:'강적',boss:'막 보스',locker:'라커룸',training:'타격 훈련',shop:'장비 상점',rest:'휴식일'};
const REWARD={battle:'이기면 카드 3장 중 1장',elite:'이기면 카드 4장 중 1장 · 시그니처',boss:'이기면 다음 막 · 시그니처'};
const PLACE={locker:'손에 안 붙는 배트는 두고 간다.',training:'카드 한 장을 단련한다.',shop:'새 카드를 들인다.',rest:'하루 쉰다. 다음 경기 타격 +8.'};
const HABIT={outside:'바깥쪽을 좋아한다.',sinker:'낮게, 더 낮게.',high:'높은 공으로 띄운다.',closer:'네가 노린 반대쪽을 찌른다.'};
/* 7×7 pixel glyphs for the places that are not fights */
const GLYPH={
  locker:['.......','.#####.','.#...#.','.#..##.','.#...#.','.#####.','.......'],
  training:['......#','.....#.','....#..','...#...','..#....','.#.....','#......'],
  shop:['.......','..###..','.#...#.','#######','#.....#','#######','.......'],
  rest:['..###..','.##....','##.....','##.....','##.....','.##....','..###..'],
};
const Glyph=({type})=><span className="bp-mglyph" aria-hidden="true">{(GLYPH[type]||GLYPH.rest).join('').split('').map((c,i)=><i key={i} className={c==='#'?'on':''}/>)}</span>;

function useLandscape(){
  const q='(orientation: landscape)';
  const [on,setOn]=useState(()=>typeof window!=='undefined'&&!!window.matchMedia?.(q).matches);
  useEffect(()=>{const m=window.matchMedia?.(q);if(!m)return;const f=()=>setOn(m.matches);m.addEventListener?.('change',f);return()=>m.removeEventListener?.('change',f);},[]);
  return on;
}

export default function BallparkMap({nodes=[],edges=[],currentNodeId=null,reachableIds=[],completedIds=[],deckCount=0,relicCount=0,portraits={},onEnter,onInspect}){
  const wide=useLandscape();
  const reach=useMemo(()=>new Set(reachableIds),[reachableIds]),done=useMemo(()=>new Set(completedIds),[completedIds]);
  const byId=useMemo(()=>new Map(nodes.map(n=>[n.id,n])),[nodes]);
  const act=byId.get(reachableIds[0])?.act??byId.get(currentNodeId)?.act??nodes[0]?.act??1;
  const here=nodes.filter(n=>n.act===act);
  const rows=Math.max(1,...here.map(n=>n.row+1)),lanes=Math.max(1,...here.map(n=>(n.lane??0)+1));
  const pos=n=>{const a=((n.lane??0)+.5)/lanes,b=rows>1?n.row/(rows-1):.5;return wide?{x:7+b*86,y:12+a*80}:{x:6+a*88,y:10+b*80};};
  const [pick,setPick]=useState(null);
  const chosen=byId.get(pick)||byId.get(reachableIds[0])||here[0];
  const later=[...new Set(nodes.map(n=>n.act))].filter(k=>k>act).map(k=>{
    const hp=nodes.filter(n=>n.act===k&&n.opponent).map(n=>n.opponent.maxHp);
    return {k,lo:Math.min(...hp),hi:Math.max(...hp)};
  });
  const first=!completedIds.length;
  const actMax=Math.max(1,...here.map(n=>n.opponent?.maxHp||0));

  const sheet=d=>{
    if(!d)return null;
    const fight=FIGHTS.has(d.type),o=d.opponent,art=o&&portraits[o.artId],can=reach.has(d.id);
    return <>
      <div className="bp-mpor">{art?<button type="button" className="bp-mpor-btn" aria-label={o.name+' 초상 크게 보기'} onClick={e=>onInspect?.(o,e)}><img alt="" src={art}/></button>:<Glyph type={d.type}/>}</div>
      <div className="bp-minfo">
        <span className="bp-mtag">{TAG[d.type]||d.name}</span>
        <strong className="bp-mname">{fight?o?.name:TAG[d.type]||d.name}</strong>
        <em className="bp-mline">{fight?HABIT[o?.archetypeKey]||o?.archetype:PLACE[d.type]||d.reward}</em>
        {fight&&o&&<span className="bp-mhp" aria-label={'HP '+o.maxHp}>{Array.from({length:12},(_,i)=><i key={i} className={i<hpTicks(o.maxHp,actMax)?'':'lost'}/>)}<b>HP {o.maxHp}</b></span>}
        {fight&&<span className="bp-mrw">{REWARD[d.type]}</span>}
      </div>
      <button type="button" className="bp-mgo" data-testid="bp-map-go" disabled={!can} onClick={()=>onEnter?.(d.id)}>{!can?(done.has(d.id)?'지나온 곳':'아직 길이 없다'):fight?'이 구장으로 간다':'들른다'}</button>
    </>;
  };

  return <main className={'bp-map'+(wide?' wide':'')} aria-label="원정 지도">
    <div className="bp-bar"><span>{act}막</span><span>덱 <b>{deckCount}</b>{relicCount?<> · 유물 <b>{relicCount}</b></>:null}</span></div>
    <div className="bp-mbody">
      <div className="bp-mleft">
        <header className="bp-mhead" style={{'--bp-sky':`url(${stadium})`}}>
          <h1>{first?'어느 마운드부터 무너뜨릴까.':'다음 마운드.'}</h1>
        </header>
        <div className="bp-route">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {edges.filter(e=>byId.get(e.from)?.act===act&&byId.get(e.to)?.act===act).map(e=>{const a=pos(byId.get(e.from)),c=pos(byId.get(e.to));
              const live=(done.has(e.from)||e.from===currentNodeId)&&reach.has(e.to);
              return <line key={e.from+e.to} className={live?'live':''} x1={a.x} y1={a.y} x2={c.x} y2={c.y}/>;})}
          </svg>
          {here.map(n=>{const p=pos(n),o=n.opponent,art=o&&portraits[o.artId];
            return <button key={n.id} type="button" className={'bp-node '+n.type+(reach.has(n.id)?' reach':'')+(done.has(n.id)?' done':'')+(chosen?.id===n.id?' sel':'')}
              style={{left:p.x+'%',top:p.y+'%'}} aria-label={(TAG[n.type]||n.name)+(o?' '+o.name:'')+(reach.has(n.id)?' · 갈 수 있음':'')} aria-pressed={chosen?.id===n.id}
              data-node={n.id} onClick={()=>setPick(n.id)}>
              {FIGHTS.has(n.type)&&art?<img className="bp-fig" alt="" src={art}/>:<Glyph type={n.type}/>}
              <em>{o?o.name:TAG[n.type]||n.name}</em>
            </button>;})}
        </div>
        {!!later.length&&<p className="bp-acts">{later.map(l=><span key={l.k}>{l.k}막 · 투수 HP {l.lo}~{l.hi}</span>)}</p>}
      </div>
      <aside className="bp-msheet" aria-live="polite">{sheet(chosen)}</aside>
    </div>
  </main>;
}
