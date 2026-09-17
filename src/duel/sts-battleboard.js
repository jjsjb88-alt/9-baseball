/* Slay-the-Spire interaction grammar for V10 landscape battles.
   The hand is the primary command surface: when a V10 pitch becomes actionable,
   open SWING automatically so all hand cards are immediately visible. Portrait
   keeps the existing guided flow. */

const landscapeQuery = typeof window !== 'undefined'
  ? window.matchMedia('(orientation: landscape)')
  : null;

let queued = false;

function isLandscape(){
  return !!landscapeQuery?.matches;
}

function openV10Hand(){
  queued = false;
  if(!isLandscape()) return;
  const combat = document.querySelector('.duel-combat.phase-battle.decision-hub');
  if(!combat) return;
  if(!combat.querySelector('.v10-combat-hp')) return;
  if(combat.querySelector('.card-drawer')) return;
  const swing = combat.querySelector('.action.swing:not(:disabled)');
  if(swing) swing.click();
}

function schedule(){
  if(queued) return;
  queued = true;
  requestAnimationFrame(openV10Hand);
}

if(typeof document !== 'undefined'){
  const observer = new MutationObserver(schedule);
  const start = ()=>{
    const root = document.getElementById('root') || document.body;
    if(root) observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    schedule();
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  landscapeQuery?.addEventListener?.('change',schedule);
}
