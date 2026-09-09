import {describe,it,expect} from 'vitest';
import {newRun,startMatch,commitPitch,nextPitch,chooseReward,advanceBases,contactRoll,readRun,serializeRun,pitchModel} from '../src/reboot/engine.js';
import {simulateRun,publicView} from '../src/reboot/policy.js';
const load=s=>readRun({getItem:()=>serializeRun(s)});
describe('LAST LIGHT independent engine',()=>{
  it('scores actual forced walks, singles, doubles and grand slams',()=>{
    expect(advanceBases([true,true,true],'walk')).toEqual({bases:[true,true,true],runs:1});
    expect(advanceBases([false,true,true],'walk')).toEqual({bases:[true,true,true],runs:0});
    expect(advanceBases([true,false,true],'single')).toEqual({bases:[true,true,false],runs:1});
    expect(advanceBases([true,true,false],'double')).toEqual({bases:[false,true,true],runs:1});
    expect(advanceBases([true,true,true],'homerun')).toEqual({bases:[false,false,false],runs:4});
  });
  it('creates only four mastered zones and conserves cards across decisions',()=>{
    let s=startMatch(newRun(98));expect(s.mastery).toEqual([1,3,4,7]);expect(s.hand).toHaveLength(4);
    const before=JSON.stringify(s),n=commitPitch(s,{zone:4,cardIndex:0,wager:2});
    expect(JSON.stringify(s)).toBe(before);expect(n.hand.length+n.draw.length+n.discard.length).toBe(n.deck.length);
    expect(commitPitch(n,{zone:4})).toBe(n);expect(n.stats.pitches).toBe(1);
    expect(commitPitch(s,{zone:-1})).toBe(s);expect(commitPitch(s,{zone:4,wager:9})).toBe(s);
  });
  it('reconstructs the identical hidden pitch from a checkpoint without saving it',()=>{
    let s=startMatch(newRun(123));
    expect(serializeRun(s)).not.toContain('actual');expect(serializeRun(s)).not.toContain('trueOdds');
    expect(load(s)).toEqual(s);
    const choice={zone:7,cardIndex:0,wager:1};
    expect(commitPitch(load(s),choice)).toEqual(commitPitch(s,choice));
    expect(publicView(s)).not.toHaveProperty('actual');expect(publicView(s)).not.toHaveProperty('trueOdds');
  });
  it('makes pitcher habits independent of the current action',()=>{
    const s=startMatch(newRun(5)),p=pitchModel({...s,strikes:2});
    expect(p.trueOdds[7]).toBeGreaterThan(.6);expect(p.publicOdds[7]).toBeLessThan(.2);
    const fox=pitchModel({...s,match:2,strikes:2,aims:[3,3,3,3,3,3]});
    expect(fox.trueOdds[3]).toBeLessThan(pitchModel({...s,match:2,strikes:2}).trueOdds[3]);
  });
  it('ends nine outs without resetting inning counts or granting duplicate rewards',()=>{
    let s=startMatch(newRun(22));
    s={...s,score:2,outs:8,inning:3,strikes:2,pitch:{...s.pitch,actual:4}};
    s=commitPitch(s,{take:true});expect(s.outs).toBe(9);expect(s.last.outcome).toBe('strikeout');
    s=nextPitch(s);expect(s.phase).toBe('bench');expect(s.nextMatch).toBe(true);
    s=chooseReward(s,'mastery');expect(s.match).toBe(1);expect(s.phase).toBe('brief');expect(s.bases).toEqual([false,false,false]);
    expect(chooseReward(s,'mastery')).toBe(s);
  });
  it('caps prolonged counts, preserves basic cards and treats final failure as defeat',()=>{
    let s=startMatch(newRun(9));s={...s,paPitches:11,balls:0,pitch:{...s.pitch,actual:9}};
    const next=commitPitch(s,{take:true});expect(next.last.outcome).toBe('walk');expect(next.hand).toEqual(s.hand);
    s={...s,match:2,outs:8,inning:3,score:0,strikes:2,pitch:{...s.pitch,actual:4}};
    s=nextPitch(commitPitch(s,{take:true}));expect(s.phase).toBe('finished');expect(s.won).toBe(false);
  });
  it('keeps CQ/PQ separate and charges blind power bets',()=>{
    const base={read:'exact',card:'drive',mastered:true,wager:0,power:50};
    const hit=contactRoll(base,()=>.5);expect(hit.cq).toBeGreaterThan(70);expect(hit.pq).toBeGreaterThan(50);
    expect(contactRoll({...base,read:'wrong',card:'power',wager:2},()=>.5).outcome).toBe('miss');
    expect(contactRoll({...base,read:'exact'},()=>.99).outcome).toBe('miss');
  });
  it('finishes deterministic runs, rejects corrupt saves, and preserves all replay stages',()=>{
    for(const seed of [4,91,671,1357]){const a=simulateRun(seed),b=simulateRun(seed);expect(a).toEqual(b);expect(load(a)).toEqual(a);expect(a.stats.pitches).toBeGreaterThan(20);}
    const bad={...newRun(10),match:99};expect(()=>load(bad)).toThrow();
    expect(()=>load({...newRun(10),hand:['invented']})).toThrow();
    expect(()=>load({...newRun(10),bases:null})).toThrow();
    expect(()=>load({...newRun(10),history:[null]})).toThrow();
    expect(()=>load({...newRun(10),matches:[null]})).toThrow();
  });
});
