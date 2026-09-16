import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {MAP_CTA,MAP_DEAD_END,MAP_EMPTY,MAP_HINT,nodeType,useReducedMotion} from './v10-copy.js';
import './v10-ui.css';

const MAX_PER_ROW=4;
const int=value=>Number.isInteger(Number(value))?Number(value):null;
const depthOf=node=>{
  const depth=int(node?.depth);if(depth!==null)return depth;
  const act=int(node?.act),row=int(node?.row);
  if(act!==null&&row!==null)return act*100+row;
  return act??row??0;
};
const nodeName=node=>node?.label||node?.name||null;
const combat=node=>['battle','elite','boss'].includes(node?.type);
const actTitle=act=>act===1?'1막 · 개막 원정':act===2?'2막 · 승부처':act===3?'3막 · 포스트시즌':null;

function NodeGlyph({type}){
  const common={viewBox:'0 0 48 48','aria-hidden':'true',focusable:'false',className:'v10-node-glyph'};
  if(type==='battle')return <svg {...common}><circle cx="24" cy="24" r="14"/><path d="M14 18c4 2 6 6 6 12M34 18c-4 2-6 6-6 12"/><path d="M13 14l-4 20M35 14l4 20"/></svg>;
  if(type==='elite')return <svg {...common}><path d="M24 5l5.2 10.5 11.6 1.7-8.4 8.1 2 11.5L24 31.4l-10.4 5.4 2-11.5-8.4-8.1 11.6-1.7z"/><path d="M18 25l4 4 8-10"/></svg>;
  if(type==='training')return <svg {...common}><circle cx="24" cy="24" r="15"/><circle cx="24" cy="24" r="8"/><circle cx="24" cy="24" r="2.5"/><path d="M8 40L39 9"/><path d="M33 8l7 1-1 7"/></svg>;
  if(type==='locker')return <svg {...common}><rect x="11" y="7" width="26" height="34" rx="3"/><path d="M24 7v34M15 14h5M28 14h5M19 29h2M27 29h2"/><circle cx="21" cy="29" r="1"/><circle cx="27" cy="29" r="1"/></svg>;
  if(type==='shop')return <svg {...common}><path d="M10 18h28l-3 22H13z"/><path d="M16 18c0-7 3-11 8-11s8 4 8 11"/><path d="M19 29h10M24 24v10"/></svg>;
  if(type==='rest')return <svg {...common}><path d="M32 8c-9 2-14 9-12 18 2 7 8 11 16 10-4 5-11 7-17 4-8-4-11-14-7-22 4-7 12-11 20-10z"/><path d="M31 13l2 4 4 .6-3 3 .8 4-3.8-2-3.8 2 .8-4-3-3 4-.6z"/></svg>;
  if(type==='boss')return <svg {...common}><path d="M10 18l7 6 7-15 7 15 7-6-3 20H13z"/><path d="M14 38h20"/><circle cx="24" cy="28" r="5"/><path d="M20 27c2 1 3 3 3 6M28 27c-2 1-3 3-3 6"/></svg>;
  return <svg {...common}><circle cx="24" cy="24" r="15"/><path d="M24 15v10M24 32h.01"/></svg>;
}

function layout(nodes){
  const list=Array.isArray(nodes)?nodes:[];
  const depths=[...new Set(list.map(depthOf))].sort((a,b)=>a-b);
  const laned=list.length>0&&list.every(node=>int(node?.lane)!==null);
  const lanes=laned?Math.max(...list.map(node=>int(node.lane)))+1:0;
  const rows=[];
  for(const depth of depths){
    const layer=list.filter(node=>depthOf(node)===depth);
    if(lanes>0&&lanes<=MAX_PER_ROW){rows.push({depth,lanes,items:layer});continue;}
    for(let i=0;i<layer.length;i+=MAX_PER_ROW)rows.push({depth,lanes:0,items:layer.slice(i,i+MAX_PER_ROW)});
  }
  const spots=new Map();
  rows.forEach((row,r)=>row.items.forEach((node,c)=>{
    const slots=row.lanes||row.items.length,col=row.lanes?int(node.lane):c;
    spots.set(node.id,{x:(col+.5)/slots*100,y:(r+.5)/Math.max(1,rows.length)*100,row:r,col});
  }));
  return {rows,spots};
}

const curve=(a,b)=>{
  const mid=(a.y+b.y)/2;
  return `M ${a.x} ${a.y} C ${a.x} ${mid}, ${b.x} ${mid}, ${b.x} ${b.y}`;
};

