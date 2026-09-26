// 타자가 전경 소품에 덮이거나 화면 밖으로 잘리지 않는다.
// 리뷰 C1/C3 대응: 세로 모드에서 배우 z가 gm-depth-front보다 낮아 타자가 가려졌고,
// .actor-left가 음수 left로 밀려 실루엣이 뷰포트 밖으로 나갔다.
import {describe,it,expect} from 'vitest';
import fs from 'node:fs';

const read=n=>fs.readFileSync(new URL('../src/duel/'+n,import.meta.url),'utf8');
const golden=read('golden-master.css'),master=read('character-master.css');
// 규칙 블록 안에서만 읽는다. 셀렉터 문자열로 앞에서부터 찾으면
// `.gm-depth-back,.gm-depth-mid,.gm-depth-front{` 같은 묶음 규칙에 먼저 걸려
// 엉뚱한 뒤쪽 z-index를 집어온다. 한 번 그렇게 통과시켰다.
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const z=(css,sel)=>{
  const re=new RegExp('(?:^|\\})\\s*'+esc(sel)+'\\s*\\{([^}]*)\\}','m');
  const rule=re.exec(css);if(!rule)return null;
  const m=/z-index:\s*(-?\d+)/.exec(rule[1]);
  return m?+m[1]:null;
};

describe('타자 가시성',()=>{
  it('배우가 전경 소품 레이어보다 위에 있다',()=>{
    const actor=z(golden,'.golden-master-stage .actor-left,.golden-master-stage .actor-right');
    const front=z(golden,'.gm-depth-front');
    expect(actor).not.toBeNull();
    expect(front).not.toBeNull();
    expect(actor).toBeGreaterThan(front);
  });

  it('배우가 이름표보다는 아래에 있다',()=>{
    const actor=z(golden,'.golden-master-stage .actor-left,.golden-master-stage .actor-right');
    const plate=z(golden,'.golden-master-stage .batter-nameplate,.golden-master-stage .pitcher-nameplate');
    expect(actor).toBeLessThan(plate);
  });

  it('세로 화면에서 타자를 뷰포트 밖으로 밀지 않는다',()=>{
    // 실제로 이기는 규칙은 golden-master.css의 세로 전용 !important 블록이다.
    // character-master.css를 고쳐도 여기서 덮어써 버려 화면은 그대로였다.
    const i=golden.indexOf('@media (orientation:portrait)');
    expect(i).toBeGreaterThan(-1);
    const m=/\.golden-master-stage \.actor-left\{([^}]*)\}/.exec(golden.slice(i));
    expect(m).not.toBeNull();
    const left=/left:\s*(-?[\d.]+)(%|px)?/.exec(m[1]);
    expect(left).not.toBeNull();
    expect(Number(left[1])).toBeGreaterThanOrEqual(0);
  });
});
