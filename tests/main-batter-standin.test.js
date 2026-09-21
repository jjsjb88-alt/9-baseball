import {describe,it,expect} from 'vitest';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/golden-master.css',import.meta.url),'utf8');

describe('production batter asset loop v1',()=>{
  it('routes the golden-master batter to the four authored reboot anchors',()=>{
    const gate=app.indexOf("if(golden&&who==='batter')");
    const v4=app.indexOf('const pose=actorPose');
    expect(gate).toBeGreaterThan(-1);
    expect(v4).toBeGreaterThan(gate);
    expect(app).toContain("import batterRebootReady from '../../assets/batter-reboot-v1/batter-ready.png'");
    expect(app).toContain("import batterRebootTrigger from '../../assets/batter-reboot-v1/batter-trigger.png'");
    expect(app).toContain("import batterRebootContact from '../../assets/batter-reboot-v1/batter-contact.png'");
    expect(app).toContain("import batterRebootFinish from '../../assets/batter-reboot-v1/batter-finish.png'");
    expect(app).toContain('BATTER_REBOOT_V1={idle:batterRebootReady,trigger:batterRebootTrigger,contact:batterRebootContact,finish:batterRebootFinish}');
    expect(app).toContain("className=\"duel-sprite batter-reboot-art\"");
    expect(app).not.toContain('className="batter-presence"');
  });

  it('maps the current cinematic stages to readable static key poses',()=>{
    expect(app).toContain("if(stage==='windup')return 'trigger'");
    expect(app).toContain("['impact','slowmo'].includes(stage))return 'contact'");
    expect(app).toContain("['release','settle'].includes(stage))return 'finish'");
    expect(app).toContain("BATTER_REBOOT_MISS_GRADES.has(grade)");
  });

  it('keeps the authored replacement scoped and responsive',()=>{
    expect(css).toContain('.golden-master-stage .batter-reboot-v1');
    expect(css).toContain('.batter-reboot-v1.reboot-pose-contact .batter-reboot-art');
    expect(css).toContain('@media (orientation:portrait)');
    expect(css).toContain('@media (orientation:landscape) and (max-height:430px)');
    expect(css).toContain('@media (min-width:1280px) and (orientation:landscape)');
    expect(css).not.toContain('.batter-standin');
  });

  it('does not delete the protected V4 infrastructure used by the 60Hz continuation and pitcher playback',()=>{
    expect(app).toContain('<V4CanvasSprite sheet={v4Sheet}');
    expect(app).toContain('function v4SheetFor');
    expect(app).toContain('batterSwingV4');
    expect(app).toContain('pitcherPitchV4');
  });
});
