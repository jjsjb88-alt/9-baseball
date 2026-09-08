import { describe, it, expect } from 'vitest';
import { createRun, enterRunStage, recordRunPitch, continueRun, chooseRunReward, readSavedRun } from '../src/game/run-session.js';
import { resolveShowdownContact } from '../src/game/showdown-engine.js';
const deck = [1,3,4,7].map(zone=>({kind:'zone',zone,style:'normal',mastered:true}));
const round = (r, outcome='single') => {
  r=enterRunStage(r);
  for(let i=0;i<8;i++) r=continueRun(recordRunPitch(r,outcome));
  return r;
};
describe('30 minute run progression',()=>{
  it('completes exactly 48 plate appearances, five rewards and a final victory',()=>{
    let r=createRun(deck);
    for(let stage=0;stage<6;stage++){
      r=round(r); expect(r.results.length).toBe(stage+1);
      if(stage<5){expect(r.status).toBe('reward'); r=chooseRunReward(r,'zone'); expect(r.status).toBe('intro');}
    }
    expect(r.status).toBe('won'); expect(r.pitches).toBe(48); expect(r.rewards).toHaveLength(5);
    expect(new Set(r.deck.map(c=>c.zone)).size).toBe(9);
    expect(recordRunPitch(r,'homerun')).toBe(r);
  });
  it('consumes lives, supports recovery, and ends a failed final even with lives left',()=>{
    let r=round(createRun(deck),'out'); expect(r.lives).toBe(2);
    r=chooseRunReward(r,'recover'); expect(r.lives).toBe(3);
    r=round(r,'out'); r=chooseRunReward(r,'upgrade');
    r=round(r,'out'); r=chooseRunReward(r,'upgrade');
    r=round(r,'out'); expect(r.status).toBe('lost'); expect(r.lives).toBe(0);
    r=round({...createRun(deck), stage:5},'out'); expect(r.status).toBe('lost'); expect(r.lives).toBe(2);
  });
  it('counts walks and two-strike fouls correctly and bounds very long plate appearances',()=>{
    let r=enterRunStage(createRun(deck));
    for(let i=0;i<4;i++) r=recordRunPitch(r,'ball');
    expect(r.points).toBe(1); expect(r.walks).toBe(1); expect(r.status).toBe('atbat');
    expect(recordRunPitch(r,'ball')).toBe(r);
    r=continueRun(r);
    for(let i=0;i<11;i++) r=recordRunPitch(r,'foul');
    expect(r.strikes).toBe(2); expect(r.pa).toBe(1);
    r=recordRunPitch(r,'foul'); expect(r.lastOutcome).toBe('walk'); expect(r.pa).toBe(2);
  });
  it('rejects duplicate rewards and gives upgrades a bounded real CQ/PQ effect',()=>{
    let r=round(createRun(deck)); r=chooseRunReward(r,'upgrade');
    expect(chooseRunReward(r,'upgrade')).toBe(r); expect(r.deck[0].tier).toBe(2);
    const base=resolveShowdownContact({read:'READ',variance:()=>.5});
    const improved=resolveShowdownContact({read:'READ',cardTier:2,variance:()=>.5});
    expect(improved.cq-base.cq).toBe(3); expect(improved.pq-base.pq).toBe(2);
    expect(resolveShowdownContact({read:'READ',mastered:false,cardTier:3,variance:()=>.5})).toEqual(resolveShowdownContact({read:'READ',mastered:false,variance:()=>.5}));
  });
  it('round-trips a checkpoint and rejects invalid saves',()=>{
    const r=recordRunPitch(enterRunStage(createRun(deck)),'strike');
    expect(readSavedRun({getItem:()=>JSON.stringify(r)})).toEqual(r);
    expect(()=>readSavedRun({getItem:()=>JSON.stringify({...r,stage:99})})).toThrow();
    expect(()=>readSavedRun({getItem:()=>JSON.stringify({...r,deck:[null]})})).toThrow();
  });
});
