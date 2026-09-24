export const RED_RUSH_ASSET_ID='regular-01-red-rush';
export const RED_RUSH_FRAME_COUNT=120;
export const RED_RUSH_FPS=60;
export const RED_RUSH_DURATION_MS=2000;

const SKILL_GRADES=new Set(['read','lock','expand','signal','survive','draw']);
export const hasPitchVisual=shot=>!!shot&&!SKILL_GRADES.has(shot.grade);

export function redRushFrameAt(elapsedMs){
  if(!Number.isFinite(elapsedMs)||elapsedMs<=0)return 0;
  return Math.min(RED_RUSH_FRAME_COUNT-1,Math.floor(elapsedMs*RED_RUSH_FPS/1000));
}

// Synchronize the game's contact/ball/VFX event with the authored release
// at approximately frame 79. Only call this for the Red Rush encounter.
export function redRushTimeline(base,reduced=false){
  if(!base||reduced)return base;
  const impactAt=1320;
  const releaseAt=impactAt+(base.freeze||0)+(base.slowmo||0);
  const settleAt=Math.max(1830,releaseAt+80);
  return {...base,impactAt,releaseAt,settleAt,duration:Math.max(RED_RUSH_DURATION_MS,base.duration,settleAt+170)};
}
