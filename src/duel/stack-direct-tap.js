import './stack-direct-tap.css';
import './act23-deckbuilding-ui.js';

/*
 * V10 swing input is intentionally implemented as a direct-manipulation layer over
 * the existing React stack contract. The engine still receives one MAIN card plus
 * up to three supports; the player no longer has to understand that data model.
 *
 * Interaction contract:
 *   hand card -> 9-zone board -> SWING
 * - tap a card, then tap a zone
 * - or drag a card directly onto a zone
 * - first placed card is the effect card; later cards automatically become cover
 * - tapping a placed support token removes it; tapping the first token arms it to move
 */
const ATTACK_CARD_SELECTOR='.duel-hand .duel-card.attack';
const STACKABLE_CARD_SELECTOR='.duel-hand .duel-card.attack:not(.basic-card)';
const DRAG_START=9;
const DAMAGE_RATES=[100,80,65,50];
const normalize=s=>(s||'').replace(/\s+/g,' ').trim();
const cardName=el=>normalize(el?.querySelector('strong')?.textContent);
const isUsable=card=>!!card&&!card.disabled&&!card.classList.contains('unavailable');
const raf2=fn=>requestAnimationFrame(()=>requestAnimationFrame(fn));

function swingDrawer(root=document){return root.querySelector('.card-drawer[aria-label="스윙 카드 선택"]');}
function zonePanel(root=document){return root.querySelector('.zone-panel[aria-label="9존 타격 계획"]');}
function zoneCells(root=document){return [...(zonePanel(root)?.querySelectorAll('.zone-grid .zone-cell')||[])];}
function handCards(drawer){return [...drawer.querySelectorAll(ATTACK_CARD_SELECTOR)];}
function stackableCards(drawer){return [...drawer.querySelectorAll(STACKABLE_CARD_SELECTOR)];}
function candidateButtons(drawer){return [...drawer.querySelectorAll('.stack-candidates > button')];}
function supportSlots(drawer){return [...drawer.querySelectorAll('.stack-slot.support')];}
function mainCard(drawer){return drawer.querySelector(`${ATTACK_CARD_SELECTOR}.selected`);}
function occurrenceIndex(items,item,name){return items.filter(x=>cardName(x)===name).indexOf(item);}
function candidateFor(drawer,card){
  if(!card||card.classList.contains('basic-card'))return null;
  const main=mainCard(drawer),name=cardName(card);if(!name)return null;
  const sameHand=stackableCards(drawer).filter(x=>x!==main&&cardName(x)===name);
  const sameCandidates=candidateButtons(drawer).filter(x=>cardName(x)===name);
  const index=occurrenceIndex(sameHand,card,name);
  return sameCandidates[Math.max(0,index)]||sameCandidates[0]||null;
}
function cardForCandidate(drawer,candidate){
  if(!candidate)return null;
  const main=mainCard(drawer),name=cardName(candidate);if(!name)return null;
  const sameCandidates=candidateButtons(drawer).filter(x=>cardName(x)===name);
  const sameHand=stackableCards(drawer).filter(x=>x!==main&&cardName(x)===name);
  const index=Math.max(0,sameCandidates.indexOf(candidate));
  return sameHand[index]||sameHand[0]||null;
}
function supportSlotFor(drawer,card){
  const candidate=candidateFor(drawer,card);if(!candidate?.classList.contains('picked'))return null;
  const picked=candidateButtons(drawer).filter(x=>x.classList.contains('picked'));
  return supportSlots(drawer)[picked.indexOf(candidate)]||null;
}
function zoneIndexFromSlot(slot,root=document){
  const text=normalize(slot?.querySelector('small')?.textContent).split(' · ')[0];
  if(!text)return -1;
  return zoneCells(root).findIndex(cell=>normalize(cell.getAttribute('aria-label'))===text);
}
function assignments(drawer,root=document){
  const cells=zoneCells(root),main=mainCard(drawer),rows=[];
  if(main&&cells.length){
    const zone=Math.max(0,cells.findIndex(c=>c.getAttribute('aria-pressed')==='true'));
    rows.push({order:1,role:'main',card:main,zone});
  }
  const picked=candidateButtons(drawer).filter(x=>x.classList.contains('picked'));
  const slots=supportSlots(drawer);
  picked.forEach((candidate,i)=>{
    const card=cardForCandidate(drawer,candidate),zone=zoneIndexFromSlot(slots[i],root);
    if(card&&zone>=0)rows.push({order:i+2,role:'support',card,candidate,zone});
  });
  return rows;
}
function boardGuide(panel){
  let el=panel?.querySelector('.zone-card-board-guide');if(el)return el;
  if(!panel)return null;
  el=document.createElement('div');el.className='zone-card-board-guide';el.setAttribute('role','status');
  el.innerHTML='<div class="zone-board-copy"><span>PLACE CARDS</span><strong></strong><small></small></div><div class="zone-board-rate" aria-label="카드 수별 HP 피해 효율"></div>';
  const grid=panel.querySelector('.zone-grid');grid?.parentNode?.insertBefore(el,grid);return el;
}
function setGuide(drawer,panel,armed=null){
  const guide=boardGuide(panel);if(!guide)return;
  const placed=assignments(drawer,document),count=placed.length,baseRate=DAMAGE_RATES[Math.max(0,count-1)]||50;
  const liveRate=Number.parseInt(normalize(drawer.querySelector('.stack-efficiency b')?.textContent),10);
  const rate=Number.isFinite(liveRate)?liveRate:baseRate;
  const strong=guide.querySelector('strong'),small=guide.querySelector('small'),strip=guide.querySelector('.zone-board-rate');
  if(armed){
    strong.textContent=`${cardName(armed)} → 놓을 존을 탭하세요`;
    small.textContent='다른 카드는 잠기지 않습니다 · 바로 다른 카드로 바꿔도 됩니다.';
    guide.classList.add('armed');
  }else{
    guide.classList.remove('armed');
    strong.textContent=count?`${count}장 배치 · HP 피해 ${rate}%`:'카드를 9존에 직접 놓으세요';
    small.textContent=count?'첫 카드 효과 + 추가 카드 커버 · 더 놓거나 바로 스윙':'탭 → 존 탭, 또는 카드를 존까지 드래그 · 최대 4장';
  }
  strip.innerHTML=DAMAGE_RATES.map((n,i)=>{const shown=count===i+1?rate:n;return `<i class="${count===i+1?'current':''}"><b>${i+1}</b><span>${shown}%</span></i>`;}).join('');
}
function clearTokens(root=document){
  zoneCells(root).forEach(cell=>{cell.querySelector('.zone-card-token-layer')?.remove();cell.classList.remove('board-has-card');});
}
function renderTokens(drawer,root=document){
  clearTokens(root);const cells=zoneCells(root);
  assignments(drawer,root).forEach(row=>{
    const cell=cells[row.zone];if(!cell)return;
    let layer=cell.querySelector('.zone-card-token-layer');
    if(!layer){layer=document.createElement('span');layer.className='zone-card-token-layer';layer.setAttribute('aria-hidden','true');cell.appendChild(layer);}
    const token=document.createElement('span');token.className=`zone-card-token ${row.role}`;
    token.dataset.boardOrder=String(row.order);token.dataset.boardRole=row.role;
    token.innerHTML=`<i>${row.order}</i><b>${cardName(row.card)}</b><em>${row.role==='main'?'↔':'×'}</em>`;
    layer.appendChild(token);cell.classList.add('board-has-card');
  });
}
function markCards(drawer,root=document,armed=null){
  const placed=assignments(drawer,root);
  handCards(drawer).forEach(card=>{
    card.classList.remove('board-card-armed','board-placed-source');
    card.removeAttribute('data-board-action');card.removeAttribute('data-board-order');
    const row=placed.find(x=>x.card===card);
    if(row){
      card.classList.add('board-placed-source');card.dataset.boardOrder=String(row.order);
      card.dataset.boardAction=row.role==='main'?'1 · 효과 카드':'✓ 존에 배치됨';
    }else card.dataset.boardAction=isUsable(card)?'＋ 존에 놓기':'사용 불가';
    if(card===armed)card.classList.add('board-card-armed');
  });
}
function refresh(drawer,root=document,armed=null){
  const panel=zonePanel(root);if(!drawer||!panel)return;
  drawer.classList.add('zone-card-board');panel.classList.add('zone-card-board-active');
  panel.classList.toggle('board-empty',!mainCard(drawer));panel.classList.toggle('board-targeting',!!armed);
  markCards(drawer,root,armed);renderTokens(drawer,root);setGuide(drawer,panel,armed);
}
function safeClick(el,state){
  if(!el)return false;state.bypass=true;
  try{el.click();}finally{state.bypass=false;}
  return true;
}
function hiddenAimAt(drawer,zone,state){
  raf2(()=>{
    const editor=drawer.querySelector('.stack-aim-editor');
    const button=editor?.querySelectorAll('.assist-zone-grid button')?.[zone];
    if(button)safeClick(button,state);
    state.armed=null;refresh(swingDrawer(state.root),state.root,null);
  });
}
function placeCardAtZone(drawer,card,zone,state){
  if(!drawer||!card||zone<0||zone>8)return false;
  const currentMain=mainCard(drawer),cell=zoneCells(state.root)[zone];
  if(!cell)return false;

  // No effect card yet, BASIC is being chosen, or BASIC is being replaced by a real card.
  if(!currentMain||card.classList.contains('basic-card')||(currentMain.classList.contains('basic-card')&&card!==currentMain)){
    if(card!==currentMain)safeClick(card,state);
    raf2(()=>{safeClick(zoneCells(state.root)[zone],state);state.armed=null;refresh(swingDrawer(state.root),state.root,null);});
    return true;
  }
  // Moving the first/effect card is just moving its aim zone.
  if(card===currentMain){
    safeClick(cell,state);state.armed=null;refresh(drawer,state.root,null);return true;
  }

  const candidate=candidateFor(drawer,card);
  if(!candidate){
    // A stale DOM edge case: treat the card as a new effect card rather than dead-ending the player.
    safeClick(card,state);raf2(()=>{safeClick(zoneCells(state.root)[zone],state);state.armed=null;refresh(swingDrawer(state.root),state.root,null);});
    return true;
  }
  if(candidate.disabled&&!candidate.classList.contains('picked')){
    setGuide(drawer,zonePanel(state.root),null);return false;
  }
  if(candidate.classList.contains('picked')){
    const slot=supportSlotFor(drawer,card);safeClick(slot,state);hiddenAimAt(drawer,zone,state);return true;
  }
  safeClick(candidate,state);hiddenAimAt(drawer,zone,state);return true;
}
function armCard(drawer,card,state){
  if(!drawer||!isUsable(card))return;
  const placed=assignments(drawer,state.root),row=placed.find(x=>x.card===card);
  if(!row&&placed.length>=4){setGuide(drawer,zonePanel(state.root),null);return;}
  state.armed=card;refresh(drawer,state.root,card);
  zonePanel(state.root)?.scrollIntoView?.({block:'center',behavior:'smooth'});
}
function tokenAssignment(drawer,token,state){
  const order=Number(token?.dataset.boardOrder);return assignments(drawer,state.root).find(x=>x.order===order)||null;
}
function ghostFor(card,e){
  const rect=card.getBoundingClientRect?.()||{width:120,height:160};
  const el=document.createElement('div');el.className='zone-card-drag-ghost';el.innerHTML=`<span>${card.dataset.boardOrder||'+'}</span><strong>${cardName(card)}</strong>`;
  document.body.appendChild(el);moveGhost(el,e,rect);return {el,rect};
}
function moveGhost(el,e,rect){if(el){el.style.left=(e.clientX-Math.min(70,(rect?.width||120)/2))+'px';el.style.top=(e.clientY-26)+'px';}}
function zoneAtPoint(root,x,y){
  const direct=root.elementFromPoint?.(x,y)?.closest?.('.zone-grid .zone-cell');if(direct)return direct;
  return zoneCells(root).find(cell=>{const r=cell.getBoundingClientRect?.();return r&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;})||null;
}

