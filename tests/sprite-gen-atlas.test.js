import {describe,expect,it} from 'vitest';
import {
  spriteGenElapsedAtFrame,
  spriteGenFrameAt,
  spriteGenStateContract,
  spriteGenSyncedElapsed,
  spriteGenSyncedFrameAt,
  validateSpriteGenManifest,
} from '../src/duel/spriteGenAtlas.js';

const manifest={
  game_input:'sprite-sheet-alpha.png',
  degraded_static_fallback:false,
  animation:{
    rows:{
      swing:{frames:3,fps:10,loop:false,durations_ms:[100,150,250]},
      idle:{frames:2,fps:4,loop:true},
    },
  },
  frame_layout:{
    sheetWidth:576,
    sheetHeight:384,
    cellWidth:192,
    cellHeight:192,
    rows:{
      swing:[
        {x:0,y:0,w:192,h:192},
        {x:192,y:0,w:192,h:192},
        {x:384,y:0,w:192,h:192},
      ],
      idle:[
        {x:0,y:192,w:192,h:192},
        {x:192,y:192,w:192,h:192},
      ],
    },
  },
};

describe('spriteGenAtlas',()=>{
  it('uses manifest durations instead of assuming a fixed grid/fps',()=>{
    expect(spriteGenFrameAt(manifest,'swing',0)?.index).toBe(0);
    expect(spriteGenFrameAt(manifest,'swing',99)?.index).toBe(0);
    expect(spriteGenFrameAt(manifest,'swing',100)?.index).toBe(1);
    expect(spriteGenFrameAt(manifest,'swing',249)?.index).toBe(1);
    expect(spriteGenFrameAt(manifest,'swing',250)?.index).toBe(2);
    expect(spriteGenFrameAt(manifest,'swing',9999)?.index).toBe(2);
  });

  it('loops states from manifest when loop is enabled',()=>{
    expect(spriteGenFrameAt(manifest,'idle',0)?.index).toBe(0);
    expect(spriteGenFrameAt(manifest,'idle',249)?.index).toBe(0);
    expect(spriteGenFrameAt(manifest,'idle',250)?.index).toBe(1);
    expect(spriteGenFrameAt(manifest,'idle',500)?.index).toBe(0);
  });

  it('reports elapsed time of semantic marker frame indices',()=>{
    expect(spriteGenElapsedAtFrame(manifest,'swing',0)).toBe(0);
    expect(spriteGenElapsedAtFrame(manifest,'swing',1)).toBe(100);
    expect(spriteGenElapsedAtFrame(manifest,'swing',2)).toBe(250);
  });

  it('maps native contact timing onto the existing presentation impact',()=>{
    const motionMap={markers:{contact:2}};
    const motion={impactAt:1000,duration:2000};
    expect(spriteGenSyncedElapsed(manifest,'swing',motionMap,motion,0)).toBe(0);
    expect(spriteGenSyncedElapsed(manifest,'swing',motionMap,motion,500)).toBe(125);
    expect(spriteGenSyncedElapsed(manifest,'swing',motionMap,motion,1000)).toBe(250);
    expect(spriteGenSyncedElapsed(manifest,'swing',motionMap,motion,1500)).toBe(375);
    expect(spriteGenSyncedElapsed(manifest,'swing',motionMap,motion,2000)).toBe(500);
    expect(spriteGenSyncedFrameAt(manifest,'swing',motionMap,motion,1000)?.index).toBe(2);
  });

  it('exposes a normalized row contract',()=>{
    const row=spriteGenStateContract(manifest,'swing');
    expect(row?.frameCount).toBe(3);
    expect(row?.totalMs).toBe(500);
    expect(row?.loop).toBe(false);
  });

  it('validates atlas geometry and animation/frame counts',()=>{
    const result=validateSpriteGenManifest(manifest,{state:'swing',cellSize:192,minFrames:3});
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects degraded, mismatched, or out-of-bounds animated assets',()=>{
    const broken=structuredClone(manifest);
    broken.degraded_static_fallback=true;
    broken.animation.rows.swing.frames=4;
    broken.frame_layout.rows.swing[2]={x:500,y:0,w:192,h:192};
    const result=validateSpriteGenManifest(broken,{state:'swing',cellSize:192,minFrames:3});
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toMatch(/degraded_static_fallback/);
    expect(result.errors.join('\n')).toMatch(/does not match/);
    expect(result.errors.join('\n')).toMatch(/out of bounds/);
  });
});
