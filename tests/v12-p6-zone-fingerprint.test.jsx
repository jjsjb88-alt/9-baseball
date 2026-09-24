// @vitest-environment happy-dom
import React from 'react';
import {render,cleanup} from '@testing-library/react';
import {afterEach,describe,it,expect} from 'vitest';
import RunMap,{openingZones} from '../src/duel/RunMap.jsx';
import {createV10Duel,enterV10Node,selectV10Map,repertoire} from '../src/duel/engine.js';

// V12 P6-2 — no heatmap without a basis. The map's 9-cell pitcher fingerprint used a hand-written
// "hot zones" table (the closer lit 0 and 6, the last two zones it opens). It now lights exactly the
// zones the engine opens on the first plate appearance: ZONE_ORDER[style].slice(0, zoneOpen).
afterEach(()=>cleanup());

describe('V12 P6-2 pitcher fingerprint',()=>{
  it('matches the engine repertoire on the first plate appearance',()=>{
    const s0=createV10Duel(1),first=selectV10Map(s0).reachableIds[0];
    const s=enterV10Node(s0,first);
    expect(openingZones(s.v10.opponent)).toEqual(repertoire(s));
  });
  it('lights exactly those zones on every map node',()=>{
    const m=selectV10Map(createV10Duel(7));
    render(<RunMap {...m}/>);
    for(const node of m.nodes.filter(n=>n.opponent)){
      const el=document.querySelector(`[data-testid="v10-node-${node.id}"] .v10-zone-fingerprint`);
      if(!el)continue;
      const hot=[...el.querySelectorAll('i')].map((c,i)=>c.classList.contains('hot')?i:null).filter(x=>x!=null);
      expect(hot).toEqual(openingZones(node.opponent));
      expect(el.getAttribute('aria-label')).toContain('첫 타석 '+hot.length+'존');
    }
  });
  it('shows nothing it cannot ground',()=>{
    expect(openingZones({style:'rookie',zoneOpen:4})).toEqual([]);
    expect(openingZones({openingZones:[2,11]})).toEqual([]);
    expect(openingZones(null)).toEqual([]);
  });
});
