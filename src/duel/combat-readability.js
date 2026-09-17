const READ_COPY=new Map([
  ['희박','VERY LOW'],
  ['드묾','LOW'],
  ['가끔','MID'],
  ['자주','HIGH'],
  ['안 씀','NONE'],
  ['거의 없음','VERY LOW'],
  ['낮음','LOW'],
  ['보통','MID'],
  ['높음','HIGH'],
  ['안 던짐','NONE'],
  ['확정','100%'],
  ['단서 밖','OUT'],
]);
const READ_LEVEL=new Map([
  ['VERY LOW','none'],['LOW','low'],['MID','mid'],['HIGH','high'],['NONE','none'],['100%','high'],['OUT','none'],
]);
const ZONE_COPY=new Map([
  ['몸쪽 높음','IN · HIGH'],['가운데 높음','MID · HIGH'],['바깥 높음','OUT · HIGH'],
  ['몸쪽 중간','IN · MID'],['한가운데','CENTER'],['바깥 중간','OUT · MID'],
  ['몸쪽 낮음','IN · LOW'],['가운데 낮음','MID · LOW'],['바깥 낮음','OUT · LOW'],
]);

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
  root.querySelectorAll?.('.duel-combat .zone-cell>span').forEach(el=>{
    const raw=el.textContent?.trim();
    const next=ZONE_COPY.get(raw);
    if(next){
      el.textContent=next;
      el.dataset.zoneCopy='english';
    }
  });
}

function syncCharacterFocus(root=document){
  const arena=root.querySelector?.('.duel-combat>.duel-arena');
  if(!arena)return;
  arena.classList.add('protagonist-stage');
  if(!arena.querySelector('.character-focus-layer')){
    const layer=document.createElement('div');
    layer.className='character-focus-layer';
    layer.setAttribute('aria-hidden','true');
    const batter=document.createElement('i');batter.className='character-focus-spot batter';
    const pitcher=document.createElement('i');pitcher.className='character-focus-spot pitcher';
    layer.append(batter,pitcher);arena.prepend(layer);
  }
  if(!arena.querySelector('.actor-focus-tag.batter')){
    const batterTag=document.createElement('span');batterTag.className='actor-focus-tag batter';batterTag.textContent='BATTER';batterTag.setAttribute('aria-hidden','true');arena.appendChild(batterTag);
  }
  if(!arena.querySelector('.actor-focus-tag.pitcher')){
    const pitcherTag=document.createElement('span');pitcherTag.className='actor-focus-tag pitcher';pitcherTag.textContent='PITCHER';pitcherTag.setAttribute('aria-hidden','true');arena.appendChild(pitcherTag);
  }
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

function refresh(){scheduled=false;syncZoneCopy();syncCharacterFocus();syncEfficiency();syncLastHit();}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(refresh);}

if(typeof document!=='undefined'){
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','data-damage','data-damage-rate','data-hp-after']});
  schedule();
}

export {READ_COPY,ZONE_COPY,syncZoneCopy,syncCharacterFocus,syncEfficiency,syncLastHit};
