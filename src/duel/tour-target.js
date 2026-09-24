/*
 * V12 P7-2 — what the welcome guide spotlights. Its steps point at the hub buttons (준비·스윙·지켜보기)
 * and the event line, but in the V12 design state (landscape / desktop open the swing drawer at once)
 * those are not on screen, so the guide highlighted nothing — or a 16px dot. When a step's own target
 * is not visible, the control that does the same job on this screen is used instead.
 */
export const TOUR_FALLBACK={
  prepare:['.duel-hand .duel-card.skill','.card-drawer .duel-hand'],
  swing:['.zone-panel .zone-grid','.card-drawer .duel-hand'],
  watch:['.drawer-watch'],
  events:['.pitch-read','.diamond-events'],
};
const visible=el=>{if(!el?.getBoundingClientRect)return false;const r=el.getBoundingClientRect();return r.width>16&&r.height>16;};
export function resolveTourTarget(target,refs,doc=document){
  const own=refs?.[target]?.current;
  // without layout (e.g. a DOM test environment) nothing can be measured: keep the step's own target
  const measured=(doc.documentElement?.getBoundingClientRect?.().width||0)>0;
  if(!measured)return own||null;
  if(visible(own))return own;
  for(const sel of TOUR_FALLBACK[target]||[]){const el=doc.querySelector(sel);if(visible(el))return el;}
  return null;
}
