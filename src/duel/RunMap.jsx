import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {MAP_CTA,MAP_DEAD_END,MAP_EMPTY,MAP_HINT,MAP_LOCKED,MAP_NEXT_ACT,actDelta,actLabel,actRange,actStats,actToggleLabel,nodeDetail,nodeSpeech,nodeType,useReducedMotion} from './v10-copy.js';
import './v10-ui.css';

const MAX_PER_ROW=4;
const EDGE_TRIM=.29;
const int=value=>Number.isInteger(Number(value))?Number(value):null;

const MAP_ART={
  battle:'ball',
  elite:'comet',
  training:'target',
  locker:'book',
  shop:'spark',
  rest:'moon',
  boss:'diamond',
};
const PIXEL_PATHS={
  ball:'M10 5H22L27 10V22L22 27H10L5 22V10ZM10 10V22H12V10ZM20 10V22H22V10Z',
  comet:'M3 5L19 11L25 11L29 15V23L23 29H15L11 25L9 17ZM15 17V23H23V17Z',
  target:'M5 5H27V27H5ZM9 9V23H23V9ZM13 13H19V19H13Z',
  book:'M4 7H14L16 9L18 7H28V25H18L16 27L14 25H4Z',
  spark:'M18 2L6 19H14L12 30L27 12H18Z',
  moon:'M15 3H21L17 7V17L23 23H29L25 28H13L5 20V10L10 5Z',
  diamond:'M16 3L29 16L16 29L3 16ZM16 9L9 16L16 23L23 16Z',
};

function MapIcon({type}){
  const art=MAP_ART[type]||'ball';
  return <svg className="v10-map-icon" viewBox="0 0 32 32" aria-hidden="true" shapeRendering="crispEdges">
    <path fill="currentColor" fillRule="evenodd" d={PIXEL_PATHS[art]}/>
  </svg>;
}

const ZONE_HEAT={
  outside:[2,5,8],
  sinker:[6,7,8],
  high:[0,1,2],
  closer:[0,2,4,6,8],
};
function ZoneFingerprint({opponent,compact=false}){
  if(!opponent)return null;
  const hot=new Set(ZONE_HEAT[opponent.archetypeKey]||[4]);
  return <span className={compact?'v10-zone-fingerprint is-compact':'v10-zone-fingerprint'} aria-label={`${opponent.archetype||'투수'} 주요 승부 존`}>
    {Array.from({length:9},(_,i)=><i key={i} className={hot.has(i)?'hot':''}/>)}
  </span>;
}

