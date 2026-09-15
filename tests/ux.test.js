import {describe,it,expect} from 'vitest';
import {createDuel} from '../src/duel/engine.js';
import {rewardLinks,failureJourney,runStoryItems} from '../src/duel/ux.js';

describe('decision UX models',()=>{
  it('shows how a reward card connects to cards already in the deck',()=>{
    const s=createDuel(1,'starter');
    const links=rewardLinks(s.deck,'rally');
    expect(links.some(x=>x.name==='릴리스 간파'&&x.kind==='synergy')).toBe(true);
  });

  it('turns a miss into READ → BET → REVEAL → IMPACT explanation',()=>{
    const s=createDuel(1,'starter');
    s.battle={revealed:{kind:'whiff',label:'헛스윙',zone:1,coverage:[4],aimZone:4}};
    const journey=failureJourney(s,{grade:'near-miss',title:'한 칸 차이',detail:'커버 바로 옆을 통과했다'});
    expect(journey.cause).toContain('한 칸');
    expect(journey.steps.map(x=>x.label)).toEqual(['READ','BET','REVEAL','IMPACT']);
    expect(journey.steps.at(-1).state).toBe('fail');
  });

  it('builds a linear story from opponent, draft and facility decisions',()=>{
    const s=createDuel(1,'starter');
    s.routeHistory=['giant-road'];
    s.rewards=[{type:'add',kind:'slug'}];
    s.facilities=[{type:'scouting'}];
    s.phase='map';
    const story=runStoryItems(s);
    expect(story.map(x=>x.label)).toEqual(['START','GAME 1','DRAFT','BETWEEN']);
    expect(story.some(x=>x.title.includes('강팀 원정'))).toBe(true);
    expect(story.some(x=>x.title.includes('당겨 넘기기'))).toBe(true);
  });
});