export function installSwingStackDirectTap(root=document){
  if(root.__swingStackDirectTapInstalled)return ()=>{};
  root.__swingStackDirectTapInstalled=true;
  const state={root,bypass:false,armed:null,drag:null,suppressClickUntil:0,scheduled:false};
  const schedule=()=>{if(state.scheduled)return;state.scheduled=true;requestAnimationFrame(()=>{state.scheduled=false;const drawer=swingDrawer(root);if(!drawer){state.armed=null;clearTokens(root);return;}if(state.armed&&(!drawer.contains(state.armed)||!isUsable(state.armed)))state.armed=null;refresh(drawer,root,state.armed);});};
  const observer=new MutationObserver(schedule);observer.observe(root.documentElement||root,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-pressed']});

  const finishDrag=(e,cancel=false)=>{
    const d=state.drag;if(!d||e.pointerId!==d.pointerId)return;
    const drawer=swingDrawer(root),target=!cancel&&d.moved?zoneAtPoint(root,e.clientX,e.clientY):null;
    if(d.moved){state.suppressClickUntil=Date.now()+420;e.preventDefault?.();e.stopPropagation?.();}
    d.card?.classList.remove('board-drag-source');zonePanel(root)?.classList.remove('board-dragging');
    if(target){
      const zone=zoneCells(root).indexOf(target);d.ghost?.classList.add('accepted');placeCardAtZone(drawer,d.card,zone,state);
    }else if(d.moved)d.ghost?.classList.add('snap-back');
    const ghost=d.ghost;setTimeout(()=>ghost?.remove(),160);state.drag=null;schedule();
  };
  const onPointerDown=e=>{
    if(state.bypass)return;const drawer=swingDrawer(root);if(!drawer)return;
    const card=e.target.closest?.(ATTACK_CARD_SELECTOR);if(!card||!drawer.contains(card)||!isUsable(card))return;
    state.drag={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,card,moved:false,ghost:null,rect:null};
  };
  const onPointerMove=e=>{
    const d=state.drag;if(!d||e.pointerId!==d.pointerId)return;
    const distance=Math.hypot(e.clientX-d.startX,e.clientY-d.startY);
    if(!d.moved&&distance>=DRAG_START){
      d.moved=true;const made=ghostFor(d.card,e);d.ghost=made.el;d.rect=made.rect;d.card.classList.add('board-drag-source');zonePanel(root)?.classList.add('board-dragging');
    }
    if(d.moved){moveGhost(d.ghost,e,d.rect);e.preventDefault?.();}
  };
  const onClick=e=>{
    if(state.bypass)return;const drawer=swingDrawer(root);if(!drawer)return;
    const token=e.target.closest?.('.zone-card-token');
    if(token){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
      const row=tokenAssignment(drawer,token,state);if(!row)return;
      if(row.role==='main')armCard(drawer,row.card,state);
      else if(row.candidate){safeClick(row.candidate,state);state.armed=null;schedule();}
      return;
    }
    const card=e.target.closest?.(ATTACK_CARD_SELECTOR);
    if(card&&drawer.contains(card)){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
      if(Date.now()<state.suppressClickUntil)return;
      armCard(drawer,card,state);return;
    }
    const zone=e.target.closest?.('.zone-grid .zone-cell');
    if(zone&&state.armed){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
      placeCardAtZone(drawer,state.armed,zoneCells(root).indexOf(zone),state);return;
    }
  };

  root.addEventListener('pointerdown',onPointerDown,true);
  root.addEventListener('pointermove',onPointerMove,{capture:true,passive:false});
  const onPointerCancel=e=>finishDrag(e,true);
  root.addEventListener('pointerup',finishDrag,true);
  root.addEventListener('pointercancel',onPointerCancel,true);
  root.addEventListener('click',onClick,true);
  schedule();
  return ()=>{
    observer.disconnect();state.drag?.ghost?.remove();clearTokens(root);
    zonePanel(root)?.classList.remove('zone-card-board-active','board-targeting','board-dragging');
    root.removeEventListener('pointerdown',onPointerDown,true);root.removeEventListener('pointermove',onPointerMove,true);
    root.removeEventListener('pointerup',finishDrag,true);root.removeEventListener('pointercancel',onPointerCancel,true);root.removeEventListener('click',onClick,true);
    delete root.__swingStackDirectTapInstalled;
  };
}

if(typeof document!=='undefined')installSwingStackDirectTap(document);
