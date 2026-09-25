import React,{useLayoutEffect,useRef,useState} from 'react';
import './zone-links.css';

/*
 * V12 P3-2 — order links drawn on the 9ZONE itself (contract C2).
 * One mark per stackPlan.links entry, in order, connected or broken exactly as the engine decided
 * (v11StackZonesConnect) — never inferred from touching corners or overlapping cover.
 *   connected → solid line between the two aim-zone centres
 *   broken    → dashed line with a visible gap in the middle (line language, not only colour)
 *   same zone → a ring on that cell, so a same-zone link never disappears
 * Positions come from the rendered cells, so every layout (portrait, landscape, desktop) lines up.
 * Decorative for assistive tech; the same facts are in a visually hidden summary.
 */
const CIRCLED=['①','②','③','④','⑤'];
const GAP=12;

export function linkSummary(links){
  if(!links?.length)return '';
  return '순서 연결 · '+links.map(l=>CIRCLED[l.fromOrder-1]+'→'+CIRCLED[l.toOrder-1]+' '+(l.fromZone===l.toZone?'같은 존 ':'')+(l.connected?'연결':'끊김')).join(' · ');
}

// endpoints are the order tokens (①②…) when they are on the board, else the aim-zone centres
export function linkGeometry(links,centres,tokens={}){
  return (links||[]).map(l=>{
    const a=l.fromZone===l.toZone?centres[l.fromZone]:tokens[l.fromOrder]||centres[l.fromZone],b=l.fromZone===l.toZone?centres[l.toZone]:tokens[l.toOrder]||centres[l.toZone];
    if(!a||!b)return null;
    if(l.fromZone===l.toZone)return {kind:'ring',link:l,connected:l.connected,cx:a.x,cy:a.y};
    if(l.connected)return {kind:'line',link:l,connected:true,x1:a.x,y1:a.y,x2:b.x,y2:b.y};
    const len=Math.hypot(b.x-a.x,b.y-a.y)||1,ux=(b.x-a.x)/len,uy=(b.y-a.y)/len,mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    return {kind:'gap',link:l,connected:false,parts:[
      {x1:a.x,y1:a.y,x2:mx-ux*GAP,y2:my-uy*GAP},
      {x1:mx+ux*GAP,y1:my+uy*GAP,x2:b.x,y2:b.y},
    ]};
  }).filter(Boolean);
}

function measure(svg){
  const grid=svg?.parentElement;if(!grid)return null;
  const box=grid.getBoundingClientRect(),cells=[...grid.querySelectorAll(':scope > .zone-cell, :scope > .bp-cell')];
  if(cells.length!==9)return null;
  const tokens={};
  for(const t of grid.querySelectorAll('.zone-card-token[data-board-order], .bp-token[data-board-order]')){const r=(t.querySelector('i')||t).getBoundingClientRect();if(r.width)tokens[t.dataset.boardOrder]={x:r.left-box.left+r.width/2,y:r.top-box.top+r.height/2};}
  return {w:box.width,h:box.height,tokens,centres:cells.map(c=>{const r=c.getBoundingClientRect();return {x:r.left-box.left+r.width/2,y:r.top-box.top+r.height/2};})};
}

export default function ZoneLinks({links}){
  const ref=useRef(null),[frame,setFrame]=useState(null);
  const key=(links||[]).map(l=>l.fromZone+'-'+l.toZone+(l.connected?'c':'b')).join('|');
  useLayoutEffect(()=>{
    const svg=ref.current;if(!svg)return;
    const update=()=>setFrame(measure(svg));
    update();
    const RO=typeof ResizeObserver!=='undefined'?ResizeObserver:null;
    const ro=RO?new RO(update):null;ro?.observe(svg.parentElement);
    // the order tokens are placed by the direct-tap layer after React renders
    const MO=typeof MutationObserver!=='undefined'?MutationObserver:null;
    const mo=MO?new MO(ms=>{if(ms.some(m=>[...m.addedNodes,...m.removedNodes].some(n=>(n.classList?.contains('zone-card-token')||n.classList?.contains('bp-token')))))update();}):null;
    mo?.observe(svg.parentElement,{childList:true,subtree:true});
    return ()=>{ro?.disconnect();mo?.disconnect();};
  },[key]);
  if(!links?.length)return null;
  const centres=frame?.centres||Array.from({length:9},()=>({x:0,y:0}));
  const marks=linkGeometry(links,centres,frame?.tokens);
  return <>
    <svg ref={ref} className="zone-links" aria-hidden="true" focusable="false" width={frame?.w||0} height={frame?.h||0} viewBox={'0 0 '+(frame?.w||1)+' '+(frame?.h||1)}>
      {marks.map((m,i)=>{
        const common={key:i,'data-link':m.link.fromOrder+'-'+m.link.toOrder,'data-connected':m.connected?'1':'0'};
        if(m.kind==='ring')return <circle {...common} className="zone-link-ring" cx={m.cx} cy={m.cy} r={Math.max(14,Math.min(frame?.w||0,frame?.h||0)/9)}/>;
        if(m.kind==='line')return <line {...common} className="zone-link" x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2}/>;
        return <g {...common} className="zone-link">{m.parts.map((p,j)=><line key={j} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}/>)}</g>;
      })}
    </svg>
    <span className="zone-links-summary sr-only" role="status">{linkSummary(links)}</span>
  </>;
}
