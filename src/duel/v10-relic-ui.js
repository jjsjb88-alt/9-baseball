import {V10_RELICS} from './v10-relics.js';
const SAVE='9zone-v10-run';
let scheduled=false,lastTrigger='';
const state=()=>{try{return JSON.parse(localStorage.getItem(SAVE)||'null')}catch{return null}};
const owned=s=>(s?.relics||[]).filter(k=>V10_RELICS[k]);
function rack(){
  const combat=document.querySelector('.duel-combat');if(!combat)return;
  const s=state(),keys=owned(s);let el=combat.querySelector('.v10-relic-rack');
  if(!keys.length){el?.remove();return;}
  if(!el){el=document.createElement('div');el.className='v10-relic-rack';el.setAttribute('aria-label','보유 유물');combat.prepend(el);}
  el.innerHTML=keys.map(k=>{const r=V10_RELICS[k];return '<span class="v10-relic-chip" title="'+r.name+' · '+r.text+'"><i>'+r.mark+'</i><b>'+r.name+'</b></span>';}).join('');
}
function shop(){
  document.querySelectorAll('.reward-screen .duel-card.skill strong').forEach(strong=>{
    const text=strong.textContent||'';if(!text.startsWith('RELIC · '))return;
    const card=strong.closest('.duel-card');if(!card||card.dataset.relicDecorated)return;
    const [name,...detail]=text.slice(8).split(' / ');card.dataset.relicDecorated='1';card.classList.add('v10-relic-offer');
    strong.textContent=name;const tag=document.createElement('span');tag.className='v10-relic-offer-tag';tag.textContent='RELIC';card.prepend(tag);
    const rule=card.querySelector('.card-rule');if(rule)rule.textContent=detail.join(' / ');else{const p=document.createElement('p');p.className='card-rule';p.textContent=detail.join(' / ');card.appendChild(p);}
  });
}
function trigger(){
  const s=state(),events=s?.v10?.lastCombat?.relicEvents||[];if(!events.length)return;
  const combat=document.querySelector('.duel-combat');if(!combat)return;
  const sig=(s?.stats?.pitches||0)+':'+events.join('|');if(sig===lastTrigger)return;lastTrigger=sig;
  combat.querySelector('.v10-relic-trigger')?.remove();const el=document.createElement('div');el.className='v10-relic-trigger';el.setAttribute('role','status');
  el.innerHTML='<span>RELIC TRIGGER</span><strong>'+events.join(' · ')+'</strong>';combat.appendChild(el);setTimeout(()=>el.remove(),1700);
}
function refresh(){scheduled=false;rack();shop();trigger()}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(refresh)}
if(typeof document!=='undefined'){new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true});window.addEventListener('storage',schedule);schedule()}
