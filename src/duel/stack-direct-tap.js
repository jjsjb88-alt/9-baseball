import './stack-direct-tap.css';

const CARD_SELECTOR='.duel-hand .duel-card.attack:not(.basic-card)';
const normalize=s=>(s||'').replace(/\s+/g,' ').trim();
const cardName=el=>normalize(el?.querySelector('strong')?.textContent);

function swingDrawer(root=document){
  return root.querySelector('.card-drawer[aria-label="스윙 카드 선택"]');
}
function handCards(drawer){return [...drawer.querySelectorAll(CARD_SELECTOR)];}
function candidateButtons(drawer){return [...drawer.querySelectorAll('.stack-candidates > button')];}
function mainCard(drawer){return drawer.querySelector(`${CARD_SELECTOR}.selected`);}
function occurrenceIndex(items,item,name){
  return items.filter(x=>cardName(x)===name).indexOf(item);
}
function candidateFor(drawer,card){
  const main=mainCard(drawer),name=cardName(card);
  if(!name)return null;
  const sameHand=handCards(drawer).filter(x=>x!==main&&cardName(x)===name);
  const sameCandidates=candidateButtons(drawer).filter(x=>cardName(x)===name);
  const index=occurrenceIndex(sameHand,card,name);
  return sameCandidates[Math.max(0,index)]||sameCandidates[0]||null;
}
function supportSlotFor(drawer,card){
  const candidate=candidateFor(drawer,card);
  if(!candidate?.classList.contains('picked'))return null;
  const picked=candidateButtons(drawer).filter(x=>x.classList.contains('picked'));
  const index=picked.indexOf(candidate);
  return [...drawer.querySelectorAll('.stack-slot.support')][index]||null;
}
function stackCount(drawer){return 1+candidateButtons(drawer).filter(x=>x.classList.contains('picked')).length;}
function guide(drawer){
  let el=drawer.querySelector('.direct-stack-guide');
  if(el)return el;
  el=document.createElement('div');
  el.className='direct-stack-guide';
  el.setAttribute('role','status');
  el.innerHTML='<div class="direct-stack-progress"><i>1</i><span>메인</span><b></b><i>2</i><span>추가</span><b></b><i>3</i><span>스윙</span></div><strong></strong><small></small>';
  const hand=drawer.querySelector('.duel-hand');
  hand?.parentNode?.insertBefore(el,hand);
  return el;
}
function setGuide(drawer,step,title,sub){
  const el=guide(drawer);if(!el)return;
  el.dataset.step=String(step);
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
    const candidate=candidateFor(drawer,card);
    if(!candidate)return;
    const supportIndex=picked.indexOf(candidate);
    if(supportIndex>=0){card.dataset.stackRole='같이 씀 · '+(supportIndex+2);card.dataset.stackOrder=String(supportIndex+2);}
    else if(!candidate.disabled){card.dataset.stackRole='+ 같이 쓰기';}
  });
}
function refresh(drawer){
  if(!drawer)return;
  drawer.classList.add('direct-stack-enhanced');
  markCards(drawer);
  const main=mainCard(drawer),count=main?stackCount(drawer):0;
  if(!main){setGuide(drawer,1,'① 먼저 메인 스윙 카드를 탭하세요.','첫 카드는 100% 피해. 선택하면 나머지 카드가 “+ 같이 쓰기”로 바뀝니다.');return;}
  if(count===1){setGuide(drawer,2,'② 다른 스윙 카드를 한 번 더 탭하세요.','그 카드가 두 번째 커버가 됩니다 · 2장 80% / 3장 65% / 4장 50%');return;}
  setGuide(drawer,3,`③ ${count}장 스윙 준비 완료.`,`아래 실행 버튼으로 스윙하세요 · 현재 HP 피해 효율 ${[100,80,65,50][Math.min(3,count-1)]}%`);
}
function openAim(drawer,card){
  const name=cardName(card)||'추가 카드';
  const reveal=()=>{
    const editor=drawer.querySelector('.stack-aim-editor');if(!editor)return;
    drawer.classList.add('direct-stack-aiming');
    editor.classList.add('direct-open');
    editor.dataset.directTitle=`${name}이 막을 존을 탭하세요`;
    setGuide(drawer,2,`② ${name}이 막을 존을 탭하세요.`,`존 하나를 고르면 자동으로 2장 스윙 준비가 끝납니다.`);
    editor.scrollIntoView?.({block:'center',behavior:'smooth'});
  };
  requestAnimationFrame(()=>requestAnimationFrame(reveal));
}
function closeAim(drawer){
  const editor=drawer?.querySelector('.stack-aim-editor');
  drawer?.classList.remove('direct-stack-aiming');editor?.classList.remove('direct-open');
  refresh(drawer);
  requestAnimationFrame(()=>drawer?.querySelector('[data-testid="execute-action"]')?.scrollIntoView?.({block:'center',behavior:'smooth'}));
}

export function installSwingStackDirectTap(root=document){
  if(root.__swingStackDirectTapInstalled)return ()=>{};
  root.__swingStackDirectTapInstalled=true;
  let scheduled=false;
  const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;refresh(swingDrawer(root));});};
  const observer=new MutationObserver(schedule);
  observer.observe(root.documentElement||root,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-pressed']});
  const onClick=e=>{
    const drawer=swingDrawer(root);if(!drawer)return;
    const zone=e.target.closest?.('.stack-aim-editor .assist-zone-grid button');
    if(zone){setTimeout(()=>closeAim(drawer),80);return;}
    const card=e.target.closest?.(CARD_SELECTOR);if(!card||!drawer.contains(card))return;
    const main=mainCard(drawer);
    if(!main||card===main)return;
    const candidate=candidateFor(drawer,card);
    if(!candidate)return; // 번트 등 스택 불가 카드는 기존처럼 메인 교체.
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
    if(candidate.classList.contains('picked')){
      const slot=supportSlotFor(drawer,card);slot?.click();openAim(drawer,card);return;
    }
    if(candidate.disabled){
      setGuide(drawer,3,'최대 4장까지 같이 쓸 수 있습니다.','이미 커버를 충분히 넓혔습니다. 현재 스택으로 스윙하세요.');return;
    }
    candidate.click();
    openAim(drawer,card);
  };
  root.addEventListener('click',onClick,true);
  schedule();
  return ()=>{observer.disconnect();root.removeEventListener('click',onClick,true);delete root.__swingStackDirectTapInstalled;};
}

if(typeof document!=='undefined')installSwingStackDirectTap(document);
