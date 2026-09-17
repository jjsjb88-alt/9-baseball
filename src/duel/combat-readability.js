const READ_COPY=new Map([
  ['희박','거의 없음'],
  ['드묾','낮음'],
  ['가끔','보통'],
  ['자주','높음'],
  ['안 씀','안 던짐'],
]);
const READ_LEVEL=new Map([['거의 없음','none'],['낮음','low'],['보통','mid'],['높음','high'],['안 던짐','none']]);

let scheduled=false;
const parseRate=text=>{const m=String(text||'').match(/(?:HP\s*)?(\d+)%/);return m?Number(m[1]):null;};

function syncZoneCopy(root=document){
  root.querySelectorAll?.('.duel-combat .zone-cell strong').forEach(el=>{
    const raw=el.textContent?.trim();
    const next=READ_COPY.get(raw);
    if(next)el.textContent=next;
    const label=next||raw;
    const cell=el.closest('.zone-cell');
    if(cell&&READ_LEVEL.has(label))cell.dataset.readLevel=READ_LEVEL.get(label);
    if(cell?.title&&READ_COPY.has(cell.title))cell.title=READ_COPY.get(cell.title);
  });
}

function syncEfficiency(root=document){
  const combat=root.querySelector?.('.duel-combat.decision-swing');
  if(!combat)return;
  const preview=combat.querySelector('.decision-preview');
  if(!preview)return;
  let chip=preview.querySelector('.hp-efficiency-chip');
  const active=preview.classList.contains('active');
  const execute=preview.querySelector('[data-testid="execute-action"]');
  const stackRate=parseRate(combat.querySelector('.stack-efficiency b')?.textContent);
  const buttonRate=parseRate(execute?.textContent);
  const rate=stackRate??buttonRate??(execute&&/단독/.test(execute.textContent)?100:null);
  if(!active||rate==null){chip?.remove();return;}
  if(!chip){chip=document.createElement('div');chip.className='hp-efficiency-chip';preview.prepend(chip);}
  chip.dataset.rate=String(rate);
  chip.textContent=`투수 HP 피해 ×${rate}%`;
}

function syncLastHit(root=document){
  const combat=root.querySelector?.('.duel-combat');
  if(!combat)return;
  const result=combat.querySelector('.v10-result[data-damage]');
  const hpHud=combat.querySelector('.v10-combat-hp');
  if(!result||!hpHud)return;
  const damage=Number(result.dataset.damage)||0;
  const rate=Number(result.dataset.damageRate)||100;
  const hpAfter=Number(result.dataset.hpAfter)||0;
  const cards=Number(result.dataset.cardCount)||1;
  let badge=hpHud.querySelector('.hp-last-hit');
  if(!badge){badge=document.createElement('div');badge.className='hp-last-hit';hpHud.appendChild(badge);}
  badge.className=`hp-last-hit ${damage>=18?'heavy':damage>=8?'solid':'chip'}`;
  badge.innerHTML=`<strong>${damage>0?`-${damage}`:'0'} HP</strong><span>피해 ×${rate}%${cards>1?` · ${cards}장`:''}</span>`;

  if(damage<=0)return;
  const arena=combat.querySelector('.duel-arena');
  if(!arena)return;
  const signature=`${damage}:${hpAfter}:${rate}:${cards}`;
  if(arena.dataset.hpImpactSignature===signature)return;
  arena.dataset.hpImpactSignature=signature;

  const old=arena.querySelector('.hp-impact-burst');old?.remove();
  const burst=document.createElement('div');
  burst.className=`hp-impact-burst ${damage>=18?'heavy':damage>=8?'solid':'chip'}`;
  burst.setAttribute('role','status');
  const big=document.createElement('strong');big.textContent=`-${damage} HP`;
  const meta=document.createElement('span');meta.textContent=`투수 피해 ×${rate}%`;
  burst.append(big,meta);arena.appendChild(burst);

  hpHud.classList.remove('hp-hit-flash');
  requestAnimationFrame(()=>hpHud.classList.add('hp-hit-flash'));
  window.setTimeout(()=>hpHud.classList.remove('hp-hit-flash'),760);
  window.setTimeout(()=>burst.remove(),1450);
}

function refresh(){scheduled=false;syncZoneCopy();syncEfficiency();syncLastHit();}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(refresh);}

if(typeof document!=='undefined'){
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','data-damage','data-damage-rate','data-hp-after']});
  schedule();
}

export {READ_COPY,syncZoneCopy,syncEfficiency,syncLastHit};
