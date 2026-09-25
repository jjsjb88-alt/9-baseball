// @vitest-environment happy-dom
import React from 'react';
import {render,cleanup} from '@testing-library/react';
import {afterEach,describe,it,expect} from 'vitest';
import RunEndSummary,{runEndOf} from '../src/duel/RunEndSummary.jsx';
import {CARDS} from '../src/duel/cards.js';

// V12 P8-1 — the end screen tells the run from its records only: the pitch that ended it (cause chain),
// the opponent's HP left, and each cleared stop with the choice actually taken there.
afterEach(()=>cleanup());
const nodes=[{id:'a1-entry',name:'정규 승부',type:'battle'},{id:'a1-craft',name:'라커룸',type:'locker'},{id:'a1-craft-game',name:'정규 승부',type:'battle'}];
const lost={phase:'lost',pitcher:{name:'차도훈',hp:62,maxHp:72},
  battle:{revealed:{zone:9,label:'헛스윙 삼진',kind:'whiff',action:'place',primaryCoverage:[4],supportCoverages:[],coverage:[4]}},
  v10:{nodeId:'a1-craft-game',lastCombat:{choice:'place',choiceLabel:CARDS.place.name,verdict:'헛스윙 삼진',damage:1,damageRate:1,hpAfter:62},
    utilityHistory:[{nodeId:'a1-craft',kind:'locker',action:{type:'remove',id:'c0',kind:'place',name:CARDS.place.name}}]},
  rewards:[{nodeId:'a1-entry',type:'add',kind:'slug'}],
  runMap:{nodes,completedNodeIds:['a1-entry','a1-craft']},
  stats:{pitches:25,hits:3,walks:0,fouls:0,whiffs:14,runs:1}};

describe('V12 P8-1 run end from records',()=>{
  it('names the opponent and the HP left when the run is lost',()=>{
    const e=runEndOf(lost);
    expect(e.opponent).toBe('차도훈 · HP 62 / 72 남음');
  });
  it('lists each cleared stop with the choice taken, then the stop where it ended',()=>{
    const e=runEndOf(lost);
    expect(e.path).toEqual([
      {name:'정규 승부',did:'승리 · '+CARDS.slug.name+' 추가'},
      {name:'라커룸',did:CARDS.place.name+' 제거'},
      {name:'정규 승부',did:'삼아웃 · 차도훈 HP 62 남김',ended:true},
    ]);
  });
  it('a skipped reward and a run won',()=>{
    const won={...lost,phase:'won',pitcher:{name:'민재호',hp:0,maxHp:124},rewards:[{nodeId:'a1-entry',type:'skip'}],
      runMap:{nodes,completedNodeIds:['a1-entry','a1-craft','a1-craft-game']},v10:{...lost.v10,nodeId:null}};
    const e=runEndOf(won);
    expect(e.opponent).toBe('민재호 · HP 0 / 124 · 강판');
    expect(e.path[0].did).toBe('승리 · 보상 건너뜀');
    expect(e.path.some(p=>p.ended)).toBe(false);
  });
});

describe('V12 P8-1 RunEndSummary',()=>{
  it('shows the ending pitch as a cause chain and the path as a list',()=>{
    render(<RunEndSummary s={lost}/>);
    expect(document.querySelector('.run-end .result-chain')).toBeTruthy();
    expect(document.querySelector('.run-end .result-chain').textContent).toContain('헛스윙 삼진');
    expect([...document.querySelectorAll('.run-end-path li')].map(l=>l.textContent)).toHaveLength(3);
    expect(document.querySelector('.run-end-path li.ended')).toBeTruthy();
  });
  it('renders nothing it has no record for',()=>{
    const {container}=render(<RunEndSummary s={{...lost,battle:null,v10:{utilityHistory:[]},pitcher:null}}/>);
    expect(container.querySelector('.result-chain')).toBeNull();
    expect(container.querySelector('.run-end-opponent')).toBeNull();
  });
});

describe('opponent art on the end and reward screens',()=>{
  it('shows the opponent portrait beside the HP line only when given one',()=>{
    const {container,rerender}=render(<RunEndSummary s={lost} portrait="red-rush.png"/>);
    expect(container.querySelector('.run-end-opponent-art img').getAttribute('src')).toBe('red-rush.png');
    rerender(<RunEndSummary s={lost}/>);
    expect(container.querySelector('.run-end-opponent-art')).toBeNull();
  });
  it('the reward screen shows the knocked-out pitcher only when she has authored art',()=>{
    const app=require('node:fs').readFileSync(require('node:path').resolve(process.cwd(),'src/duel/App.jsx'),'utf8');
    expect(app).toContain("{pitcherPortraits[s.v10?.opponent?.artId]&&<img className=\"opponent-art reward-opponent-art\"");
  });
});
