// @vitest-environment happy-dom
import React from 'react';
import {render,cleanup} from '@testing-library/react';
import {afterEach,describe,it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ChoiceOutcome,{choiceOutcomeOf} from '../src/duel/ChoiceOutcome.jsx';
import {CARDS,cardText,upgradeText,DECK_MIN,DECK_MAX} from '../src/duel/cards.js';
import {V10_RELICS} from '../src/duel/v10-relics.js';

// V12 P6-1 — before confirming a reward or a facility, say exactly what changes: the card or relic,
// the deck count before → after (with its limit), and for an upgrade the rule before and after.
afterEach(()=>cleanup());
const deck=kinds=>kinds.map((kind,i)=>({id:'c'+i,kind}));
const st=kinds=>({deck:deck(kinds)});

describe('V12 P6-1 choice outcome',()=>{
  it('adding a card: deck count and limit',()=>{
    const o=choiceOutcomeOf(st(['place','place','strike']),{type:'add',kind:'slug'});
    expect(o.title).toBe('추가 · '+CARDS.slug.name);
    expect(o.lines).toContain('덱 3장 → 4장 (최대 '+DECK_MAX+'장)');
    expect(o.lines).toContain(cardText('slug',false));
  });
  it('removing a card: deck count, copies left and the floor',()=>{
    const s=st(['place','place','strike','scout']);
    const o=choiceOutcomeOf(s,{type:'remove',id:'c0',kind:'place'});
    expect(o.title).toBe('제거 · '+CARDS.place.name);
    expect(o.lines).toContain('덱 4장 → 3장 (최소 '+DECK_MIN+'장)');
    expect(o.lines).toContain('같은 카드 1장 남음');
  });
  it('upgrading: the rule before and after, from the card texts',()=>{
    const o=choiceOutcomeOf(st(['strike']),{type:'upgrade',id:'c0',kind:'strike'});
    expect(o.title).toBe('강화 · '+CARDS.strike.name+' → '+CARDS.strike.name+'+');
    expect(o.lines).toContain('강화 효과 · '+upgradeText('strike'));
    expect(o.before).toBe(cardText('strike',false));
    expect(o.after).toBe(cardText('strike',true));
  });
  it('a relic and a rest day',()=>{
    const key=Object.keys(V10_RELICS)[0];
    const r=choiceOutcomeOf(st(['place']),{type:'relic',relic:key});
    expect(r.title).toBe('유물 · '+V10_RELICS[key].name);
    expect(r.lines).toContain(V10_RELICS[key].text);
    const rest=choiceOutcomeOf(st(['place']),{type:'rest'});
    expect(rest.lines).toContain('다음 전투에서 타격 기술 +8');
  });
  it('nothing chosen yet',()=>{
    expect(choiceOutcomeOf(st(['place']),null)).toBeNull();
  });
});

describe('V12 P6-1 ChoiceOutcome',()=>{
  it('is a polite status with before/after for an upgrade',()=>{
    render(<ChoiceOutcome s={st(['strike'])} option={{type:'upgrade',id:'c0',kind:'strike'}}/>);
    const el=document.querySelector('.choice-outcome');
    expect(el.getAttribute('role')).toBe('status');
    expect(el.querySelector('.choice-before').textContent).toContain(cardText('strike',false));
    expect(el.querySelector('.choice-after').textContent).toContain(cardText('strike',true));
  });
  it('renders a prompt when nothing is chosen',()=>{
    render(<ChoiceOutcome s={st(['strike'])} option={null} prompt="카드를 고르면 바뀌는 점이 여기에 나옵니다."/>);
    expect(document.querySelector('.choice-outcome').textContent).toBe('카드를 고르면 바뀌는 점이 여기에 나옵니다.');
  });
});

describe('V12 P6-1 styles',()=>{
  const css=fs.readFileSync(path.resolve(process.cwd(),'src/duel/v12-rewards.css'),'utf8');
  it('never sets text below 12px and stays on the reward screens',()=>{
    for(const m of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g))expect(Number(m[1])).toBeGreaterThanOrEqual(12);
    const sels=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/@media[^{]*\{/g,'').split('}').map(r=>r.split('{')[0].trim()).filter(Boolean);
    for(const sel of sels)expect(sel).toMatch(/^\.reward-screen|^\.choice-/);
  });
});