function PixelDiorama({type,opponent}){
  const hostile=type==='elite'||type==='boss';
  return <svg className="v10-diorama-art" viewBox="0 0 96 58" aria-hidden="true" shapeRendering="crispEdges">
    <rect x="0" y="0" width="96" height="58" fill="none"/>
    {type==='battle'&&<>
      <rect x="4" y="35" width="88" height="3" className="px-ground"/>
      <rect x="9" y="22" width="18" height="11" className="px-stand"/><rect x="69" y="22" width="18" height="11" className="px-stand"/>
      <rect x="13" y="19" width="10" height="2" className="px-light"/><rect x="73" y="19" width="10" height="2" className="px-light"/>
      <rect x="45" y="27" width="6" height="9" className="px-player"/><rect x="42" y="31" width="3" height="2" className="px-player"/>
      <rect x="20" y="41" width="56" height="2" className="px-dirt"/><rect x="46" y="40" width="4" height="4" transform="rotate(45 48 42)" className="px-base"/>
    </>}
    {type==='elite'&&<>
      <rect x="3" y="36" width="90" height="3" className="px-ground"/>
      <rect x="5" y="14" width="22" height="18" className="px-stand hostile"/><rect x="69" y="14" width="22" height="18" className="px-stand hostile"/>
      <rect x="10" y="9" width="12" height="3" className="px-danger"/><rect x="74" y="9" width="12" height="3" className="px-danger"/>
      <rect x="45" y="20" width="7" height="15" className="px-player hostile"/><rect x="40" y="24" width="5" height="3" className="px-player hostile"/>
      <rect x="17" y="42" width="62" height="2" className="px-dirt"/><rect x="46" y="41" width="4" height="4" transform="rotate(45 48 43)" className="px-base"/>
      <rect x="28" y="5" width="40" height="4" className="px-danger dim"/>
    </>}
    {type==='training'&&<>
      <rect x="13" y="12" width="70" height="33" className="px-cage"/><path d="M18 16v25M29 16v25M40 16v25M51 16v25M62 16v25M73 16v25M16 21h64M16 29h64M16 37h64" className="px-net"/>
      <rect x="65" y="21" width="10" height="10" className="px-target"/><rect x="68" y="24" width="4" height="4" className="px-target-core"/>
      <rect x="29" y="27" width="5" height="13" className="px-player"/><rect x="34" y="25" width="16" height="3" transform="rotate(-32 34 25)" className="px-bat"/>
      <rect x="8" y="46" width="80" height="3" className="px-ground"/>
    </>}
    {type==='locker'&&<>
      <rect x="12" y="12" width="19" height="34" className="px-locker"/><rect x="33" y="12" width="19" height="34" className="px-locker"/><rect x="54" y="12" width="19" height="34" className="px-locker"/>
      <rect x="17" y="18" width="9" height="2" className="px-metal"/><rect x="38" y="18" width="9" height="2" className="px-metal"/><rect x="59" y="18" width="9" height="2" className="px-metal"/>
      <rect x="24" y="30" width="2" height="2" className="px-light"/><rect x="45" y="30" width="2" height="2" className="px-light"/><rect x="66" y="30" width="2" height="2" className="px-light"/>
      <rect x="20" y="48" width="56" height="4" className="px-bench"/>
    </>}
    {type==='shop'&&<>
      <rect x="9" y="14" width="78" height="34" className="px-shop"/>
      <rect x="14" y="20" width="68" height="3" className="px-shelf"/><rect x="14" y="33" width="68" height="3" className="px-shelf"/>
      <rect x="20" y="13" width="3" height="18" transform="rotate(22 20 13)" className="px-bat"/><rect x="29" y="13" width="3" height="18" transform="rotate(22 29 13)" className="px-bat"/>
      <rect x="49" y="25" width="9" height="7" className="px-glove"/><rect x="64" y="25" width="10" height="6" className="px-gear"/>
      <rect x="24" y="38" width="16" height="8" className="px-box"/><rect x="55" y="39" width="18" height="7" className="px-box"/>
    </>}
    {type==='rest'&&<>
      <rect x="7" y="36" width="82" height="3" className="px-ground"/><rect x="18" y="31" width="47" height="5" className="px-bench"/><rect x="23" y="36" width="3" height="9" className="px-bench"/><rect x="58" y="36" width="3" height="9" className="px-bench"/>
      <rect x="70" y="26" width="12" height="17" className="px-cooler"/><rect x="72" y="29" width="8" height="3" className="px-light"/>
      <path d="M76 6h7c-6 3-8 10-4 16-8-1-12-10-7-16z" className="px-moon"/>
      <rect x="13" y="12" width="2" height="2" className="px-star"/><rect x="26" y="7" width="2" height="2" className="px-star"/><rect x="57" y="13" width="2" height="2" className="px-star"/>
    </>}
    {type==='boss'&&<>
      <rect x="4" y="9" width="88" height="35" className="px-scoreboard hostile"/>
      <rect x="9" y="14" width="78" height="5" className="px-danger"/>
      <rect x="12" y="23" width="24" height="15" className="px-board-cell"/><rect x="60" y="23" width="24" height="15" className="px-board-cell"/>
      <rect x="44" y="22" width="8" height="17" className="px-player hostile"/><rect x="38" y="26" width="6" height="3" className="px-player hostile"/>
      <rect x="30" y="48" width="36" height="3" className="px-gold"/><rect x="45" y="43" width="6" height="6" transform="rotate(45 48 46)" className="px-base"/>
      <rect x="19" y="5" width="58" height="2" className="px-gold dim"/>
    </>}
    {hostile&&<rect x="2" y="53" width="92" height="2" className="px-danger dim"/>}
  </svg>;
}

const depthOf=node=>{
  const depth=int(node?.depth);if(depth!==null)return depth;
  const act=int(node?.act),row=int(node?.row);
  if(act!==null&&row!==null)return act*100+row;
  return act??row??0;
};
const actOf=node=>int(node?.act);
const nodeName=node=>node?.label||node?.name||null;

function layoutAct(items){
  const depths=[...new Set(items.map(depthOf))].sort((a,b)=>a-b);
  const laned=items.length>0&&items.every(node=>int(node?.lane)!==null);
  const lanes=laned?Math.max(...items.map(node=>int(node.lane)))+1:0;
  const rows=[];
  for(const depth of depths){
    const layer=items.filter(node=>depthOf(node)===depth);
    if(lanes>0&&lanes<=MAX_PER_ROW){rows.push({depth,lanes,items:layer});continue;}
    for(let i=0;i<layer.length;i+=MAX_PER_ROW)rows.push({depth,lanes:0,items:layer.slice(i,i+MAX_PER_ROW)});
  }
  const spots=new Map();
  rows.forEach((r,rowIndex)=>r.items.forEach((node,index)=>{
    const slots=r.lanes||r.items.length,col=r.lanes?int(node.lane):index;
    spots.set(node.id,{x:(col+.5)/slots*100,y:(rowIndex+.5)/Math.max(1,rows.length)*100,row:rowIndex,col});
  }));
  return {rows,spots};
}

