import './stack-direct-tap.css';
import './act23-deckbuilding-ui.js';

const CARD_SELECTOR='.duel-hand .duel-card.attack:not(.basic-card)';
const SWIPE_TRIGGER=58;
const LIFT_TRIGGER=10;
const normalize=s=>(s||'').replace(/\s+/g,' ').trim();
const cardName=el=>normalize(el?.querySelector('strong')?.textContent);

function swingDrawer(root=document){
  return root.querySelector('.card-drawer[aria-label="스윙 카드 선택"]');
}
function handCards(drawer){return [...drawer.querySelectorAll(CARD_SELECTOR)];}
function candidateButtons(drawer){return [...drawer.querySelectorAll('.stack-candidates > button')];}
function mainCard(drawer){return drawer.querySelector(`${CARD_SELECTOR}.selected`);}
function occurrenceIndex(items,item,name){return items.filter(x=>cardName(x)===name).indexOf(item);}
function candidateFor(drawer,card){
  const main=mainCard(drawer),name=cardName(card);if(!name)return null;
  const sameHand=handCards(drawer).filter(x=>x!==main&&cardName(x)===name);
  const sameCandidates=candidateButtons(drawer).filter(x=>cardName(x)===name);
  const index=occurrenceIndex(sameHand,card,name);
  return sameCandidates[Math.max(0,index)]||sameCandidates[0]||null;
}
function supportSlotFor(drawer,card){
  const candidate=candidateFor(drawer,card);if(!candidate?.classList.contains('picked'))return null;
  const picked=candidateButtons(drawer).filter(x=>x.classList.contains('picked'));
  const index=picked.indexOf(candidate);
  return [...drawer.querySelectorAll('.stack-slot.support')][index]||null;
}
function stackCount(drawer){return 1+candidateButtons(drawer).filter(x=>x.classList.contains('picked')).length;}
function guide(drawer){
  let el=drawer.querySelector('.direct-stack-guide');if(el)return el;
  el=document.createElement('div');el.className='direct-stack-guide';el.setAttribute('role','status');
  el.innerHTML='<div class="direct-stack-progress"><i>1</i><span>메인</span><b></b><i>2</i><span>스와이프</span><b></b><i>3</i><span>스윙</span></div><strong></strong><small></small>';
  const hand=drawer.querySelector('.duel-hand');hand?.parentNode?.insertBefore(el,hand);return el;
}
function swipeDock(drawer){
  let el=drawer.querySelector('.swipe-stack-dock');if(el)return el;
  el=document.createElement('div');el.className='swipe-stack-dock';el.setAttribute('aria-hidden','true');
  el.innerHTML='<i>↑</i><div><span>COVER +</span><strong>위로 밀어 겹치기</strong></div>';
  drawer.appendChild(el);return el;
}
function setGuide(drawer,step,title,sub){
  const el=guide(drawer);if(!el)return;el.dataset.step=String(step);
  const strong=el.querySelector('strong'),small=el.querySelector('small');
  if(strong&&strong.textContent!==title)strong.textContent=title;
  if(small&&small.textContent!==sub)small.textContent=sub;
  [...el.querySelectorAll('.direct-stack-progress i')].forEach((dot,i)=>{
    dot.classList.toggle('done',i+1<step);dot.classList.toggle('current',i+1===step);
  });
}
function markCards(drawer){
  const cards=handCards(drawer),main=mainCard(drawer),picked=candidateButtons(drawer).filter(x=>x.classList.contains('picked'));
  cards.forEach(card=>{
    card.removeAttribute('data-stack-role');card.removeAttribute('data-stack-order');
    if(card===main){card.dataset.stackRole='MAIN · 1';card.dataset.stackOrder='1';return;}
    const candidate=candidateFor(drawer,card);if(!candidate)return;
    const supportIndex=picked.indexOf(candidate);
    if(supportIndex>=0){card.dataset.stackRole='COVER · '+(supportIndex+2);card.dataset.stackOrder=String(supportIndex+2);}
    else if(!candidate.disabled){card.dataset.stackRole='↑ 위로 밀어 커버';}
  });
}
function refresh(drawer){
  if(!drawer)return;
  // React가 COVER 편집기를 제거했는데 제스처 레이어의 aiming 상태만 남으면
  // 화면이 dim 처리된 채 영구 잠긴다. DOM을 진실 원천으로 삼아 자동 복구한다.
  if(drawer.classList.contains('direct-stack-aiming')&&!drawer.querySelector('.stack-aim-editor')){
    drawer.classList.remove('direct-stack-aiming');
  }
  drawer.classList.add('direct-stack-enhanced');swipeDock(drawer);markCards(drawer);
  const main=mainCard(drawer),count=main?stackCount(drawer):0;
  if(!main){setGuide(drawer,1,'① 먼저 메인 스윙 카드를 고르세요.','첫 카드는 HP 피해 100%. 메인을 고르면 다른 카드에 ↑ 커버 표시가 생깁니다.');return;}
  if(count===1){setGuide(drawer,2,'② 다른 카드를 위로 밀어 MAIN에 겹치세요.','카드를 위로 쓸어 올리고 놓으면 COVER +로 들어갑니다 · 2장 피해 80%');return;}
  setGuide(drawer,3,`③ ${count}장 스윙 준비 완료.`,`더 넓히려면 다른 카드를 또 위로 밀기 · 지금 치려면 아래 스윙 버튼`);
}
function openAim(drawer,card){
  const name=cardName(card)||'추가 카드';
  const reveal=()=>{
    const editor=drawer.querySelector('.stack-aim-editor');if(!editor)return;
    drawer.classList.add('direct-stack-aiming');editor.classList.add('direct-open');
    editor.dataset.directTitle=`${name}이 막을 존을 고르세요`;
    setGuide(drawer,2,`② ${name}의 커버 존을 고르세요.`,`존을 고르면 이 카드가 MAIN 위에 겹쳐집니다.`);
  };
  requestAnimationFrame(()=>requestAnimationFrame(reveal));
}
function closeAim(drawer){
  const editor=drawer?.querySelector('.stack-aim-editor');
  drawer?.classList.remove('direct-stack-aiming');editor?.classList.remove('direct-open');
  refresh(drawer);
  requestAnimationFrame(()=>drawer?.querySelector('[data-testid="execute-action"]')?.scrollIntoView?.({block:'center',behavior:'smooth'}));
}
function addOrEditSupport(drawer,card){
  const candidate=candidateFor(drawer,card);if(!candidate)return false;
  if(candidate.classList.contains('picked')){
    const slot=supportSlotFor(drawer,card);slot?.click();openAim(drawer,card);return true;
  }
  if(candidate.disabled){
    setGuide(drawer,3,'최대 4장까지 겹칠 수 있습니다.','현재 스택으로 스윙하거나 COVER 카드를 다시 편집하세요.');return false;
  }
  candidate.click();openAim(drawer,card);return true;
}
function createGhost(card,e){
  const rect=card.getBoundingClientRect?.()||{width:132,height:170};
  const ghost=card.cloneNode(true);ghost.classList.add('swipe-card-ghost');ghost.classList.remove('selected');
  ghost.removeAttribute('data-stack-role');ghost.removeAttribute('data-stack-order');ghost.removeAttribute('aria-pressed');
  ghost.style.width=Math.max(112,Math.min(160,rect.width||132))+'px';
  document.body.appendChild(ghost);moveGhost(ghost,e,rect);return {ghost,rect};
}
function moveGhost(ghost,e,rect){
  if(!ghost)return;
  ghost.style.left=(e.clientX-Math.max(56,(rect?.width||132)/2))+'px';
  ghost.style.top=(e.clientY-Math.max(74,(rect?.height||160)*.58))+'px';
}

