import {describe,it,expect} from 'vitest';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/golden-master.css',import.meta.url),'utf8');
const motion=fs.readFileSync(new URL('../src/duel/batterMotionV3.js',import.meta.url),'utf8');
const authoring=fs.readFileSync(new URL('../scripts/generate-batter-motion-v3.py',import.meta.url),'utf8');

describe('production batter motion loop v3',()=>{
  it('keeps approved anchors and routes six rigid-layer intermediate assets',()=>{
    expect(app).toContain("import batterRebootReady from '../../assets/batter-reboot-v1/batter-ready.png'");
    expect(app).toContain("import batterRebootTrigger from '../../assets/batter-reboot-v1/batter-trigger.png'");
    expect(app).toContain("import batterRebootContact from '../../assets/batter-reboot-v1/batter-contact.png'");
    expect(app).toContain("import batterRebootFinish from '../../assets/batter-reboot-v1/batter-finish.png'");
    for(const name of ['Load','SwingStart','SwingMid','FollowEarly','FollowLate','Settle'])expect(app).toContain('batterReboot'+name+'V3');
    expect(app).toContain("const BATTER_REBOOT_V3={");
    expect(app).toContain("'swing-mid':batterRebootSwingMidV3");
    expect(app).toContain("'follow-through-late':batterRebootFollowLateV3");
    const runtime=fs.readFileSync(new URL('../src/duel/BatterV3Sprite.jsx',import.meta.url),'utf8');
    expect(runtime).toContain('data-batter-pose="ready"');
  });

  it('uses a ten-pose authored swing with bridge silhouettes around contact',()=>{
    for(const pose of ['ready','load','trigger','swing-start','swing-mid','contact','follow-through-early','follow-through-late','finish','settle']){
      expect(motion).toContain("'"+pose+"'");
    }
    const runtime=fs.readFileSync(new URL('../src/duel/BatterV3Sprite.jsx',import.meta.url),'utf8');
    expect(runtime).toContain("import {batterMotionV3Timeline} from './batterMotionV3.js'");
    expect(app).toContain('<BatterV3Sprite');
    expect(runtime).not.toContain('useState(');
    expect(runtime).not.toContain('flushSync');
  });

  it('prevents the v2 face/bat corruption mechanism in offline authoring',()=>{
    expect(authoring).toContain('protected_bat_mask');
    expect(authoring).toContain('head_layer');
    expect(authoring).toContain('pristine face/helmet wins');
    expect(authoring).toContain('ghost-barrel residue');
    expect(authoring).not.toContain('erase_bat(');
  });

  it('keeps runtime asset-driven and responsive rather than CSS pose animation',()=>{
    expect(css).toContain('.golden-master-stage .batter-reboot-v3');
    expect(css).toContain('.batter-reboot-v3.reboot-pose-contact .batter-reboot-art');
    expect(css).toContain('@media (orientation:portrait)');
    expect(css).toContain('@media (orientation:landscape) and (max-height:430px)');
    expect(css).not.toContain('.batter-standin');
  });

  it('does not delete protected V4 infrastructure used by pitcher playback and later 60Hz continuation',()=>{
    expect(app).toContain('<V4CanvasSprite sheet={v4Sheet}');
    expect(app).toContain('function v4SheetFor');
    expect(app).toContain('batterSwingV4');
    expect(app).toContain('pitcherPitchV4');
  });
});
