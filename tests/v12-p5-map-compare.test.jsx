// @vitest-environment happy-dom
import React from 'react';
import {render,screen,fireEvent,cleanup,within} from '@testing-library/react';
import {afterEach,describe,it,expect} from 'vitest';
import RunMap from '../src/duel/RunMap.jsx';
import {createV10Duel,selectV10Map} from '../src/duel/engine.js';
import {nodeDetail,nodeType} from '../src/duel/v10-copy.js';

// V12 P5-2 — when more than one stop is open, the report compares them side by side (reward and risk
// from the same nodeDetail the report uses), and any row switches the report to that stop.
afterEach(()=>cleanup());
const map=()=>selectV10Map(createV10Duel(1));

describe('V12 P5-2 compare open stops',()=>{
  it('lists every open stop with its reward and risk when there is a choice',()=>{
    const m=map();const open=m.nodes.filter(n=>n.type!=='boss').slice(1,4);
    render(<RunMap {...m} reachableIds={open.map(n=>n.id)}/>);
    const list=screen.getByRole('list',{name:'갈 수 있는 곳 비교'});
    const rows=within(list).getAllByRole('button');
    expect(rows).toHaveLength(3);
    open.forEach((n,i)=>{const d=nodeDetail(n,nodeType(n.type));
      expect(rows[i].textContent).toContain(d.reward);expect(rows[i].textContent).toContain(d.risk);});
    expect(rows[0].getAttribute('aria-pressed')).toBe('true');
  });
  it('switches the report to the row that is picked',()=>{
    const m=map();const open=m.nodes.slice(1,3);
    render(<RunMap {...m} reachableIds={open.map(n=>n.id)}/>);
    const rows=within(screen.getByRole('list',{name:'갈 수 있는 곳 비교'})).getAllByRole('button');
    fireEvent.click(rows[1]);
    expect(rows[1].getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('.v10-node.is-picked').dataset.testid).toBe('v10-node-'+open[1].id);
  });
  it('shows no comparison with a single open stop',()=>{
    render(<RunMap {...map()}/>);
    expect(screen.queryByRole('list',{name:'갈 수 있는 곳 비교'})).toBeNull();
  });
});
