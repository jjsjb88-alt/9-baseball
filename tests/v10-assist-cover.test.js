import {describe,it,expect} from 'vitest';
import {
  createV10Duel,enterV10Node,setAimZone,previewCard,previewV10Combo,playV10Action,selectV10Combat,
} from '../src/duel/engine.js';
import {validateV10State} from '../src/duel/v10-storage.js';

function armed(){
  let s=createV10Duel(20260917);
  s=enterV10Node(s,'a1-entry');
  s=setAimZone(s,0);
  return s;
}

describe('V10 보조 커버 스윙',()=>{
  it('메인과 보조 카드가 서로 다른 존을 덮고, 넓어진 만큼 장타 페널티가 커진다',()=>{
    const s=armed();
    const main=previewCard(s,'c4');
    const combo=previewV10Combo(s,'c4','c0',8);
    expect(main.coverage).toEqual([0,3,6]);
    expect(combo.primaryCoverage).toEqual([0,3,6]);
    expect(combo.assistCoverage).toEqual([8]);
    expect(combo.coverage).toEqual([0,3,6,8]);
    expect(combo.matchup.widthPenalty).toBe(main.matchup.widthPenalty+7);
    expect(combo.label).toContain('합동 스윙');
  });

  it('메인 범위 밖이어도 보조 범위에 걸리면 단타가 되고 두 카드를 함께 소비한다',()=>{
    let s=armed();
    const hp=s.pitcher.hp,cards=s.stats.cards,pitches=s.stats.pitches;
    s.battle.pending={...s.battle.pending,zone:8,roll:.99,powerRoll:.99};
    s=playV10Action(s,{type:'card',id:'c4',assistId:'c0',assistZone:8});
    expect(s.battle.revealed.label).toBe('보조 커버 단타');
    expect(s.battle.revealed.assistOnly).toBe(true);
    expect(s.battle.revealed.coverage).toEqual([0,3,6,8]);
    expect(s.battle.hand).not.toContain('c4');
    expect(s.battle.hand).not.toContain('c0');
    expect(s.battle.discard).toEqual(expect.arrayContaining(['c4','c0']));
    expect(s.stats.cards-cards).toBe(2);
    expect(s.stats.pitches-pitches).toBe(1);
    expect(hp-s.pitcher.hp).toBe(12);
    expect(selectV10Combat(s).choiceLabel).toBe('밀어치기 + 맞혀놓기');
    expect(selectV10Combat(s).aimLabel).toContain('바깥 낮음');
    expect(validateV10State(s)).toBe(true);
  });

  it('보조 카드를 붙여도 메인 커버 적중은 메인 카드 판정으로 남는다',()=>{
    let s=armed();
    s.battle.pending={...s.battle.pending,zone:0,roll:0,powerRoll:.99};
    s=playV10Action(s,{type:'card',id:'c4',assistId:'c0',assistZone:8});
    expect(s.battle.revealed.kind).toBe('hit');
    expect(s.battle.revealed.assistOnly).toBe(false);
    expect(s.battle.revealed.label).not.toBe('보조 커버 단타');
    expect(s.battle.discard).toEqual(expect.arrayContaining(['c4','c0']));
  });
});
