export const BATTER_MOTION_V2_SEQUENCE=[
  'ready',
  'load',
  'trigger',
  'swing-start',
  'contact',
  'follow-through-early',
  'finish',
  'settle',
];

export const BATTER_MOTION_V2_HIT_GRADES=new Set([
  'dead-center','solid','jammed','lucky','extra','homer','grand-slam',
]);

export const BATTER_MOTION_V2_MISS_GRADES=new Set([
  'near-miss','near-miss-k','chase','chase-k','fooled','strikeout',
]);

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const rounded=value=>Math.max(0,Math.round(value));

export function batterMotionV2Timeline(shot){
  if(!shot)return [{pose:'ready',at:0}];
  const grade=shot.grade||'';
  const motion=shot.motion||{};
  const impact=clamp(Number(motion.impactAt)||240,180,360);
  const settleAt=Math.max(impact+360,Number(motion.settleAt)||impact+520);
  const duration=Math.max(settleAt+120,Number(motion.duration)||settleAt+280);
  const loadAt=rounded(clamp(impact*0.22,44,76));
  const triggerAt=rounded(clamp(impact*0.50,92,170));
  const swingStartAt=rounded(clamp(impact*0.76,145,255));

  if(BATTER_MOTION_V2_HIT_GRADES.has(grade)){
    // Contact is intentionally held longer than the presentation freeze.
    // This is a discrete authored key-pose hold, not CSS wobble or 60 Hz interpolation.
    const contactHold=rounded(clamp(Math.max(140,(Number(motion.freeze)||0)+(Number(motion.slowmo)||0)*0.45),140,220));
    const followAt=impact+contactHold;
    const finishAt=Math.min(settleAt-150,followAt+clamp((settleAt-followAt)*0.42,150,280));
    return [
      {pose:'ready',at:0},
      {pose:'load',at:loadAt},
      {pose:'trigger',at:triggerAt},
      {pose:'swing-start',at:swingStartAt},
      {pose:'contact',at:rounded(impact)},
      {pose:'follow-through-early',at:rounded(followAt)},
      {pose:'finish',at:rounded(Math.max(followAt+120,finishAt))},
      {pose:'settle',at:rounded(settleAt)},
      {pose:'ready',at:rounded(duration)},
    ];
  }

  if(BATTER_MOTION_V2_MISS_GRADES.has(grade)){
    const followAt=impact+90;
    const finishAt=Math.min(settleAt-130,followAt+180);
    return [
      {pose:'ready',at:0},
      {pose:'load',at:loadAt},
      {pose:'trigger',at:triggerAt},
      {pose:'swing-start',at:swingStartAt},
      {pose:'follow-through-early',at:rounded(followAt)},
      {pose:'finish',at:rounded(Math.max(followAt+120,finishAt))},
      {pose:'settle',at:rounded(settleAt)},
      {pose:'ready',at:rounded(duration)},
    ];
  }

  return [{pose:'ready',at:0},{pose:'settle',at:rounded(Math.min(duration,settleAt))},{pose:'ready',at:rounded(duration)}];
}

export function batterMotionV2PoseAt(shot,elapsedMs){
  const timeline=batterMotionV2Timeline(shot);
  const elapsed=Math.max(0,Number(elapsedMs)||0);
  let pose=timeline[0].pose;
  for(const keyframe of timeline){
    if(keyframe.at>elapsed)break;
    pose=keyframe.pose;
  }
  return pose;
}
