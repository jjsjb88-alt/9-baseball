import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../src/duel/diamond-weight.css',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');

function block(selector){
  const at=css.indexOf(selector);
  expect(at,selector+' 블록을 찾지 못했다').toBeGreaterThan(-1);
  return css.slice(at,css.indexOf('}',at));
}
const bgAlpha=b=>{const m=b.match(/background:rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(\.?\d+)\)/);return m?Number(m[1]):null;};

const empty=block('.golden-master-stage .base-slot:not(.occupied){');
const occupied=block('.golden-master-stage .base-slot.occupied{');

describe('base indicator weight',()=>{
  it('is wired into the app',()=>{
    expect(main).toContain('import "./duel/diamond-weight.css";');
  });

  it('sinks the empty bases into the field',()=>{
    /* 계획 §8 "UI보다 전투 장면이 먼저 보인다".
       빈 베이스가 보여주는 것은 ◇ 하나뿐이라 필드에 양보한다. */
    expect(bgAlpha(empty)).toBeLessThan(0.4);
    expect(empty).toContain('box-shadow:none');
  });

  it('keeps an occupied base the loudest thing in the diamond',()=>{
    /* 주자는 실제 게임 상태다. 가라앉히면 안 된다. */
    expect(bgAlpha(occupied)).toBeGreaterThan(bgAlpha(empty));
    expect(occupied).toMatch(/border-color:#[0-9a-f]{6}/);
    expect(occupied).toContain('box-shadow:');
  });

  it('only touches the combat stage, not every screen with a diamond',()=>{
    /* 다른 화면의 베이스 표시는 그대로 둔다. */
    for(const line of css.split('\n').filter(l=>l.trim().startsWith('.')&&l.includes('base-'))){
      expect(line).toContain('.golden-master-stage');
    }
  });

  it('still renders the occupied state the CSS depends on',()=>{
    /* 이 위계는 App.jsx가 occupied를 붙여 준다는 전제 위에 서 있다. */
    expect(app).toContain("(id?' occupied':'')");
  });
});
