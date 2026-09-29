/* SpriteBrew frame registry (docs/spritebrew-plan.md).
   Frames exported from SpriteBrew as "Raw Frames" land in public/sprites/{character}/{animation}/
   as frame_00.png, frame_01.png, … and are served as-is (no Vite import, no WebP swap).

   `frames` is the number of delivered frames. 0 = not delivered yet: spriteFrames() returns []
   and SpritePlayer draws its fallback (the current runtime art). When a ZIP is dropped in, set
   `frames` to the file count — tests/spritebrew-frames.test.js checks every counted file exists.

   Timing comes from the game clock, not from SpriteBrew's preview speed:
   - pitch clock (pitcher-sd.js): release at 76/60 s ≈ 1267 ms, contact PITCH_FLIGHT_MS later ≈ 1567 ms
   - batter (batterMotionV3.js, syncToPitcher): load at contact-320 ms, follow-through ≥ 500 ms
   `keyFrame` is the frame that must line up with the named game event (contact, release). */

export const SPRITEBREW_DIR='sprites';

export const SPRITEBREW_ANIMS={
  batter:{
    idle:{frames:0,fps:3,loop:true},                                   // 8f ≈ 2.6 s, IDLE_BREATH_MS
    swing:{frames:0,fps:15,loop:false,keyFrame:5,keyEvent:'contact'},  // 12f ≈ 800 ms: load→contact 320 ms + follow 480 ms
    miss:{frames:0,fps:15,loop:false,keyFrame:5,keyEvent:'contact'},   // 10f ≈ 670 ms: same load, shorter follow (impact+92…)
    homerun:{frames:0,fps:8,loop:false},                               // 16f = 2 s, homer cinema 1.7–2.2 s
  },
  pitcher:{
    idle:{frames:0,fps:4,loop:true},                                   // 8f = 2 s
    windup:{frames:0,fps:11,loop:false},                               // 12f ≈ 1.09 s: set → leg kick → stride, hands over to release
    release:{frames:0,fps:12,loop:false,keyFrame:2,keyEvent:'release'},// 8f ≈ 670 ms: arm whip → release (starts 1267-167 ms) → follow
  },
};

const pad2=i=>String(i).padStart(2,'0');
const viteBase=()=>{try{return import.meta.env?.BASE_URL||'/';}catch{return '/';}};

export function spriteFramePath(character,animation,index,base=viteBase()){
  const root=base.endsWith('/')?base:base+'/';
  return `${root}${SPRITEBREW_DIR}/${character}/${animation}/frame_${pad2(index)}.png`;
}

export function spriteAnim(character,animation){
  return SPRITEBREW_ANIMS[character]?.[animation]||null;
}

/* frame URLs for one animation, [] while it is not delivered */
export function spriteFrames(character,animation,base){
  const anim=spriteAnim(character,animation);
  if(!anim||!(anim.frames>0))return [];
  return Array.from({length:anim.frames},(_,i)=>spriteFramePath(character,animation,i,base));
}

/* frame index at `elapsedMs`; a one-shot holds its last frame */
export function frameAt(elapsedMs,count,fps,loop=false){
  if(!(count>0)||!(fps>0)||!Number.isFinite(elapsedMs)||elapsedMs<=0)return 0;
  const i=Math.floor(elapsedMs*fps/1000);
  return loop?i%count:Math.min(count-1,i);
}

/* ms from the first frame to keyFrame: start the one-shot at eventAt - keyOffsetMs(anim) */
export function keyOffsetMs(anim){
  return anim?.keyFrame>0&&anim.fps>0?Math.round(anim.keyFrame*1000/anim.fps):0;
}

/* how long a one-shot runs before onComplete (the last frame is shown for one frame time) */
export function animDurationMs(count,fps){
  return count>0&&fps>0?Math.round(count*1000/fps):0;
}
