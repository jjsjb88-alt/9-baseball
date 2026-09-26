// @vitest-environment happy-dom
import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect} from 'vitest';
import Duel from '../src/duel/App.jsx';
import {createV10Duel,enterV10Node,saveV10Duel,readV10Duel,playV10Action,setAimZone,claimV10Reward,v10RewardOptions,v10UtilityOptions} from '../src/duel/engine.js';

// V13 BALLPARK BP-4 — reward and facility stops (docs/design/v13/BALLPARK.md).
beforeEach(()=>{localStorage.clear()});
afterEach(()=>{cleanup()});

function won(){
  let s=createV10Duel(0);s=enterV10Node(s,'a1-entry');
  s={...s,pitcher:{...s.pitcher,hp:1,phase:'critical'}};s=setAimZone(s,s.battle.aimZone);
  return playV10Action(s,{type:'card',id:'basic'});
}
function open(s,park=true){
  saveV10Duel(localStorage,s);
  render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'MAIN RUN 이어하기',exact:true}));
}
const go=()=>screen.getByTestId('bp-stop-go'),skip=()=>screen.getByTestId('bp-stop-skip');
const offers=()=>[...document.querySelectorAll('.bp-offer')];

describe('V13 BALLPARK stops',()=>{
  it('reward: the pitcher goes down, the offers are the engine offers, one pick adds one card',()=>{
    const s=won();expect(s.phase).toBe('reward');open(s);
    expect(document.querySelector('.bp-stop.stop-reward h1').textContent).toBe(s.v10.opponent.name+' 강판');
    const kinds=v10RewardOptions(s);
    expect(offers().map(o=>o.dataset.cardKind)).toEqual(kinds);
    expect(go().disabled).toBe(true);
    fireEvent.click(offers()[0]);
    expect(document.querySelector('.bp-piles').textContent).toContain('→');
    fireEvent.click(go());
    const t=readV10Duel(localStorage);
    expect(t.phase).toBe('map');expect(t.deck.length).toBe(s.deck.length+1);
    expect(t.deck.at(-1).kind).toBe(kinds[0]);
  });
  it('reward can be passed',()=>{
    const s=won();open(s);fireEvent.click(skip());
    const t=readV10Duel(localStorage);expect(t.phase).toBe('map');expect(t.deck.length).toBe(s.deck.length);
  });
  it('locker lists each card kind once and removes the picked copy',()=>{
    let s=won();s=claimV10Reward(s,{type:'add',kind:v10RewardOptions(s)[0]});s=enterV10Node(s,'a1-craft');
    expect(s.phase).toBe('locker');open(s);
    const kinds=[...new Set(v10UtilityOptions(s).map(o=>o.kind))];
    expect(offers().map(o=>o.dataset.cardKind)).toEqual(kinds);
    fireEvent.click(offers()[0]);fireEvent.click(go());
    const t=readV10Duel(localStorage);expect(t.phase).toBe('map');expect(t.deck.length).toBe(s.deck.length-1);
  });
  it('an empty stop has one button back to the map',()=>{
    let s=won();s=claimV10Reward(s,{type:'skip'});s=enterV10Node(s,'a1-craft');
    expect(v10UtilityOptions(s)).toHaveLength(0);open(s);
    expect(document.querySelector('[data-testid=bp-stop-go]')).toBeNull();
    expect(skip().textContent).toBe('지도로');
    fireEvent.click(skip());expect(readV10Duel(localStorage).phase).toBe('map');
  });
});

describe('V13 BALLPARK run end',()=>{
  it('has two choices only: again or title',()=>{
    let s=createV10Duel(0);s=enterV10Node(s,'a1-entry');s={...s,phase:'lost'};open(s);
    const end=document.querySelector('.bp-end');
    expect(end).not.toBeNull();
    expect([...end.querySelectorAll('.bp-verbs button')].map(b=>b.textContent)).toEqual(['다시 도전','타이틀']);
  });
});

describe('V13 reward voice',()=>{
  it('the knocked-out pitcher says her knockout line, big, on the reward screen only',async()=>{
    const {PITCHER_VOICE}=await import('../src/duel/pitcher-voice.js');
    const s=won();open(s);
    const q=screen.getByTestId('bp-kovoice');
    expect(PITCHER_VOICE[s.v10.opponent.artId].knockout).toContain(q.textContent);
    fireEvent.click(skip());
    expect(screen.queryByTestId('bp-kovoice')).toBeNull();
  });
});
