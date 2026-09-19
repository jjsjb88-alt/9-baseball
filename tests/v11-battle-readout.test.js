import {describe,it,expect} from 'vitest';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const readout=fs.readFileSync(new URL('../src/duel/BattleReadout.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/battle-readout.css',import.meta.url),'utf8');

describe('V11 Battle Readout',()=>{
  it('integrates only into V10 swing selection feedback',()=>{
    expect(app).toContain("import BattleReadout from './BattleReadout.jsx'");
    expect(app).toContain("decisionMode==='swing'&&choice&&<BattleReadout");
    expect(app).toContain("kind={selected==='basic'?'basic':selectedEntry?.kind||'basic'}");
  });

  it('shows coach copy only for the first two plate appearances',()=>{
    expect(app).toContain('coach={b.turn<=2}');
    expect(app).toContain("decisionMode==='swing'&&b.turn<=2&&<div className=\"stack-discovery\"");
  });

  it('teaches the three visible tradeoff axes without exposing hidden pitch information',()=>{
    expect(readout).toContain('COVER');
    expect(readout).toContain('PRESSURE');
    expect(readout).toContain('COST');
    expect(readout).toContain('커버를 더 샀습니다.');
    expect(readout).not.toContain('pending');
    expect(readout).not.toContain('probabilities');
    expect(readout).not.toContain('actualPitch');
  });

  it('distinguishes precision, coverage, basic and stacked swing roles',()=>{
    expect(readout).toContain("kind==='place'||precisionPressure>0");
    expect(readout).toContain("kind==='strike'");
    expect(readout).toContain("kind==='basic'");
    expect(readout).toContain('cardCount>1');
    expect(readout).toContain("적중 시 ×");
    expect(readout).toContain("CONNECT +{connectCount}");
  });

  it('keeps the readout compact on portrait and low-height landscape',()=>{
    expect(css).toContain('@media (orientation:portrait) and (max-width:430px)');
    expect(css).toContain('@media (orientation:landscape) and (max-height:430px)');
    expect(css).toContain('.battle-readout-meters');
    expect(css).toContain('grid-template-columns:repeat(3,minmax(0,1fr))');
  });
});
