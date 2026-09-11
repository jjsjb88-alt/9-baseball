import {describe,it,expect} from 'vitest';
import {createDuel,startBattle,playCard,endTurn,chooseCard,advanceBatter,advancePitch,setAimZone,coverage,hitProfile,previewCard,setGrowthMode,growthProblem,saveDuel,readDuel,matchup} from '../src/duel/engine.js';
import {GROWTHS,STAGES,rewardChoices} from '../src/duel/cards.js';
function pitch(s,zone=s.battle.aimZone,roll=.5,powerRoll=.99){s.battle.pending={zone,roll,powerRoll};return s;}
function hand(s,kind='strike'){s.deck[0].kind=kind;const all=[...s.battle.hand,...s.battle.draw,...s.battle.discard];s.battle.hand=['c0'];s.battle.draw=all.filter(x=>x!=='c0');s.battle.discard=[];return s;}
function reward(s=startBattle(createDuel(1))){s=hand(s);s.battle.runs=STAGES[s.stage].target-1;s.battle.bases=[null,null,'p8'];s.battle.pending={zone:s.battle.aimZone,roll:.5,powerRoll:.99};return playCard(s,'c0');}
function grown(key,rank=1){
  let s=reward();for(let i=0;i<rank;i++){s=chooseCard(s,'skip',key);s=startBattle(s);if(i<rank-1){s.battle.runs=2;s.battle.bases=[null,null,'p8'];s=playCard(pitch(hand(s)),'c0');}}
  return hand(s);
}
function kindPitch(s,label){let offset=0;for(const t of hitProfile(s,'c0',s.battle.aimZone)){if(t.label===label){expect(t.p).toBeGreaterThan(0);return pitch(s,s.battle.aimZone,.5,offset+t.p/2);}offset+=t.p;}throw Error('missing hit type');}
function roundtrip(s){const m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};saveDuel(storage,s);expect(readDuel(storage)).toEqual(s);}
describe('growth changes choices while preserving zone-hit guarantee',()=>{
  it('requires one valid growth and commits card + growth exactly once',()=>{
    const s=reward(),before=structuredClone(s);expect(chooseCard(s,'rally')).toBe(s);expect(chooseCard(s,'rally','unknown')).toBe(s);
    expect(chooseCard(s,'slug','relay')).toBe(s);expect(s).toEqual(before);
    const n=chooseCard(s,'bunt','relay');expect(n.growth.relay).toBe(1);expect(n.deck.at(-1).kind).toBe('bunt');expect(n.growthHistory).toEqual(['relay']);expect(n.phase).toBe('map');
    expect(chooseCard(n,'bunt','relay')).toBe(n);roundtrip(n);roundtrip(startBattle(n));
  });
  it('supports rank-three growth and mixed acquisition, preserving signature rewards',()=>{
    for(const key of Object.keys(GROWTHS)){const s=grown(key,3);expect(s.growth[key]).toBe(3);expect(s.growthHistory).toEqual([key,key,key]);expect(rewardChoices(0,key)).toContain(GROWTHS[key].signature);roundtrip(s);}
    let s=chooseCard(reward(),'skip','patience');s=startBattle(s);s.battle.runs=1;s=chooseCard(reward(s),'skip','fortune');expect(s.growth).toEqual({patience:1,relay:0,fortune:1});roundtrip(s);
  });
  it('only surviving watched strikes build patience; third strike remains an out',()=>{
    let s=grown('patience');s=endTurn(pitch(s,9));expect(s.battle.waitCharge).toBe(0);s=advancePitch(s);
    s=endTurn(pitch(s,4));expect(s.battle.waitCharge).toBe(1);s=advancePitch(s);
    s=endTurn(pitch(s,4));expect(s.battle.waitCharge).toBe(2);s=advancePitch(s);
    s=endTurn(pitch(s,4));expect(s.phase).toBe('between');expect(s.battle.waitCharge).toBe(2);expect(s.battle.outs).toBe(1);roundtrip(s);
    s=advanceBatter(s);expect(s.battle.waitCharge).toBe(0);
  });
  it('patience narrows even expanded coverage and improves BASIC hit quality',()=>{
    let s=grown('patience');s=endTurn(pitch(s,4));s=advancePitch(s);s.battle.expanded=true;
    const before=structuredClone(s),p=previewCard(s,'basic'),n=setGrowthMode(s,'patience');
    expect(coverage(s,'basic').length).toBeGreaterThan(1);expect(coverage(n,'basic')).toEqual([n.battle.aimZone]);
    expect(previewCard(n,'basic').types[0].p).toBeGreaterThan(p.types[0].p);expect(n.battle.pending).toEqual(s.battle.pending);expect(s).toEqual(before);
    const cancel=setGrowthMode(n,'normal');expect(cancel.battle.waitCharge).toBe(1);expect(cancel.pitchSeed).toBe(s.pitchSeed);roundtrip(n);
    const hit=playCard(pitch(n),'basic');expect(hit.stats.hits-s.stats.hits).toBe(1);expect(hit.battle.waitCharge).toBe(0);expect(hit.growthStats.patienceSwings).toBe(1);expect(hit.battle.revealed.coverage).toHaveLength(1);roundtrip(hit);
  });
  it('patience is spent on a miss, but selecting or preparing does not spend it',()=>{
    let s=grown('patience');s.battle.waitCharge=1;s=setGrowthMode(s,'patience');s=hand(s,'setup');s=playCard(s,'c0');expect(s.battle.waitCharge).toBe(1);
    const miss=playCard(pitch(s,9,.99),'basic');expect(miss.battle.waitCharge).toBe(0);expect(miss.growthStats.patienceSwings).toBe(1);expect(miss.battle.growthMode).toBe('normal');expect(miss.phase).toBe('pitch');roundtrip(miss);
  });
  it('all growth ranks keep hit distributions normalized and hits guaranteed',()=>{
    for(const key of Object.keys(GROWTHS))for(let rank=1;rank<=3;rank++){
      let s=grown(key,rank);s=hand(s,'slug');s.battle.waitCharge=2;s.battle.relayActive=s.growth.relay;s.fortune=6;
      if(key!=='relay')s=setGrowthMode(s,key);
      for(let z=0;z<9;z++){s=setAimZone(s,z);const types=hitProfile(s,'c0',z);expect(types.every(t=>t.p>=0)).toBe(true);expect(types.reduce((a,t)=>a+t.p,0)).toBeCloseTo(1);
        for(const roll of [0,.3,.8,.99999]){const n=playCard(pitch(s,z,roll,roll),'c0');expect(n.stats.hits-s.stats.hits).toBe(1);expect(n.battle.outs).toBe(s.battle.outs);}}
    }
  });
  it('successful sacrifice passes a sign to exactly the next PA, not an immediate move by the next hitter',()=>{
    let s=hand(grown('relay'),'bunt');s.battle.bases[0]='p8';s=playCard(pitch(s,4,.5),'c0');
    expect(s.battle.bases).toEqual([null,'p8',null]);expect(s.battle.relayPending).toBe(1);expect(s.battle.relayActive).toBe(0);roundtrip(s);
    s=advanceBatter(s);expect(s.battle.relayPending).toBe(0);expect(s.battle.relayActive).toBe(1);const raw={...s,battle:{...s.battle,relayActive:0}};
    expect(matchup(s).hitter.technique-matchup(raw).hitter.technique).toBe(10);
    const n=playCard(pitch(s),'basic');expect(n.battle.runs).toBe(1);expect(n.battle.bases[0]).toBe('p2');expect(n.growthStats.relayHits).toBe(1);
    expect(advanceBatter(n).battle.relayActive).toBe(0);roundtrip(n);
  });
  it('no sacrifice sign for empty bases, third out, or a failed bunt',()=>{
    for(const mode of ['empty','third','foul']){
      const s=hand(grown('relay'),'bunt');if(mode!=='empty')s.battle.bases[0]='p8';if(mode==='third')s.battle.outs=2;
      const n=playCard(pitch(s,4,mode==='foul'?.01:.5),'c0');expect(n.battle.relayPending).toBe(0);expect(n.growthStats.relayCreated).toBe(0);roundtrip(n);
    }
  });
  it('relay lasts through foul/whiff in that PA and is not carried into a new battle',()=>{
    let s=grown('relay');s.battle.relayActive=1;s=playCard(pitch(s,0,.99),'c0');expect(s.battle.relayActive).toBe(1);
    s=advancePitch(s);expect(s.battle.relayActive).toBe(1);
    s.battle.runs=2;s.battle.bases[2]='p8';s=playCard(pitch(s),'basic');expect(s.phase).toBe('reward');
    s=startBattle(chooseCard(s,'skip','relay'));expect(s.battle.relayActive).toBe(0);expect(s.battle.relayPending).toBe(0);roundtrip(s);
  });
  it('ground and bloop hits build luck, center hits do not; cap and rank gains apply',()=>{
    for(const [label,gain] of [['땅볼 안타',1],['바가지 안타 · 행운의 단타',2],['중전안타',0]]){
      const s=grown('fortune'),n=playCard(kindPitch(s,label),'c0');expect(n.fortune).toBe(gain);expect(n.growthStats.fortuneEarned).toBe(gain);roundtrip(n);
    }
    const s=grown('fortune',3);s.fortune=5;const n=playCard(kindPitch(s,'바가지 안타 · 행운의 단타'),'c0');expect(n.fortune).toBe(6);expect(n.growthStats.fortuneEarned).toBe(1);roundtrip(n);
  });
  it('luck reservation consumes only on non-HR hit and advances hitter and runners without changing credited hit bases',()=>{
    let s=grown('fortune');s.fortune=3;s.battle.bases[0]='p8';const seed=s.pitchSeed;
    s=setGrowthMode(s,'fortune');expect(s.fortune).toBe(3);expect(s.pitchSeed).toBe(seed);roundtrip(s);
    const n=playCard(kindPitch(s,'중전안타'),'c0');expect(n.fortune).toBe(0);expect(n.battle.bases).toEqual([null,'p1','p8']);expect(n.stats.totalBases-s.stats.totalBases).toBe(1);expect(n.growthStats.fortuneUses).toBe(1);roundtrip(n);
    expect(playCard(n,'basic')).toBe(n);
  });
  it('miss conserves reserved luck, spending hit cannot immediately recharge, and HR conserves it',()=>{
    let s=grown('fortune');s.fortune=3;s=setGrowthMode(s,'fortune');
    const miss=playCard(pitch(s,0,.99),'c0');expect(miss.fortune).toBe(3);expect(miss.battle.growthMode).toBe('fortune');roundtrip(miss);
    const ground=playCard(kindPitch(s,'땅볼 안타'),'c0');expect(ground.fortune).toBe(0);expect(ground.growthStats.fortuneEarned).toBe(0);
    s=hand(s,'slug');s.battle.aim=2;s.build='pull';const hr=playCard(pitch(s,s.battle.aimZone,.5,0),'c0');expect(hr.battle.revealed.label).toBe('홈런');expect(hr.fortune).toBe(3);expect(hr.growthStats.fortuneUses).toBe(0);
  });
  it('fortune carries across battles; weak hits do not charge it before growth is acquired',()=>{
    let s=grown('fortune');s.fortune=2;s.battle.runs=2;s.battle.bases[2]='p8';s=playCard(kindPitch(s,'중전안타'),'c0');
    const n=startBattle(chooseCard(s,'skip','fortune'));expect(n.fortune).toBe(2);expect(n.growth.fortune).toBe(2);roundtrip(n);
    const raw=hand(startBattle(createDuel(1)));expect(playCard(kindPitch(raw,'땅볼 안타'),'c0').fortune).toBe(0);
  });
  it('rejects unavailable modes, invalid ranks, fabricated rewards, and invalid meter values',()=>{
    const raw=startBattle(createDuel(1));expect(setGrowthMode(raw,'fortune')).toBe(raw);expect(setGrowthMode(raw,'bogus')).toBe(raw);expect(growthProblem(raw,'patience')).toBeTruthy();
    const store={data:null,setItem(k,v){this.data=v},getItem(){return this.data}};
    for(const corrupt of [s=>s.growth.fortune=3,s=>s.growthHistory=['fortune'],s=>s.fortune=-1,s=>s.fortune=7,s=>s.battle.growthMode='fortune',s=>s.battle.waitCharge=3]){
      const s=startBattle(createDuel(1));corrupt(s);saveDuel(store,s);expect(()=>readDuel(store)).toThrow();
    }
  });
});