export default function RunMap({nodes=[],edges=[],currentNodeId=null,reachableIds=[],onSelect}){
  const reduced=useReducedMotion();
  const {rows,spots}=useMemo(()=>layout(nodes),[nodes]);
  const reachable=useMemo(()=>new Set(reachableIds||[]),[reachableIds]);
  const byId=useMemo(()=>new Map((nodes||[]).map(node=>[node.id,node])),[nodes]);
  const [previewId,setPreviewId]=useState(null);
  const [cursorId,setCursorId]=useState(null);
  const refs=useRef(new Map());
  const moved=useRef(false);

  const order=useMemo(()=>rows.flatMap(row=>row.items.map(node=>node.id)),[rows]);
  const cursor=order.includes(cursorId)?cursorId:(order.includes(currentNodeId)?currentNodeId:order[0]||null);

  useEffect(()=>{
    if(!moved.current||!cursor)return;
    moved.current=false;
    refs.current.get(cursor)?.focus();
  },[cursor]);

  const step=useCallback((fromId,dRow,dCol)=>{
    const from=spots.get(fromId);if(!from)return;
    const row=rows[from.row+dRow];if(!row)return;
    const seats=row.items.map(node=>({id:node.id,col:spots.get(node.id)?.col??0}));
    const target=dRow
      ?seats.reduce((best,seat)=>Math.abs(seat.col-from.col)<Math.abs(best.col-from.col)?seat:best,seats[0])
      :seats.filter(seat=>dCol>0?seat.col>from.col:seat.col<from.col)
        .sort((a,b)=>dCol>0?a.col-b.col:b.col-a.col)[0];
    if(target){moved.current=true;setCursorId(target.id)}
  },[rows,spots]);

  const onKeyDown=(event,id)=>{
    const keys={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};
    const move=keys[event.key];if(!move)return;
    event.preventDefault();step(id,move[0],move[1]);
  };

  const pick=node=>{
    if(!reachable.has(node.id))return;
    setCursorId(node.id);setPreviewId(node.id);
  };

  const preview=previewId?byId.get(previewId):null;
  const previewType=preview?nodeType(preview.type):null;
  const nextLabels=preview?(edges||[]).filter(edge=>edge.from===preview.id).map(edge=>{
    const node=byId.get(edge.to);
    return node?(node.opponent?.name||nodeName(node)||nodeType(node.type).title):edge.to;
  }):[];
  const actMarkers=useMemo(()=>{
    const seen=new Set(),out=[];
    rows.forEach((row,index)=>{
      const act=int(row.items[0]?.act);
      if(act!==null&&!seen.has(act)){seen.add(act);out.push({act,index,label:actTitle(act)});}
    });
    return out;
  },[rows]);

  return (
    <section className={`v10-map${reduced?' v10-reduced':''}`} data-reduced={reduced?'true':'false'} aria-label="경로 지도">
      <header className="v10-map-hero">
        <div>
          <span className="v10-map-kicker">ROAD TO THE SHOW</span>
          <h2>이번 런의 운명을 고른다</h2>
          <p>쉬운 길은 숨을 돌리게 하고, 위험한 길은 덱을 폭발시킨다.</p>
        </div>
        <div className="v10-map-legend" aria-label="지도 범례">
          <span><i className="safe"/>정비</span><span><i className="fight"/>승부</span><span><i className="danger"/>강적</span>
        </div>
      </header>
      <div className="v10-map-shell">
        <div className="v10-map-board" style={{'--v10-row-count':Math.max(rows.length,1)}}>
          <div className="v10-stadium-lights" aria-hidden="true"><i/><i/><i/><i/></div>
          {actMarkers.map(({act,index,label})=><div key={act} className="v10-act-stamp" style={{top:`calc((${index} + .08) / var(--v10-row-count) * 100%)`}}><span>{label}</span></div>)}
          <svg className="v10-map-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="v10-road" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#7b8d87"/><stop offset="1" stopColor="#41544f"/></linearGradient>
              <linearGradient id="v10-road-live" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#fff1a8"/><stop offset=".52" stopColor="#ffc94f"/><stop offset="1" stopColor="#ef8e39"/></linearGradient>
              <filter id="v10-road-glow"><feGaussianBlur stdDeviation=".7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            {(edges||[]).map(edge=>{
              const a=spots.get(edge.from),b=spots.get(edge.to);if(!a||!b)return null;
              const live=reachable.has(edge.to)&&edge.from===currentNodeId;
              return <g key={`${edge.from}-${edge.to}`} className={live?'v10-edge-group is-live':'v10-edge-group'}>
                <path d={curve(a,b)} className="v10-edge-shadow"/>
                <path d={curve(a,b)} className={live?'v10-edge v10-edge-live':'v10-edge'}/>
              </g>;
            })}
          </svg>
          <div className="v10-map-rows" role="group" aria-describedby="v10-map-hint">
            {rows.map((row,r)=>(
              <div className="v10-map-row" key={`row-${r}`} data-depth={row.depth} style={{gridTemplateColumns:`repeat(${row.lanes||row.items.length},1fr)`}}>
                {row.items.map(node=>{
                  const type=nodeType(node.type),open=reachable.has(node.id),here=node.id===currentNodeId,picked=previewId===node.id;
                  const display=node.opponent?.name||nodeName(node)||type.title;
                  const meta=node.opponent?`${node.opponent.archetype||'상대 투수'} · HP ${node.opponent.maxHp??'?'}`:node.utility?.effect||node.preview||type.title;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      ref={element=>{element?refs.current.set(node.id,element):refs.current.delete(node.id)}}
                      className={`v10-node v10-node-${node.type||'unknown'}${open?' is-open':' is-locked'}${here?' is-here':''}${picked?' is-picked':''}`}
                      data-testid={`v10-node-${node.id}`}
                      data-type={node.type}
                      aria-label={`${type.label} · ${display} · ${meta}`}
                      aria-disabled={open?undefined:'true'}
                      aria-current={here?'step':undefined}
                      aria-pressed={picked}
                      tabIndex={cursor===node.id?0:-1}
                      onClick={()=>pick(node)}
                      onFocus={()=>setCursorId(node.id)}
                      onKeyDown={event=>onKeyDown(event,node.id)}
                      style={row.lanes?{gridColumn:int(node.lane)+1}:undefined}
                    >
                      <span className="v10-node-aura" aria-hidden="true"/>
                      <span className="v10-node-emblem"><NodeGlyph type={node.type}/>{combat(node)&&<span className="v10-seam" aria-hidden="true"/>}</span>
                      <span className="v10-node-copy">
                        <span className="v10-node-type">{type.label}</span>
                        <strong className="v10-node-name">{display}</strong>
                        <span className="v10-node-meta">{meta}</span>
                      </span>
                      {node.routeLabel&&<span className="v10-route-tag">{node.routeLabel}</span>}
                      {here&&<em className="v10-node-here"><span/>현재 위치</em>}
                      {open&&!here&&<em className="v10-node-ready">선택 가능</em>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <aside className="v10-map-preview" data-testid="v10-map-preview">
          <div className="v10-preview-topline"><span>SCOUTING REPORT</span><b>{preview?.routeLabel||'NEXT MOVE'}</b></div>
          <p className="v10-map-hint" id="v10-map-hint">{MAP_HINT}</p>
          {preview?(
            <>
              <div className={`v10-preview-crest v10-preview-${preview.type}`}><NodeGlyph type={preview.type}/></div>
              <span className="v10-preview-type">{previewType.label}</span>
              <h3 className="v10-preview-name">{preview.opponent?.name||nodeName(preview)||previewType.title}</h3>
              {(preview.opponent||preview.utility)&&<div className="v10-preview-chips">
                {preview.opponent?.maxHp&&<span><small>HP</small>{preview.opponent.maxHp}</span>}
                {preview.opponent?.archetype&&<span><small>성향</small>{preview.opponent.archetype}</span>}
                {preview.utility?.effect&&<span><small>효과</small>{preview.utility.effect}</span>}
              </div>}
              <p className="v10-preview-scout">{preview.opponent?.threat||preview.utility?.detail||preview.preview||'다음 선택이 런의 흐름을 바꿉니다.'}</p>
              <dl className="v10-preview-lines">
                <div><dt>보상</dt><dd data-testid="v10-preview-reward">{preview.reward||previewType.reward}</dd></div>
                <div><dt>위험</dt><dd data-testid="v10-preview-risk">{preview.risk||previewType.risk}</dd></div>
                <div><dt>이후</dt><dd data-testid="v10-preview-next">{nextLabels.length?nextLabels.join(' · '):MAP_DEAD_END}</dd></div>
              </dl>
              <button type="button" className="v10-map-cta" data-testid="v10-map-cta" onClick={()=>onSelect?.(preview.id)}>
                <span>{MAP_CTA}</span><b aria-hidden="true">→</b>
              </button>
            </>
          ):<div className="v10-preview-empty" data-testid="v10-preview-empty"><div className="v10-empty-diamond" aria-hidden="true"/><strong>{MAP_EMPTY}</strong><span>빛나는 노드를 눌러 상대와 보상을 먼저 읽어보세요.</span></div>}
        </aside>
      </div>
    </section>
  );
}
