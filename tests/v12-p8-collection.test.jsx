// @vitest-environment happy-dom
import React from 'react';
import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import Duel from '../src/duel/App.jsx';
import {CARDS,cardText} from '../src/duel/cards.js';

// V12 P8-2 — the collection is where the words taken off the battle screen live: every card in the
// help collection (and the deck/pile views) opens the same detail sheet as in battle — original rule,
// upgrade, stacking rule — and closing it returns to the collection.
beforeEach(()=>{localStorage.clear();vi.useFakeTimers()});
afterEach(()=>{cleanup();vi.useRealTimers()});

describe('V12 P8-2 collection',()=>{
  it('lists every card and opens its detail from the help collection',()=>{
    render(<Duel/>);
    fireEvent.click(screen.getByRole('button',{name:'?'}));
    const cards=[...document.querySelectorAll('.duel-modal .collection .duel-card')];
    expect(cards).toHaveLength(Object.keys(CARDS).length);
    const kind=cards[3].dataset.cardKind;
    cards[3].focus();fireEvent.click(cards[3]);
    const sheet=screen.getByRole('dialog',{name:CARDS[kind].name+' 카드 설명'});
    expect(sheet.textContent).toContain(cardText(kind,false));
    fireEvent.keyDown(sheet,{key:'Escape'});act(()=>vi.runOnlyPendingTimers());
    expect(screen.queryByRole('dialog',{name:CARDS[kind].name+' 카드 설명'})).toBeNull();
    expect(screen.getByRole('dialog',{name:'플레이 방법'})).toBeTruthy();
    expect(document.activeElement).toBe(cards[3]);
  });
  it('tells the reader the cards open',()=>{
    render(<Duel/>);
    fireEvent.click(screen.getByRole('button',{name:'?'}));
    expect(document.querySelector('.duel-modal').textContent).toContain('카드를 누르면 원문 규칙');
  });
});
