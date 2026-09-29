/* V15 hero batter (assets/production-art/battle-portrait-v15, see its README): the target mockup's
   over-the-shoulder adult batter, 8 keyposes on one baseline-aligned 4x2 sheet.
   The runtime plays the ten-pose batterMotionV3 contract plus a miss-only recovery pose.
   Poses without their own drawing reuse the nearest keypose (trigger holds LOAD;
   the late hit follow/finish/settle hold FOLLOW-THROUGH).
   HD illustration, not 1:1 pixel art: it is sampled smooth when scaled down.

   #103 M09: the runtime sheet is the master at half size (512x768 cells, 2048x1536). The batter is
   drawn at most ~340 CSS px tall at devicePixelRatio 2, so 768 px cells still oversample, and the
   texture drops from 48 MB to 12 MB of GPU memory — the 4096 px master was what phones failed to
   upload. Pixi and the DOM fallback both read this one sheet, so whichever renders, it is the same
   batter on the same baseline (the fallback used to be an older batter from another art set). */
import batterV15Sheet from '../../assets/production-art/battle-portrait-v15/batter-sheet-runtime.png';
import rigLegs from '../../assets/production-art/battle-portrait-v15/rig/legs.png';
import rigUpper from '../../assets/production-art/battle-portrait-v15/rig/upper.png';
import rigArms from '../../assets/production-art/battle-portrait-v15/rig/arms.png';
import rigBat from '../../assets/production-art/battle-portrait-v15/rig/bat.png';

export const BATTER_V15_SHEET={
  src:batterV15Sheet,
  cols:4,rows:2,smooth:true,
  /* feet touch the ground 1527/1536 down each cell (manifest.json baseline_px) */
  baseline:1527/1536,
  order:{ready:0,load:1,trigger:1,'swing-start':2,'swing-mid':3,contact:4,'follow-through-early':5,'follow-through-late':6,finish:6,settle:6,'miss-recovery':7},
};

/* one pose of a sheet as CSS background values (the DOM fallback) */
export function sheetCellStyle(sheet,pose){
  const cols=sheet.cols||1,rows=sheet.rows||1,cell=sheet.order?.[pose]??0;
  const col=cell%cols,row=Math.floor(cell/cols);
  return {
    backgroundImage:`url(${sheet.src})`,
    backgroundSize:`${cols*100}% ${rows*100}%`,
    backgroundPosition:`${cols>1?col*100/(cols-1):0}% ${rows>1?row*100/(rows-1):0}%`,
  };
}

/* Cutout rig of the READY pose (scripts/build-batter-rig.py): legs, upper body, arms+gloves and bat
   cut from the same art, so at rest they stack back into the READY cell. BallparkActors shows the rig
   while the batter waits and loads, and hands over to the sheet at TRIGGER, where the swing's fast
   poses take over. Pivots and offsets are in cell pixels (512x768). */

export const BATTER_V15_RIG={
  layers:{legs:rigLegs,upper:rigUpper,arms:rigArms,bat:rigBat},
  cell:[512,768],
  pivots:{waist:[250,395],shoulder:[200,250],hands:[150,185]},
  /* the coil at the end of the load: weight back, hands and bat wound up */
  load:{ux:-9,uy:1.5,ur:-2.2,ar:-5.5,br:-7},
};

/* the idle: breath, sway and bat waggle on different periods, so the loop never reads as a loop */
export function batterRigIdle(now){
  const tau=Math.PI*2,breath=Math.sin(now/2300*tau),sway=Math.sin(now/3100*tau+1.1);
  return {ux:sway*2.2,uy:-2.6*(breath*.5+.5),ur:sway*.45,ar:Math.sin(now/1250*tau)*1.1,br:Math.sin(now/1250*tau-.9)*3.2};
}

/* idle -> load coil, f in 0..1 (eased) */
export function batterRigLoad(now,f){
  const a=batterRigIdle(now),k=Math.max(0,Math.min(1,f)),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2,o={};
  for(const key in BATTER_V15_RIG.load)o[key]=a[key]+(BATTER_V15_RIG.load[key]-a[key])*e;
  return o;
}
