// @vitest-environment happy-dom
import React from 'react';
import {afterEach,beforeEach,describe,it,expect} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import Duel from '../src/duel/App.jsx';
import {readV10Duel,createV10Duel} from '../src/duel/engine.js';
import {mainRunSeed} from '../src/duel/run-seed.js';

const fakeCrypto=v=>({getRandomValues:a=>{a[0]=v;return a;}});

describe('main run seed',()=>{
  it('draws a fresh seed per run instead of the tutorial comparison seed',()=>{
    expect(mainRunSeed({search:'',crypto:fakeCrypto(7)})).toBe(7);
    expect(mainRunSeed({search:'',crypto:fakeCrypto(0xfffffffe)})).toBe(0xfffffffe);
  });
  it('lets QA pin a run with ?seed=N and ignores malformed values',()=>{
    expect(mainRunSeed({search:'?seed=42',crypto:fakeCrypto(7)})).toBe(42);
    expect(mainRunSeed({search:'?cinema=1&seed=20260910',crypto:fakeCrypto(7)})).toBe(20260910);
    expect(mainRunSeed({search:'?seed=abc',crypto:fakeCrypto(7)})).toBe(7);
  });
  it('different seeds change the opponents and the first pitch plan',()=>{
    const a=createV10Duel(1),b=createV10Duel(2);
    const names=s=>s.runMap.nodes.filter(n=>n.opponent).map(n=>n.opponent.name).join();
    expect(names(a)).not.toBe(names(b));
    expect(a.pitchSeed).not.toBe(b.pitchSeed);
  });
});

describe('main run entry',()=>{
  beforeEach(()=>localStorage.clear());
  afterEach(()=>{cleanup();localStorage.clear();});
  it('two new main runs do not replay the same fixed seed',()=>{
    const seeds=[];
    for(let i=0;i<2;i++){
      render(<Duel/>);
      fireEvent.click(screen.getByRole('button',{name:'MAIN RUN 시작 · 투수 HP'}));
      seeds.push(readV10Duel(localStorage).initialSeed);
      cleanup();
    }
    expect(seeds[0]).not.toBe(20260910);
    expect(seeds[0]).not.toBe(seeds[1]);
  });
});
