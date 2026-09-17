import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../src/duel/landscape-first.css',import.meta.url),'utf8');
const scrollFix=fs.readFileSync(new URL('../src/duel/landscape-scroll-fix.css',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');

describe('V10 landscape-first mobile contract',()=>{
  it('loads the dedicated landscape stylesheet and scroll hotfix from the app entry',()=>{
    expect(main).toContain('landscape-first.css');
    expect(main).toContain('landscape-scroll-fix.css');
    expect(main.indexOf('landscape-scroll-fix.css')).toBeGreaterThan(main.indexOf('landscape-first.css'));
  });

  it('portrait phones get a rotate-device gate instead of compressed combat UI',()=>{
    expect(css).toContain('@media (max-width: 900px) and (orientation: portrait)');
    expect(css).toContain('가로로 돌려서 플레이');
    expect(css).toContain('.duel-app>*{visibility:hidden');
  });

  it('landscape combat splits arena and decision space into two columns',()=>{
    expect(css).toContain('@media (orientation: landscape) and (max-height: 760px)');
    expect(css).toContain('grid-template-columns:minmax(0,1.08fr) minmax(250px,.92fr)');
    expect(css).toContain('.duel-combat>.duel-arena{grid-column:1');
    expect(css).toContain('.duel-combat>.zone-panel{grid-column:2');
    expect(css).toContain('.duel-combat>.duel-table{grid-column:2');
  });

  it('landscape cards become a horizontal hand with compact zone cells',()=>{
    expect(css).toContain('.card-drawer .duel-hand{flex:1 1 auto');
    expect(css).toContain('overflow-x:auto!important');
    expect(css).toContain('.zone-cell{min-height:30px!important');
    expect(css).toContain('max-height:158px!important');
  });

  it('does not globally lock landscape run screens while keeping combat fixed',()=>{
    expect(scrollFix).toContain('overflow-y:auto!important');
    expect(scrollFix).toContain('.duel-app{');
    expect(scrollFix).toContain('overflow:visible!important');
    expect(scrollFix).toContain('.duel-combat{');
    expect(scrollFix).toContain('height:calc(100dvh - 38px)!important');
    expect(scrollFix).toContain('overflow:hidden!important');
    expect(scrollFix).toContain('.run-map,');
    expect(scrollFix).toContain('.reward-flow,');
  });
});
