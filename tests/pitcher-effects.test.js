import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {withKnockoutHold,KNOCKOUT_HOLD_MS,redRushTimeline,RED_RUSH_RELEASE_FRAME} from '../src/duel/pitcher-sd.js';
import {WHIP_FROM,WHIP_TO,KO_DELAY_MS,KO_FALL_MS} from '../src/duel/BallparkActors.jsx';

// V13 BALLPARK BP-11 — pitcher effects: stride dust, arm whip at release, knockout collapse.
const stride=JSON.parse(fs.readFileSync('src/duel/pitcher-stride.json','utf8'));
const release=JSON.parse(fs.readFileSync('src/duel/pitcher-release.json','utf8'));
const actors=fs.readFileSync('src/duel/BallparkActors.jsx','utf8');

describe('pitcher effects',()=>{
  it('every pitcher has a front-foot plant before her release, inside the frame near the ground',()=>{
    for(const id of Object.keys(release)){
      const [k,x,y]=stride[id]||[];
      expect(k,id).toBeLessThan(RED_RUSH_RELEASE_FRAME);expect(k).toBeGreaterThan(30);
      expect(x>=0&&x<=1,id).toBe(true);expect(y).toBeGreaterThan(.85);expect(y).toBeLessThanOrEqual(1);
    }
  });
  it('the whip brackets the release frame and never runs outside the 120-frame atlas',()=>{
    expect(RED_RUSH_RELEASE_FRAME-WHIP_FROM).toBeGreaterThan(0);
    expect(RED_RUSH_RELEASE_FRAME+WHIP_TO).toBeLessThan(120);
  });
  it('the knockout pitch holds the scene long enough for the collapse, and only that pitch',()=>{
    const base=redRushTimeline({duration:1500,impactAt:260,settleAt:1100,freeze:28,slowmo:120,releaseAt:408});
    expect(withKnockoutHold(base,false)).toBe(base);
    const ko=withKnockoutHold(base,true);
    expect(ko.duration).toBe(base.duration+KNOCKOUT_HOLD_MS);
    expect(ko.impactAt).toBe(base.impactAt);expect(ko.releaseAt).toBe(base.releaseAt);
    // collapse (hit-stop + delay + fall) ends before the scene hands over to the reward screen
    expect(base.impactAt+90+KO_DELAY_MS+KO_FALL_MS).toBeLessThan(ko.duration);
    expect(withKnockoutHold(null,true)).toBe(null);
  });
  it('the collapse darkens her instead of fading her out, and reduced motion skips all of it',()=>{
    expect(actors).toMatch(/if\(active&&ko&&!reduced\)/);
    expect(actors).toMatch(/whipOn=active&&!reduced/);
    expect(actors).not.toMatch(/pitcher\.alpha=1-e/);
  });
  it('the battle tells the actors when this pitch knocked her out',()=>{
    expect(fs.readFileSync('src/duel/BallparkBattle.jsx','utf8')).toMatch(/knockedOut=\{judged&&\(pitcher\?\.hp\?\?1\)===0\}/);
    expect(fs.readFileSync('src/duel/App.jsx','utf8')).toMatch(/withKnockoutHold\(/);
  });
});
