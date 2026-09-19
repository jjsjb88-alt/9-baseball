import {describe,it,expect} from 'vitest';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/v11-stack-core.css',import.meta.url),'utf8');

describe('V11 stack UI contract',()=>{
  it('shows PLACE → CONNECT → SWING as the primary stack grammar',()=>{
    expect(app).toContain('9ZONE STACK · PLACE → CONNECT → SWING');
    expect(app).toContain('같은 카드도 순서가 스윙을 바꾼다.');
  });

  it('renders a 3x3 path board with ordered tokens',()=>{
    expect(app).toContain('className="v11-stack-path"');
    expect(app).toContain('className="v11-path-grid"');
    expect(app).toContain("step.order+'번째 '+name");
    expect(css).toContain('.v11-path-grid{display:grid;grid-template-columns:repeat(3,1fr)');
  });

  it('lets support cards move earlier or later without replacing the main card',()=>{
    expect(app).toContain('moveStackOrder=(id,delta)');
    expect(app).toContain("moveStackOrder(x.id,-1)");
    expect(app).toContain("moveStackOrder(x.id,1)");
    expect(app).toContain('aria-label="스윙 순서 변경"');
  });

  it('shows CONNECT/BREAK and base-to-final HP efficiency',()=>{
    expect(app).toContain("link.connected?'CONNECT +5%':'BREAK'");
    expect(app).toContain("choice?.baseStackDamageRate");
    expect(app).toContain("choice?.connectBonus");
    expect(app).toContain("choice?.stackPlan?.connectCount");
  });

  it('keeps portrait and low-height landscape responsive contracts',()=>{
    expect(css).toContain('@media (orientation:landscape) and (max-height:430px)');
    expect(css).toContain('@media (orientation:portrait)');
    expect(css).toContain('@media(max-width:380px)');
  });
});
