import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../src/duel/responsive-master.css',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');

describe('V10 responsive master contract',()=>{
  it('loads the master responsive layer after the older landscape hotfixes',()=>{
    expect(main).toContain('responsive-master.css');
    expect(main.indexOf('responsive-master.css')).toBeGreaterThan(main.indexOf('landscape-scroll-fix.css'));
  });

  it('portrait phones are playable instead of being hidden behind a rotate gate',()=>{
    expect(css).toContain('@media (max-width:900px) and (orientation:portrait)');
    expect(css).toContain('.duel-app>*{visibility:visible!important;pointer-events:auto!important}');
    expect(css).toContain('.duel-app::before,.duel-app::after{display:none!important');
    expect(css).toContain('overflow-y:auto!important');
  });

  it('portrait combat preserves arena, zone, hand and a sticky execute area',()=>{
    expect(css).toContain('grid-template-rows:auto auto auto minmax(228px,34dvh) auto auto auto!important');
    expect(css).toContain('.card-drawer .duel-hand{display:flex!important');
    expect(css).toContain('min-height:182px!important');
    expect(css).toContain('.decision-preview{position:sticky!important;bottom:8px!important');
    expect(css).toContain('.stack-aim-editor.direct-open{position:fixed!important');
  });

  it('desktop gets a simultaneous two-column arena / decision board',()=>{
    expect(css).toContain('@media (min-width:1080px)');
    expect(css).toContain('grid-template-columns:minmax(560px,1.18fr) minmax(430px,.82fr)!important');
    expect(css).toContain('.duel-combat>.duel-arena{grid-column:1!important;grid-row:3/5!important');
    expect(css).toContain('.duel-combat>.zone-panel{grid-column:2!important;grid-row:3!important');
    expect(css).toContain('.duel-combat>.duel-table{grid-column:2!important;grid-row:4!important');
  });

  it('short laptops are treated as desktop and do not inherit the phone cockpit',()=>{
    expect(css).toContain('@media (min-width:1080px) and (orientation:landscape) and (max-height:760px)');
    expect(css).toContain('grid-template-columns:minmax(520px,1.14fr) minmax(390px,.86fr)!important');
  });
});
