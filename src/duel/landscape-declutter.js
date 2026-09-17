/* Landscape progressive disclosure.
   The battle scene owns attention; secondary explanations only open on demand. */

const defaultMedia=typeof window!=='undefined'&&window.matchMedia
  ? window.matchMedia('(orientation: landscape)')
  : {matches:false,addEventListener(){},removeEventListener(){}};

const raf=fn=>typeof requestAnimationFrame==='function'?requestAnimationFrame(fn):setTimeout(fn,0);

function button(label,className){
  const el=document.createElement('button');
  el.type='button';el.className=className;el.textContent=label;el.setAttribute('aria-expanded','false');
  return el;
}
function toggleClass(target,className,control){
  const open=target.classList.toggle(className);
  control.setAttribute('aria-expanded',open?'true':'false');
  control.classList.toggle('active',open);
  return open;
}
function decorateZone(panel){
  if(!panel||panel.querySelector('.landscape-zone-bar'))return;
  const bar=document.createElement('div');bar.className='landscape-zone-bar';
  const title=document.createElement('strong');title.textContent='9 ZONE';
  const info=button('INFO','landscape-zone-info-toggle');
  info.setAttribute('aria-label','9존 상세 정보');
  info.addEventListener('click',()=>toggleClass(panel,'zone-info-open',info));
  bar.append(title,info);panel.prepend(bar);
}
function decorateRead(read){
  if(!read||read.querySelector('.landscape-read-toggle'))return;
  const control=button('READ +','landscape-read-toggle');
  control.setAttribute('aria-label','투구 읽기 상세');
  control.addEventListener('click',()=>{
    const open=toggleClass(read,'read-open',control);
    control.textContent=open?'READ −':'READ +';
  });
  read.prepend(control);
}
function decorateChoice(preview){
  if(!preview||preview.querySelector('.landscape-choice-toggle'))return;
  const execute=preview.querySelector('[data-testid="execute-action"]');
  const detail=preview.querySelector(':scope > div');
  if(!execute||!detail)return;
  const control=button('DETAIL','landscape-choice-toggle');
  control.setAttribute('aria-label','선택 카드 상세');
  control.addEventListener('click',()=>toggleClass(preview,'choice-info-open',control));
  preview.insertBefore(control,execute);
}
function decorateRelics(rack){
  if(!rack||rack.dataset.landscapeDisclosure==='1')return;
  rack.dataset.landscapeDisclosure='1';rack.tabIndex=0;rack.setAttribute('role','button');
  rack.setAttribute('aria-expanded','false');rack.setAttribute('aria-label','보유 유물 · 눌러서 이름 보기');
  const flip=()=>{
    const open=rack.classList.toggle('relic-info-open');
    rack.setAttribute('aria-expanded',open?'true':'false');
  };
  rack.addEventListener('click',flip);
  rack.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){e.preventDefault();flip();}
  });
}
function decorateArena(arena){
  if(!arena||arena.querySelector('.landscape-duel-axis'))return;
  const axis=document.createElement('div');axis.className='landscape-duel-axis';axis.setAttribute('aria-hidden','true');
  axis.innerHTML='<i></i><span>BATTER</span><b>VS</b><span>PITCHER</span><i></i>';
  arena.append(axis);
}
function refresh(root=document,media=defaultMedia){
  const combats=[...(root.querySelectorAll?.('.duel-combat')||[])];
  combats.forEach(combat=>{
    const active=!!media.matches;
    combat.classList.toggle('landscape-declutter',active);
    combat.classList.toggle('v10-landscape-declutter',active&&!!combat.querySelector('.v10-combat-hp'));
    if(!active)return;
    decorateZone(combat.querySelector(':scope > .zone-panel'));
    decorateRead(combat.querySelector(':scope > .pitch-read'));
    decorateChoice(combat.querySelector('.decision-preview'));
    decorateRelics(combat.querySelector('.v10-relic-rack'));
    decorateArena(combat.querySelector(':scope > .duel-arena'));
  });
}
function installLandscapeDeclutter(root=document,media=defaultMedia){
  let scheduled=false;
  const schedule=()=>{if(scheduled)return;scheduled=true;raf(()=>{scheduled=false;refresh(root,media);});};
  const target=root.documentElement||root;
  const observer=typeof MutationObserver!=='undefined'&&target?new MutationObserver(schedule):null;
  observer?.observe(target,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  media.addEventListener?.('change',schedule);schedule();
  return ()=>{
    observer?.disconnect();media.removeEventListener?.('change',schedule);
    root.querySelectorAll?.('.duel-combat').forEach(c=>c.classList.remove('landscape-declutter','v10-landscape-declutter'));
  };
}

if(typeof document!=='undefined')installLandscapeDeclutter(document,defaultMedia);

export {installLandscapeDeclutter,refresh};
