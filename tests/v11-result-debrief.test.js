import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {lessonFor,planText} from '../src/duel/DecisionDebrief.jsx';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const component=fs.readFileSync(new URL('../src/duel/DecisionDebrief.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/decision-debrief.css',import.meta.url),'utf8');

describe('V11 result debrief',()=>{
  it('appears only in the first two V10 plate appearances',()=>{
    expect(app).toContain("import DecisionDebrief from './DecisionDebrief.jsx'");
    expect((app.match(/<DecisionDebrief/g)||[]).length).toBe(2);
    expect((app.match(/isV10&&b\.turn<=2&&v10Combat&&<DecisionDebrief/g)||[]).length).toBe(2);
  });

  it('teaches precision reward after an exact MAIN hit',()=>{
    const lesson=lessonFor(
      {choice:'place',cardCount:1,precisionBonus:6,damageRate:1},
      {zone:4,primaryCoverage:[4],assistOnly:false,label:'중전안타'}
    );
    expect(lesson.tone).toBe('success');
    expect(lesson.title).toContain('정타 노림 성공');
    expect(lesson.text).toContain('+6 HP');
    expect(planText({choice:'place',cardCount:1})).toContain('×1.5');
  });

  it('teaches when STACK support saved a missed main route',()=>{
    const lesson=lessonFor(
      {choice:'strike',cardCount:3,connectCount:1,damageRate:.72},
      {zone:8,primaryCoverage:[0,3,6],assistOnly:true,label:'겹친 카드 단타'}
    );
    expect(lesson.tone).toBe('success');
    expect(lesson.title).toContain('STACK');
    expect(lesson.text).toContain('지원 카드');
  });

  it('teaches broken order without changing the stack math',()=>{
    const lesson=lessonFor(
      {choice:'strike',cardCount:4,connectCount:1,damageRate:.57},
      {zone:3,primaryCoverage:[0,3,6],assistOnly:false,label:'중전안타'}
    );
    expect(lesson.tone).toBe('warn');
    expect(lesson.title).toContain('경로가 끊겼습니다');
    expect(lesson.text).toContain('BREAK 2개');
    expect(lesson.text).toContain('57%');
  });

  it('calls out chasing a pitch outside the zone',()=>{
    const lesson=lessonFor(
      {choice:'strike',cardCount:1,damageRate:1},
      {zone:9,primaryCoverage:[2,5,8],assistOnly:false,label:'헛스윙'}
    );
    expect(lesson.tone).toBe('danger');
    expect(lesson.title).toContain('유인구');
    expect(lesson.text).toContain('지켜보기');
  });

  it('uses only already revealed result data, not hidden pitch state',()=>{
    expect(component).not.toContain('pending');
    expect(component).not.toContain('probabilities');
    expect(component).not.toContain('publicProbabilities');
    expect(component).toContain('revealed.zone');
    expect(component).toContain('revealed.primaryCoverage');
  });

  it('stays compact on portrait and low-height landscape',()=>{
    expect(css).toContain('@media (orientation:portrait) and (max-width:430px)');
    expect(css).toContain('@media (orientation:landscape) and (max-height:430px)');
    expect(css).toContain('grid-template-areas');
  });
});
