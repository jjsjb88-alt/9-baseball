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

// The ball leaves the hand at the authored release (frame 76, ~1267ms) and reaches the plate
// PITCH_FLIGHT_MS later; the game's contact/VFX event is that arrival. (V13 C3: contact used to sit
// on the release frame itself, so the pitch had ~50ms of flight and the ball felt detached.)
export const RED_RUSH_RELEASE_FRAME=76;
export const PITCH_FLIGHT_MS=300;
export const RED_RUSH_RELEASE_MS=Math.round(RED_RUSH_RELEASE_FRAME*1000/60);
export function redRushTimeline(base,reduced=false){
  if(!base||reduced)return base;
  const impactAt=RED_RUSH_RELEASE_MS+PITCH_FLIGHT_MS;
  const releaseAt=impactAt+(base.freeze||0)+(base.slowmo||0);
  // the batter's follow-through needs 500ms after contact (batterMotionV3Timeline); settle waits for it
  const settleAt=Math.max(1830,releaseAt+80,impactAt+500);
  return {...base,impactAt,releaseAt,settleAt,duration:Math.max(RED_RUSH_DURATION_MS,base.duration,settleAt+170)};
}

export function redRushBatterShot(shot,reduced=false){
  if(!hasPitchVisual(shot)||reduced)return shot;
  return {...shot,motion:{...redRushTimeline(shot.motion),syncToPitcher:true}};
}