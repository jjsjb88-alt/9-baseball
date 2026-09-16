import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {MAP_CTA,MAP_DEAD_END,MAP_EMPTY,MAP_HINT,MAP_LOCKED,MAP_NEXT_ACT,actLabel,actToggleLabel,nodeDetail,nodeSpeech,nodeType,useReducedMotion} from './v10-copy.js';
import './v10-ui.css';

const MAX_PER_ROW=4;
/* 줄 높이 대비 노드가 차지하는 비율의 절반. 연결선을 이만큼 물려서 노드 밑으로 지나가지 않게 한다. */
const EDGE_TRIM=.38;

const int=value=>Number.isInteger(Number(value))?Number(value):null;
/* 엔진 지도는 층을 act(1~3) + row(0~4)로 쪼개 준다. 둘 다 있으면 합쳐서 한 줄로 편다. */
const depthOf=node=>{
  const depth=int(node?.depth);if(depth!==null)return depth;
  const act=int(node?.act),row=int(node?.row);
  if(act!==null&&row!==null)return act*100+row;
  return act??row??0;
};
const actOf=node=>int(node?.act);
const nodeName=node=>node?.label||node?.name||null;

/* 한 막 안에서만 줄과 칸을 센다. 막마다 제 SVG를 쓰므로 접힌 막이 좌표를 흔들지 않는다. */
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
  return keys.map(key=>{
    const items=list.filter(node=>actOf(node)===key);
    return {key,...layoutAct(items),items};
  });
}

/* 노드 중심끼리 이은 선을 양 끝에서 물려 잘라 노드 상자 밖에서만 보이게 한다. */
function trim(a,b,rowCount){
  const dx=b.x-a.x,dy=b.y-a.y,span=Math.abs(dy);
  if(!span)return {x1:a.x,y1:a.y,x2:b.x,y2:b.y};
  const k=Math.min(.45,EDGE_TRIM*(100/Math.max(1,rowCount))/span);
  return {x1:a.x+dx*k,y1:a.y+dy*k,x2:b.x-dx*k,y2:b.y-dy*k};
}

