import React,{useEffect,useRef} from 'react';

export default function PitcherPortraitDialog({opponent,src,onClose}){
  const closeRef=useRef(null);
  useEffect(()=>{closeRef.current?.focus()},[]);
  if(!opponent||!src)return null;
  const name=opponent.name||'상대 투수';
  return <div className="pitcher-portrait-backdrop" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
    <section className="pitcher-portrait-dialog" role="dialog" aria-modal="true" aria-label={`${name} 투수 큰 그림`} onKeyDown={e=>{
      if(e.key==='Escape'){e.stopPropagation();onClose()}
      if(e.key==='Tab'){e.preventDefault();closeRef.current?.focus()}
    }}>
      <header><div><span>9ZONE / PITCHER PORTRAIT</span><h2>{name}</h2></div><button ref={closeRef} type="button" aria-label="큰 그림 닫기" onClick={onClose}>닫기 ×</button></header>
      <div className="pitcher-portrait-frame"><img src={src} alt={`${name} 투수 전신 원화`}/></div>
    </section>
  </div>;
}