export function installSwingStackDirectTap(root=document){
  if(root.__swingStackDirectTapInstalled)return ()=>{};
  root.__swingStackDirectTapInstalled=true;
  let scheduled=false,drag=null,suppressClickUntil=0;
  const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;refresh(swingDrawer(root));});};
  const observer=new MutationObserver(schedule);
  observer.observe(root.documentElement||root,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-pressed']});

  const cleanupDrag=(drawer,{snap=false}={})=>{
    if(!drag)return;
    drag.card?.classList.remove('swipe-source','swipe-armed');
    drawer?.classList.remove('direct-stack-dragging','direct-stack-armed');
    const dock=drawer?.querySelector('.swipe-stack-dock');dock?.classList.remove('active','armed');
    if(snap&&drag.ghost)drag.ghost.classList.add('snap-back');
    const ghost=drag.ghost;setTimeout(()=>ghost?.remove(),snap?150:0);drag=null;
  };
  const onPointerDown=e=>{
    const drawer=swingDrawer(root);if(!drawer||drawer.classList.contains('direct-stack-aiming'))return;
    const card=e.target.closest?.(CARD_SELECTOR),main=mainCard(drawer);
    if(!card||!main||card===main||!drawer.contains(card))return;
    const candidate=candidateFor(drawer,card);if(!candidate||candidate.disabled&&!candidate.classList.contains('picked'))return;
    const made=createGhost(card,e);
    drag={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,card,candidate,ghost:made.ghost,rect:made.rect,moved:false,armed:false};
    card.classList.add('swipe-source');drawer.classList.add('direct-stack-dragging');
    drawer.querySelector('.swipe-stack-dock')?.classList.add('active');
  };
  const onPointerMove=e=>{
    if(!drag||e.pointerId!==drag.pointerId)return;
    const drawer=swingDrawer(root);if(!drawer)return;
    const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY,distance=Math.hypot(dx,dy);
    if(distance>=LIFT_TRIGGER)drag.moved=true;
    moveGhost(drag.ghost,e,drag.rect);
    const armed=dy<=-SWIPE_TRIGGER&&(-dy)>Math.abs(dx)*.7;
    drag.armed=armed;drag.card.classList.toggle('swipe-armed',armed);drawer.classList.toggle('direct-stack-armed',armed);
    const dock=drawer.querySelector('.swipe-stack-dock');dock?.classList.toggle('armed',armed);
    if(drag.moved){e.preventDefault?.();}
  };
  const finishPointer=e=>{
    if(!drag||e.pointerId!==drag.pointerId)return;
    const drawer=swingDrawer(root),card=drag.card,moved=drag.moved,armed=drag.armed;
    if(moved){suppressClickUntil=Date.now()+420;e.preventDefault?.();e.stopPropagation?.();}
    if(armed){
      drag.ghost?.classList.add('accepted');
      navigator.vibrate?.(12);
      addOrEditSupport(drawer,card);cleanupDrag(drawer);return;
    }
    if(moved){setGuide(drawer,2,'조금 더 위로 밀어주세요 ↑','COVER +가 밝게 켜질 때 놓으면 카드가 메인 스윙에 겹쳐집니다.');cleanupDrag(drawer,{snap:true});return;}
    cleanupDrag(drawer);
  };
  const onClick=e=>{
    const drawer=swingDrawer(root);if(!drawer)return;
    const zone=e.target.closest?.('.stack-aim-editor .assist-zone-grid button');
    if(zone){setTimeout(()=>closeAim(drawer),80);return;}
    const remove=e.target.closest?.('.stack-aim-editor .stack-aim-title > button');
    if(remove){setTimeout(()=>closeAim(drawer),80);return;}
    const card=e.target.closest?.(CARD_SELECTOR);if(!card||!drawer.contains(card))return;
    if(Date.now()<suppressClickUntil){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();return;}
    const main=mainCard(drawer);if(!main||card===main)return;
    const candidate=candidateFor(drawer,card);if(!candidate)return;
    // 탭은 PC/접근성용 보조 조작. 모바일의 주 조작은 위로 스와이프다.
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();addOrEditSupport(drawer,card);
  };
  root.addEventListener('pointerdown',onPointerDown,true);
  root.addEventListener('pointermove',onPointerMove,{capture:true,passive:false});
  root.addEventListener('pointerup',finishPointer,true);
  root.addEventListener('pointercancel',finishPointer,true);
  root.addEventListener('click',onClick,true);
  schedule();
  return ()=>{
    observer.disconnect();cleanupDrag(swingDrawer(root));
    root.removeEventListener('pointerdown',onPointerDown,true);root.removeEventListener('pointermove',onPointerMove,true);
    root.removeEventListener('pointerup',finishPointer,true);root.removeEventListener('pointercancel',finishPointer,true);root.removeEventListener('click',onClick,true);
    delete root.__swingStackDirectTapInstalled;
  };
}

if(typeof document!=='undefined')installSwingStackDirectTap(document);