export default function RunMap({nodes=[],edges=[],currentNodeId=null,reachableIds=[],onSelect}){
  const reduced=useReducedMotion();
  const acts=useMemo(()=>buildActs(nodes),[nodes]);
  const reachable=useMemo(()=>new Set(reachableIds||[]),[reachableIds]);
  const byId=useMemo(()=>new Map((nodes||[]).map(node=>[node.id,node])),[nodes]);
  const multiAct=acts.length>1&&acts.every(act=>act.key!==null);
  const currentAct=actOf(byId.get(currentNodeId))??acts[0]?.key??null;

  const [flipped,setFlipped]=useState(()=>new Set());
  const [previewId,setPreviewId]=useState(null);
  const [cursorId,setCursorId]=useState(null);
  const refs=useRef(new Map());
  const moved=useRef(false);

  /* 기본은 지금 있는 막만 편다. flipped는 사람이 그 기본을 뒤집은 막이다. */
  const isOpen=useCallback(key=>!multiAct||(key===currentAct)!==flipped.has(key),[multiAct,currentAct,flipped]);
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

  const go=id=>{moved.current=true;setCursorId(id)};

  /* lane이 있는 지도는 배열 순서와 칸 번호가 다르다. 이동은 항상 칸 번호로 센다. */
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

  /* 어느 칸이든 미리 보게 둔다. 갈 수 있는지는 CTA가 정한다. */
  const look=id=>{setCursorId(id);setPreviewId(id)};

  const preview=previewId?byId.get(previewId):null;
  const previewType=preview?nodeType(preview.type):null;
  const previewDetail=preview?nodeDetail(preview,previewType):null;
  const previewOpen=!!preview&&reachable.has(preview.id);
  const nextLabels=preview?(edges||[]).filter(edge=>edge.from===preview.id).map(edge=>{
    const node=byId.get(edge.to);
    return node?nodeName(node)||nodeType(node.type).title:edge.to;
  }):[];

  return (
    <section className={`v10-map${reduced?' v10-reduced':''}`} data-reduced={reduced?'true':'false'} aria-label="경로 지도">
      <div className="v10-map-board">
        {acts.map((act,actIndex)=>{
          const open=isOpen(act.key);
          const last=actIndex===acts.length-1;
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
                  <span className="v10-act-name">{actLabel(act.key)}</span>
                  <small className="v10-act-count">{act.items.length}칸{act.key===currentAct?' · 지금 이 막':''}</small>
                  <em className="v10-act-toggle">{open?'접기':'펼치기'}</em>
                </button>
              )}
              {open&&(
                <div className="v10-act-body">
                  <svg className="v10-map-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                    {(edges||[]).map(edge=>{
                      const a=act.spots.get(edge.from),b=act.spots.get(edge.to);
                      if(!a||!b)return null;
                      const live=reachable.has(edge.to)&&edge.from===currentNodeId;
                      const cut=trim(a,b,act.rows.length);
                      return <line key={`${edge.from}-${edge.to}`} {...cut} className={live?'v10-edge v10-edge-live':'v10-edge'}/>;
                    })}
                  </svg>
                  <div className="v10-map-rows">
                    {act.rows.map((row,r)=>(
                      <div className="v10-map-row" key={`row-${r}`} data-depth={row.depth} data-lanes={row.lanes||row.items.length} style={{gridTemplateColumns:`repeat(${row.lanes||row.items.length},1fr)`}}>
                        {row.items.map(node=>{
                          const type=nodeType(node.type),name=nodeName(node)||type.title,detail=nodeDetail(node,type);
                          const canGo=reachable.has(node.id),here=node.id===currentNodeId;
                          return (
                            <button
                              key={node.id}
                              type="button"
                              ref={element=>{element?refs.current.set(node.id,element):refs.current.delete(node.id)}}
                              className={`v10-node v10-node-${node.type||'unknown'}${canGo?' is-open':' is-locked'}${here?' is-here':''}${previewId===node.id?' is-picked':''}`}
                              data-testid={`v10-node-${node.id}`}
                              data-type={node.type}
                              aria-disabled={canGo?undefined:'true'}
                              aria-current={here?'step':undefined}
                              aria-describedby={`${node.id}-speech`}
                              tabIndex={cursor===node.id?0:-1}
                              onClick={()=>look(node.id)}
                              onFocus={()=>look(node.id)}
                              onKeyDown={event=>onKeyDown(event,act,node.id)}
                              style={row.lanes?{gridColumn:int(node.lane)+1}:undefined}
                            >
                              <span className="v10-node-head">
                                <span className="v10-node-type">{type.label}</span>
                                {detail.route&&<span className="v10-node-route" data-testid={`v10-node-route-${node.id}`}>{detail.route}</span>}
                              </span>
                              <strong className="v10-node-name">{name}</strong>
                              {detail.badge&&<span className="v10-node-badge" data-testid={`v10-node-badge-${node.id}`}>{detail.badge}</span>}
                              {here&&<em className="v10-node-here">지금 여기</em>}
                              <span className="v10-sr-only" id={`${node.id}-speech`}>{nodeSpeech({name,route:detail.route,sub:detail.badge,reward:detail.reward,risk:detail.risk},canGo)}</span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {multiAct&&!last&&<p className="v10-act-link" aria-hidden="true">{MAP_NEXT_ACT}</p>}
            </div>
          );
        })}
      </div>
      <aside className="v10-map-preview" data-testid="v10-map-preview">
        <p className="v10-map-hint" id="v10-map-hint">{MAP_HINT}</p>
        <div className="v10-preview-live" aria-live="polite">
          {preview?(
            <>
              <span className="v10-preview-type">{previewType.label}{previewDetail.route?` · ${previewDetail.route}`:''}</span>
              <h3 className="v10-preview-name" data-testid="v10-preview-name">{nodeName(preview)||previewType.title}</h3>
              <dl className="v10-preview-lines">
                {previewDetail.facing&&<div><dt>상대</dt><dd data-testid="v10-preview-facing">{previewDetail.facing}</dd></div>}
                <div><dt>보상</dt><dd data-testid="v10-preview-reward">{previewDetail.reward}</dd></div>
                <div><dt>위험</dt><dd data-testid="v10-preview-risk">{previewDetail.risk}</dd></div>
                <div><dt>이후 경로</dt><dd data-testid="v10-preview-next">{nextLabels.length?nextLabels.join(' · '):MAP_DEAD_END}</dd></div>
              </dl>
              {previewDetail.why&&<p className="v10-preview-why" data-testid="v10-preview-why">{previewDetail.why}</p>}
              {previewOpen
                ?<button type="button" className="v10-map-cta" data-testid="v10-map-cta" onClick={()=>onSelect?.(preview.id)}>{MAP_CTA}</button>
                :<p className="v10-preview-locked" data-testid="v10-preview-locked">{MAP_LOCKED}</p>}
            </>
          ):<p className="v10-preview-empty" data-testid="v10-preview-empty">{MAP_EMPTY}</p>}
        </div>
      </aside>
    </section>
  );
}
