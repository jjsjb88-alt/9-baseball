import fs from 'node:fs';

function patch(path,replacements){
  let text=fs.readFileSync(path,'utf8');
  for(const [from,to,label] of replacements){
    if(text.includes(to))continue;
    if(!text.includes(from))throw new Error(`missing ${label} in ${path}`);
    text=text.replace(from,to);
  }
  fs.writeFileSync(path,text);
}

patch('src/duel/stack-direct-tap.js',[
  ["const cardName=el=>normalize(el?.querySelector('strong')?.textContent);","const cardName=el=>normalize(el?.querySelector('strong')?.textContent);\nconst isUsable=card=>!!card&&!card.disabled&&!card.classList.contains('unavailable');",'usable helper'],
  ["  const placed=assignments(drawer,document),count=placed.length,rate=DAMAGE_RATES[Math.max(0,count-1)]||50;","  const placed=assignments(drawer,document),count=placed.length,baseRate=DAMAGE_RATES[Math.max(0,count-1)]||50;\n  const liveRate=Number.parseInt(normalize(drawer.querySelector('.stack-efficiency b')?.textContent),10);\n  const rate=Number.isFinite(liveRate)?liveRate:baseRate;",'live damage rate'],
  ["  strip.innerHTML=DAMAGE_RATES.map((n,i)=>`<i class=\"${count===i+1?'current':''}\"><b>${i+1}</b><span>${n}%</span></i>`).join('');","  strip.innerHTML=DAMAGE_RATES.map((n,i)=>{const shown=count===i+1?rate:n;return `<i class=\"${count===i+1?'current':''}\"><b>${i+1}</b><span>${shown}%</span></i>`;}).join('');",'damage strip'],
  ["    }else card.dataset.boardAction='＋ 존에 놓기';","    }else card.dataset.boardAction=isUsable(card)?'＋ 존에 놓기':'사용 불가';",'unavailable card label'],
  ["  drawer.classList.add('zone-card-board');panel.classList.add('zone-card-board-active');\n  panel.classList.toggle('board-targeting',!!armed);","  drawer.classList.add('zone-card-board');panel.classList.add('zone-card-board-active');\n  panel.classList.toggle('board-empty',!mainCard(drawer));panel.classList.toggle('board-targeting',!!armed);",'empty board state'],
  ["  if(!drawer||!card||card.disabled)return;","  if(!drawer||!isUsable(card))return;",'arm availability'],
  ["  const schedule=()=>{if(state.scheduled)return;state.scheduled=true;requestAnimationFrame(()=>{state.scheduled=false;const drawer=swingDrawer(root);if(!drawer){state.armed=null;clearTokens(root);return;}if(state.armed&&!drawer.contains(state.armed))state.armed=null;refresh(drawer,root,state.armed);});};","  const schedule=()=>{if(state.scheduled)return;state.scheduled=true;requestAnimationFrame(()=>{state.scheduled=false;const drawer=swingDrawer(root);if(!drawer){state.armed=null;clearTokens(root);return;}if(state.armed&&(!drawer.contains(state.armed)||!isUsable(state.armed)))state.armed=null;refresh(drawer,root,state.armed);});};",'armed stale state'],
  ["    const card=e.target.closest?.(ATTACK_CARD_SELECTOR);if(!card||!drawer.contains(card)||card.disabled)return;","    const card=e.target.closest?.(ATTACK_CARD_SELECTOR);if(!card||!drawer.contains(card)||!isUsable(card))return;",'drag availability'],
  ["  root.addEventListener('pointerup',finishDrag,true);\n  root.addEventListener('pointercancel',e=>finishDrag(e,true),true);\n  root.addEventListener('click',onClick,true);","  const onPointerCancel=e=>finishDrag(e,true);\n  root.addEventListener('pointerup',finishDrag,true);\n  root.addEventListener('pointercancel',onPointerCancel,true);\n  root.addEventListener('click',onClick,true);",'pointer cancel handler'],
  ["    root.removeEventListener('pointerup',finishDrag,true);root.removeEventListener('click',onClick,true);","    root.removeEventListener('pointerup',finishDrag,true);root.removeEventListener('pointercancel',onPointerCancel,true);root.removeEventListener('click',onClick,true);",'pointer cancel cleanup'],
]);

patch('src/duel/stack-direct-tap.css',[
  [".zone-card-board .duel-hand .duel-card.attack:not(:disabled){",".zone-card-board .duel-hand .duel-card.attack:not(:disabled):not(.unavailable){",'usable card opacity'],
  [".zone-card-board .duel-hand .duel-card.attack:not(:disabled):not(.board-placed-source){",".zone-card-board .duel-hand .duel-card.attack:not(:disabled):not(.unavailable):not(.board-placed-source){",'usable card border'],
  [".zone-card-board-active .zone-grid{overflow:visible}",".zone-card-board-active .zone-grid{overflow:visible}\n.zone-card-board-active.board-empty .zone-cell.aimed,.zone-card-board-active.board-empty .zone-cell.covered{box-shadow:none!important;outline:none!important;border-color:inherit!important}", 'empty board neutral'],
]);

console.log('zone card board hardened');