function buildActs(nodes){
  const list=Array.isArray(nodes)?nodes:[];
  const keys=[...new Set(list.map(actOf))].sort((a,b)=>(a??0)-(b??0));
  const built=keys.map(key=>{
    const items=list.filter(node=>actOf(node)===key);
    return {key,...layoutAct(items),items,stats:actStats(items)};
  });
  const base=built[0]?.stats||null;
  for(const act of built)act.delta=actDelta(act.stats,base);
  return built;
}

function trim(a,b,rowCount){
  const dx=b.x-a.x,dy=b.y-a.y,span=Math.abs(dy);
  if(!span)return {x1:a.x,y1:a.y,x2:b.x,y2:b.y};
  const k=Math.min(.42,EDGE_TRIM*(100/Math.max(1,rowCount))/span);
  return {x1:a.x+dx*k,y1:a.y+dy*k,x2:b.x-dx*k,y2:b.y-dy*k};
}
function roadPath(a,b,rowCount){
  const p=trim(a,b,rowCount),mid=(p.y1+p.y2)/2;
  return `M ${p.x1} ${p.y1} C ${p.x1} ${mid}, ${p.x2} ${mid}, ${p.x2} ${p.y2}`;
}

export default function RunMap({nodes=[],edges=[],currentNodeId=null,reachableIds=[],onSelect,redRushPortrait=null}){
  const reduced=useReducedMotion();
  const acts=useMemo(()=>buildActs(nodes),[nodes]);
  const reachable=useMemo(()=>new Set(reachableIds||[]),[reachableIds]);
  const byId=useMemo(()=>new Map((nodes||[]).map(node=>[node.id,node])),[nodes]);
  const multiAct=acts.length>1&&acts.every(act=>act.key!==null);
  const currentAct=actOf(byId.get(currentNodeId))??acts[0]?.key??null;

  const [flipped,setFlipped]=useState(()=>new Set());
  const [previewId,setPreviewId]=useState(null);
  const [cursorId,setCursorId]=useState(null);
  const [departingId,setDepartingId]=useState(null);
  const refs=useRef(new Map());
  const moved=useRef(false);
  const departTimer=useRef(null);

  const liveActs=useMemo(()=>{
    const keys=new Set();
    const currentKey=actOf(byId.get(currentNodeId));
    if(currentKey!==null)keys.add(currentKey);
    for(const id of reachable){const key=actOf(byId.get(id));if(key!==null)keys.add(key)}
    if(!keys.size&&acts[0])keys.add(acts[0].key);
    return keys;
  },[acts,byId,currentNodeId,reachable]);
  const isOpen=useCallback(key=>!multiAct||liveActs.has(key)!==flipped.has(key),[multiAct,liveActs,flipped]);
  const toggleAct=key=>setFlipped(prev=>{
    const next=new Set(prev);
    next.has(key)?next.delete(key):next.add(key);
    return next;
  });

  const visible=useMemo(()=>acts.filter(act=>isOpen(act.key)),[acts,isOpen]);
  const order=useMemo(()=>visible.flatMap(act=>act.rows.flatMap(row=>row.items.map(node=>node.id))),[visible]);
  const cursor=order.includes(cursorId)?cursorId:(order.includes(currentNodeId)?currentNodeId:order[0]||null);

  useEffect(()=>{
    if(!moved.current||!cursor)return;
    moved.current=false;
    refs.current.get(cursor)?.focus();
  },[cursor]);
  useEffect(()=>()=>{if(departTimer.current)clearTimeout(departTimer.current)},[]);

  const go=id=>{moved.current=true;setCursorId(id)};
  const move=useCallback((act,fromId,key)=>{
    const from=act.spots.get(fromId);if(!from)return;
    const seatsOf=row=>row.items.map(node=>({id:node.id,col:act.spots.get(node.id)?.col??0})).sort((a,b)=>a.col-b.col);
    if(key==='Home'||key==='End'){
      const seats=seatsOf(act.rows[from.row]);
      return go((key==='Home'?seats[0]:seats[seats.length-1]).id);
    }
    const step=key==='ArrowUp'?-1:key==='ArrowDown'?1:0;
    if(step){
      const row=act.rows[from.row+step];if(!row)return;
      const seats=seatsOf(row);
      return go(seats.reduce((best,seat)=>Math.abs(seat.col-from.col)<Math.abs(best.col-from.col)?seat:best,seats[0]).id);
    }
    const dir=key==='ArrowRight'?1:-1;
    const target=seatsOf(act.rows[from.row]).filter(seat=>dir>0?seat.col>from.col:seat.col<from.col).sort((a,b)=>dir>0?a.col-b.col:b.col-a.col)[0];
    if(target)go(target.id);
  },[]);

  const onKeyDown=(event,act,id)=>{
    if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    move(act,id,event.key);
  };
  const look=id=>{if(departingId)return;setCursorId(id);setPreviewId(id)};
  const confirmRoute=()=>{
    if(!previewOpen||departingId)return;
    setDepartingId(preview.id);
    departTimer.current=setTimeout(()=>onSelect?.(preview.id),680);
  };

  const activePreviewId=previewId&&byId.has(previewId)?previewId:(reachableIds?.[0]||currentNodeId||null);
  const preview=activePreviewId?byId.get(activePreviewId):null;
  const previewType=preview?nodeType(preview.type):null;
  const previewDetail=preview?nodeDetail(preview,previewType):null;
  const previewOpen=!!preview&&reachable.has(preview.id);
  const nextLabels=preview?(edges||[]).filter(edge=>edge.from===preview.id).map(edge=>{
    const node=byId.get(edge.to);
    return node?nodeName(node)||nodeType(node.type).title:edge.to;
  }):[];

  return (
    <section className={`v10-map${reduced?' v10-reduced':''}${departingId?' is-travelling':''}`} data-reduced={reduced?'true':'false'} aria-label="경로 지도">
      <div className="v10-map-board">
        <div className="v10-map-skyline" aria-hidden="true"><i/><i/><i/><i/><i/></div>
        {acts.map((act,actIndex)=>{
          const open=isOpen(act.key),last=actIndex===acts.length-1;
          return (
            <div className={`v10-act${open?' is-open':' is-shut'}`} key={`act-${act.key??'all'}`} data-act={act.key??undefined}>
              {multiAct&&(
                <button
                  type="button"
                  className="v10-act-bar"
                  data-testid={`v10-act-${act.key}`}
                  aria-expanded={open}
                  aria-label={actToggleLabel(act.key,open)}
                  onClick={()=>toggleAct(act.key)}
                >
                  <span className="v10-act-number">0{act.key}</span>
                  <span className="v10-act-name">{actLabel(act.key)}</span>
                  <small className="v10-act-count">{act.key===currentAct?'NOW PLAYING · ':''}{act.items.length} STOPS{actRange(act.stats)?' · '+actRange(act.stats):''}</small>
                  {act.delta&&<em className="v10-act-step" data-testid={`v10-act-step-${act.key}`}>{act.delta}</em>}
                  <em className="v10-act-toggle">{open?'−':'+'}</em>
                </button>
              )}
              {open&&(
                <div className="v10-act-body">
                  <svg className="v10-map-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                    <defs>
                      <filter id={`road-glow-${act.key??'all'}`}><feGaussianBlur stdDeviation=".7" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                    </defs>
                    {(edges||[]).map(edge=>{
                      const a=act.spots.get(edge.from),b=act.spots.get(edge.to);
                      if(!a||!b)return null;
                      const live=reachable.has(edge.to)&&edge.from===currentNodeId;
                      return <g key={`${edge.from}-${edge.to}`} className={live?'v10-road is-live':'v10-road'}>
                        <path d={roadPath(a,b,act.rows.length)} className="v10-edge-shadow"/>
                        <path d={roadPath(a,b,act.rows.length)} className={live?'v10-edge v10-edge-live':'v10-edge'} filter={live?`url(#road-glow-${act.key??'all'})`:undefined}/>
                      </g>;
                    })}
                  </svg>
                  <div className="v10-map-rows">
                    {act.rows.map((row,r)=>(
                      <div className="v10-map-row" key={`row-${r}`} data-depth={row.depth} data-lanes={row.lanes||row.items.length} style={{gridTemplateColumns:`repeat(${row.lanes||row.items.length},1fr)`}}>
                        {row.items.map(node=>{
                          const type=nodeType(node.type),name=nodeName(node)||type.title,detail=nodeDetail(node,type);
                          const canGo=reachable.has(node.id),here=node.id===currentNodeId,picked=activePreviewId===node.id;
                          return (
                            <button
                              key={node.id}
                              type="button"
                              ref={element=>{element?refs.current.set(node.id,element):refs.current.delete(node.id)}}
                              className={`v10-node v10-node-${node.type||'unknown'}${canGo?' is-open':' is-locked'}${here?' is-here':''}${picked?' is-picked':''}${departingId===node.id?' is-departing':''}`}
                              data-testid={`v10-node-${node.id}`}
                              data-type={node.type}
                              data-route={node.route||undefined}
                              aria-disabled={canGo?undefined:'true'}
                              aria-current={here?'step':undefined}
                              aria-describedby={`${node.id}-speech`}
                              tabIndex={cursor===node.id?0:-1}
                              onClick={()=>look(node.id)}
                              onFocus={()=>look(node.id)}
                              onKeyDown={event=>onKeyDown(event,act,node.id)}
                              style={row.lanes?{gridColumn:int(node.lane)+1}:undefined}
                            >
                              {detail.route&&<span className="v10-node-route" data-testid={`v10-node-route-${node.id}`}>{detail.route}</span>}
                              <span className="v10-node-scene">
                                <span className="v10-node-glow" aria-hidden="true"/>
                                <PixelDiorama type={node.type} opponent={node.opponent}/>
                                {node.opponent&&<ZoneFingerprint opponent={node.opponent} compact/>}
                                <span className="v10-scene-emblem"><MapIcon type={node.type}/></span>
                                {here&&<em className="v10-node-here">YOU</em>}
                              </span>
                              <span className="v10-node-copy">
                                <span className="v10-node-type">{type.label}</span>
                                <strong className="v10-node-name">{name}</strong>
                                {detail.badge&&<span className="v10-node-badge" data-testid={`v10-node-badge-${node.id}`}>{detail.badge}</span>}
                              </span>
                              <span className="v10-sr-only" id={`${node.id}-speech`}>{nodeSpeech({name,route:detail.route,sub:detail.badge,reward:detail.reward,risk:detail.risk},canGo)}</span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {multiAct&&!last&&<p className="v10-act-link" aria-hidden="true"><i/>{MAP_NEXT_ACT}<i/></p>}
            </div>
          );
        })}
      </div>
      <aside className="v10-map-preview" data-testid="v10-map-preview">
        <div className="v10-preview-scoreline"><span>SCOUTING REPORT</span><b>{previewDetail?.route||'NEXT STOP'}</b></div>
        <p className="v10-map-hint" id="v10-map-hint">{MAP_HINT}</p>
        <div className="v10-preview-live" aria-live="polite">
          {preview?(
            <>
              <div className={`v10-preview-diorama v10-preview-diorama-${preview.type}`}>
                <PixelDiorama type={preview.type} opponent={preview.opponent}/>
                {preview.opponent?.artId==="regular-01-red-rush"&&redRushPortrait&&<img className="v10-preview-red-rush-art" src={redRushPortrait} alt="레드 러시 투수 전신 원화"/>}
                {preview.opponent&&<ZoneFingerprint opponent={preview.opponent}/>}
                <span className="v10-preview-emblem"><MapIcon type={preview.type}/></span>
              </div>
              <span className="v10-preview-type">{previewType.label}</span>
              <h3 className="v10-preview-name" data-testid="v10-preview-name">{nodeName(preview)||previewType.title}</h3>
              {previewDetail.facing&&<p className="v10-preview-facing" data-testid="v10-preview-facing">{previewDetail.facing}</p>}
              {previewDetail.why&&<p className="v10-preview-why" data-testid="v10-preview-why">{previewDetail.why}</p>}
              <dl className="v10-preview-lines">
                <div><dt>보상</dt><dd data-testid="v10-preview-reward">{previewDetail.reward}</dd></div>
                <div><dt>위험</dt><dd data-testid="v10-preview-risk">{previewDetail.risk}</dd></div>
                <div><dt>이후</dt><dd data-testid="v10-preview-next">{nextLabels.length?nextLabels.join(' · '):MAP_DEAD_END}</dd></div>
              </dl>
              {previewOpen
                ?<button type="button" className="v10-map-cta primary" data-testid="v10-map-cta" disabled={!!departingId} onClick={confirmRoute}><span>{departingId?'원정 출발 중':'이 원정으로 간다'}</span><b aria-hidden="true">→</b></button>
                :<p className="v10-preview-locked" data-testid="v10-preview-locked">{MAP_LOCKED}</p>}
            </>
          ):<div className="v10-preview-empty" data-testid="v10-preview-empty">
            <span className="v10-empty-diamond"><MapIcon type="battle"/></span>
            <strong>{MAP_EMPTY}</strong>
            <small>노드를 누르면 상대·보상·위험이 전광판처럼 펼쳐집니다.</small>
          </div>}
        </div>
      </aside>
    </section>
  );
}
