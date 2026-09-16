import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {MAP_CTA,MAP_DEAD_END,MAP_EMPTY,MAP_HINT,nodeType,useReducedMotion} from './v10-copy.js';
import './v10-ui.css';

const MAX_PER_ROW=4;
const depthOf=node=>Number(node?.depth??node?.act??0)||0;

function layout(nodes){
  const list=Array.isArray(nodes)?nodes:[];
  const depths=[...new Set(list.map(depthOf))].sort((a,b)=>a-b);
  const rows=[];
  for(const depth of depths){
    const layer=list.filter(node=>depthOf(node)===depth);
    for(let i=0;i<layer.length;i+=MAX_PER_ROW)rows.push({depth,items:layer.slice(i,i+MAX_PER_ROW)});
  }
  const spots=new Map();
  rows.forEach((row,r)=>row.items.forEach((node,c)=>spots.set(node.id,{
    x:(c+.5)/row.items.length*100,y:(r+.5)/Math.max(1,rows.length)*100,row:r,col:c,
  })));
  return {rows,spots};
}

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
    const row=rows[from.row+dRow];
    if(dRow){
      if(!row)return;
      const target=row.items[Math.min(from.col,row.items.length-1)];
      if(target){moved.current=true;setCursorId(target.id)}
      return;
    }
    const target=rows[from.row]?.items[from.col+dCol];
    if(target){moved.current=true;setCursorId(target.id)}
  },[rows,spots]);

  const onKeyDown=(event,id)=>{
    const keys={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};
    const move=keys[event.key];
    if(!move)return;
    event.preventDefault();
    step(id,move[0],move[1]);
  };

  const pick=node=>{
    if(!reachable.has(node.id))return;
    setCursorId(node.id);
    setPreviewId(node.id);
  };

  const preview=previewId?byId.get(previewId):null;
  const previewType=preview?nodeType(preview.type):null;
  const nextLabels=preview?(edges||[]).filter(edge=>edge.from===preview.id).map(edge=>{
    const node=byId.get(edge.to);
    return node?node.label||nodeType(node.type).title:edge.to;
  }):[];

  return (
    <section className={`v10-map${reduced?' v10-reduced':''}`} data-reduced={reduced?'true':'false'} aria-label="경로 지도">
      <div className="v10-map-board">
        <svg className="v10-map-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          {(edges||[]).map(edge=>{
            const a=spots.get(edge.from),b=spots.get(edge.to);
            if(!a||!b)return null;
            const live=reachable.has(edge.to)&&edge.from===currentNodeId;
            return <line key={`${edge.from}-${edge.to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={live?'v10-edge v10-edge-live':'v10-edge'}/>;
          })}
        </svg>
        <div className="v10-map-rows" role="group" aria-describedby="v10-map-hint">
          {rows.map((row,r)=>(
            <div className="v10-map-row" key={`row-${r}`} data-depth={row.depth} style={{gridTemplateColumns:`repeat(${row.items.length},1fr)`}}>
              {row.items.map(node=>{
                const type=nodeType(node.type),open=reachable.has(node.id),here=node.id===currentNodeId;
                return (
                  <button
                    key={node.id}
                    type="button"
                    ref={element=>{element?refs.current.set(node.id,element):refs.current.delete(node.id)}}
                    className={`v10-node v10-node-${node.type||'unknown'}${open?' is-open':' is-locked'}${here?' is-here':''}${previewId===node.id?' is-picked':''}`}
                    data-testid={`v10-node-${node.id}`}
                    data-type={node.type}
                    aria-disabled={open?undefined:'true'}
                    aria-current={here?'step':undefined}
                    aria-pressed={previewId===node.id}
                    tabIndex={cursor===node.id?0:-1}
                    onClick={()=>pick(node)}
                    onFocus={()=>setCursorId(node.id)}
                    onKeyDown={event=>onKeyDown(event,node.id)}
                  >
                    <span className="v10-node-type">{type.label}</span>
                    <strong className="v10-node-name">{node.label||type.title}</strong>
                    {here&&<em className="v10-node-here">지금 여기</em>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <aside className="v10-map-preview" data-testid="v10-map-preview">
        <p className="v10-map-hint" id="v10-map-hint">{MAP_HINT}</p>
        {preview?(
          <>
            <span className="v10-preview-type">{previewType.label}</span>
            <h3 className="v10-preview-name">{preview.label||previewType.title}</h3>
            <dl className="v10-preview-lines">
              <div><dt>보상</dt><dd data-testid="v10-preview-reward">{preview.reward||previewType.reward}</dd></div>
              <div><dt>위험</dt><dd data-testid="v10-preview-risk">{preview.risk||previewType.risk}</dd></div>
              <div><dt>이후 경로</dt><dd data-testid="v10-preview-next">{nextLabels.length?nextLabels.join(' · '):MAP_DEAD_END}</dd></div>
            </dl>
            <button type="button" className="v10-map-cta" data-testid="v10-map-cta" onClick={()=>onSelect?.(preview.id)}>{MAP_CTA}</button>
          </>
        ):<p className="v10-preview-empty" data-testid="v10-preview-empty">{MAP_EMPTY}</p>}
      </aside>
    </section>
  );
}
