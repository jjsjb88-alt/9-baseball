import {describe,it,expect} from 'vitest';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/golden-master.css',import.meta.url),'utf8');
const motion=fs.readFileSync(new URL('../src/duel/batterMotionV2.js',import.meta.url),'utf8');

describe('production batter motion loop v2',()=>{
  it('keeps the four authored anchors and adds four authored intermediate assets',()=>{
    expect(app).toContain("import batterRebootReady from '../../assets/batter-reboot-v1/batter-ready.png'");
    expect(app).toContain("import batterRebootTrigger from '../../assets/batter-reboot-v1/batter-trigger.png'");
    expect(app).toContain("import batterRebootContact from '../../assets/batter-reboot-v1/batter-contact.png'");
    expect(app).toContain("import batterRebootFinish from '../../assets/batter-reboot-v1/batter-finish.png'");
    expect(app).toContain("import batterRebootLoadV2 from '../../assets/batter-reboot-v2/batter-load.png'");
    expect(app).toContain("import batterRebootSwingStartV2 from '../../assets/batter-reboot-v2/batter-swing-start.png'");
    expect(app).toContain("import batterRebootFollowEarlyV2 from '../../assets/batter-reboot-v2/batter-follow-through-early.png'");
    expect(app).toContain("import batterRebootSettleV2 from '../../assets/batter-reboot-v2/batter-settle.png'");
    expect(app).toContain("const BATTER_REBOOT_V2={");
    expect(app).toContain("'swing-start':batterRebootSwingStartV2");
    expect(app).toContain("'follow-through-early':batterRebootFollowEarlyV2");
    expect(app).toContain("data-batter-pose={displayedRebootPose}");
    expect(app).not.toContain('className="batter-presence"');
  });

  it('defines the required eight-stage authored swing order instead of stage-to-pose cuts',()=>{
    for(const pose of ['ready','load','trigger','swing-start','contact','follow-through-early','finish','settle']){
      expect(motion).toContain("'"+pose+"'");
    }
    expect(motion).toContain('batterMotionV2Timeline');
    expect(app).toContain("import {batterMotionV2Timeline} from './batterMotionV2.js'");
    expect(app).toContain('useBatterMotionV2Pose');
    expect(app).not.toContain("if(stage==='windup')return 'trigger'");
  });

  it('keeps runtime motion asset-driven and responsive rather than CSS pose animation',()=>{
    expect(css).toContain('.golden-master-stage .batter-reboot-v2');
    expect(css).toContain('.batter-reboot-v2.reboot-pose-contact .batter-reboot-art');
    expect(css).toContain('@media (orientation:portrait)');
    expect(css).toContain('@media (orientation:landscape) and (max-height:430px)');
    expect(css).toContain('@media (min-width:1280px) and (orientation:landscape)');
    expect(css).not.toContain('.batter-standin');
    expect(css).not.toContain('.batter-reboot-v2.reboot-pose-trigger .batter-reboot-art{\n  transform:');
    expect(css).not.toContain('.batter-reboot-v2.reboot-pose-contact .batter-reboot-art{\n  transform:');
  });

  it('does not delete the protected V4 infrastructure used by pitcher playback and later 60Hz continuation',()=>{
    expect(app).toContain('<V4CanvasSprite sheet={v4Sheet}');
    expect(app).toContain('function v4SheetFor');
    expect(app).toContain('batterSwingV4');
    expect(app).toContain('pitcherPitchV4');
  });
});
