import {describe,it,expect} from 'vitest';
import {createDuel,startBattle,playCard,chooseReward,endTurn,advancePitch,advanceBatter,setAimZone,setGrowthMode,saveDuel,readDuel,publicProbabilities,previewCard,swingOdds,coverage,knownPitchZones} from '../src/duel/engine.js';
import {coverageBounds,coverageText} from '../src/duel/information.js';
import {perceivedProbabilities,planAction} from '../src/duel/policy.js';
import {CARDS,RELIC_OFFERS,rewardChoices} from '../src/duel/cards.js';
function held(kind,plus=false){const s=startBattle(createDuel(1));s.deck[0]={id:'c0',kind,plus};return s;}
function roundtrip(s){let raw;const storage={setItem:(k,v)=>{raw=v},getItem:()=>raw};saveDuel(storage,s);expect(readDuel(storage)).toEqual(s);}
describe('release contracts',()=>{
  it('bunt upgrade changes actual sacrifice probability, not an unused power stat',()=>{
    expect(swingOdds(held('bunt'), 'c0',5)).toMatchObject({sacrifice:.7,foul:.3,hit:0});
    expect(swingOdds(held('bunt',true),'c0',5)).toMatchObject({sacrifice:.85,foul:.15,hit:0});
    for(const plus of [false,true]){const s=held('bunt',plus);s.battle.strikes=2;s.battle.pending={zone:5,roll:.1,powerRoll:.5};expect(playCard(s,'c0').battle.outs).toBe(1);}
  });
  it('cut upgrade improves survival by twelve points, including patient and balls',()=>{
    for(const zone of [0,9])for(const patient of [false,true]){
      const a=held('defend'),b=held('defend',true);a.battle.patient=b.battle.patient=patient;
      expect(swingOdds(b,'c0',zone).foul-swingOdds(a,'c0',zone).foul).toBeCloseTo(.12);
    }
    expect(swingOdds(held('defend',true),'c0',5).hit).toBe(1);
  });
  it('scout plus exposes a column consistently in clue, policy and preview without reroll',()=>{
    let s=held('scout',true);s.battle.pending={zone:5,roll:.8,powerRoll:.9};const before=structuredClone(s.battle.pending);
    s=playCard(s,'c0');expect(s.battle.pending).toEqual(before);
    expect(knownPitchZones(s)).toEqual([5]);
    expect(publicProbabilities(s)).toEqual([0,0,0,0,0,1,0,0,0,0]);
    expect(perceivedProbabilities(s,0)).toEqual(publicProbabilities(s));
    s=setAimZone(s,5);expect(previewCard(s,'basic').hit).toBe(1);expect(coverageText(s,'basic')).toBe('범위 도착 확정');
  });
  it('a normal scouting clue excludes other rows and balls even at reading level zero',()=>{
    let s=held('scout');s.battle.pending={zone:5,roll:.5,powerRoll:.5};s=playCard(s,'c0');
    const p=perceivedProbabilities(s,0);for(const z of [0,1,2,6,7,8,9])expect(p[z]).toBe(0);
    expect(coverageText(setAimZone(s,0),'basic')).toBe('범위 도착 불가');
  });
  it('hidden digits cannot be reconstructed by moving BASIC across matching categories',()=>{
    const a=held('slug'),b=held('slug');
    a.battle.intent.probabilities=[.14,.20,.21,.06,.06,.06,.06,.06,.06,.09];
    b.battle.intent.probabilities=[.20,.14,.21,.06,.06,.06,.06,.06,.06,.09];
    for(let z=0;z<9;z++)expect(coverageText(setAimZone(a,z),'basic')).toBe(coverageText(setAimZone(b,z),'basic'));
  });
  it('every disclosed interval contains the true coverage probability',()=>{
    for(const build of ['pull','away','contact'])for(let seed=1;seed<=12;seed++){
      let s=startBattle(createDuel(seed,build));
      for(const relics of [[],['scope'],['radar'],['ledger'],['scope','ledger']]){
        s.relics=relics;
        for(const id of ['basic',...s.battle.hand.filter(id=>CARDS[s.deck.find(c=>c.id===id).kind].type==='attack')])for(let z=0;z<9;z++){
          const aimed=setAimZone(s,z),p=publicProbabilities(aimed),truth=coverage(aimed,id).reduce((n,z)=>n+p[z],0),[lo,hi]=coverageBounds(aimed,id);
          expect(lo).toBeLessThanOrEqual(truth+1e-8);expect(hi).toBeGreaterThanOrEqual(truth-1e-8);
        }
      }
    }
  });
  it('all reward modes survive full runs and save reloads without duplicate actions',()=>{
    const seen=new Set();
    for(const mode of ['add','remove','upgrade','relic','skip'])for(const build of ['pull','away','contact'])for(let seed=1;seed<=3;seed++){
      let s=createDuel(seed,build),steps=0;
      while(!['won','lost'].includes(s.phase)&&steps++<1000){
        if(s.phase==='map')s=startBattle(s);
        else if(s.phase==='pitch')s=advancePitch(s);
        else if(s.phase==='between')s=advanceBatter(s);
        else if(s.phase==='reward'){
          const action=mode==='add'?{type:mode,kind:rewardChoices(s.stage,'fortune')[0]}:
            mode==='relic'?{type:mode,kind:RELIC_OFFERS[s.stage].find(k=>!s.relics.includes(k))}:
            mode==='skip'?{type:mode}:{type:mode,id:s.deck.find(c=>mode!=='upgrade'||!c.plus).id};
          const next=chooseReward(s,action,'fortune');expect(next).not.toBe(s);s=next;seen.add(mode);
          expect(chooseReward(s,action,'fortune')).toBe(s);
        }else{const a=planAction(s);s=setGrowthMode(setAimZone(s,a.zone),a.mode);s=a.id?playCard(s,a.id):endTurn(s);}
        roundtrip(s);
      }
      expect(['won','lost']).toContain(s.phase);
    }
    expect(seen.size).toBe(5);
  },30000);
});
