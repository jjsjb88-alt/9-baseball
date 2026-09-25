import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

// V12 UX-2 — hand card face (P2-5) and the render-audit polish pass.
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const main=read('../src/main.jsx');
const swing=read('../src/duel/v12-card-swing.css');
const polish=read('../src/duel/v12-polish.css');
const desktop=read('../src/duel/v12-battle-desktop.css');
const strip=css=>css.replace(/\/\*[\s\S]*?\*\//g,'');
const parts=s=>{const out=[];let depth=0,cur='';for(const ch of s){if(ch==='(')depth++;if(ch===')')depth--;if(ch===','&&!depth){out.push(cur);cur=''}else cur+=ch}out.push(cur);return out.map(x=>x.trim())};
const rules=css=>[...strip(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m=>({sel:m[1].replace(/^[\s\S]*@media[^{]*$/,'').trim(),body:m[2]})).filter(r=>r.sel&&!r.sel.startsWith('@'));
const fontSizes=css=>[...strip(css).matchAll(/font-size:\s*([\d.]+)px/g)].map(m=>+m[1]);

describe('V12 UX-2 swing card face in the hand',()=>{
  it('loads after the prepare-token layer and every legacy card layer',()=>{
    const at=main.indexOf('v12-card-swing.css');
    expect(at).toBeGreaterThan(main.indexOf('v12-card-prepare.css'));
    for(const legacy of ['sts-battleboard.css','landscape-first.css','responsive-master.css','landscape-declutter.css'])expect(at).toBeGreaterThan(main.indexOf(legacy));
  });

  it('only touches the design-state hand and never styles prepare tokens by themselves',()=>{
    for(const {sel} of rules(swing))for(const p of parts(sel)){
      expect(p).toMatch(/^\.duel-combat\.v12-design[ >]/);
      expect(p).toMatch(/\.duel-hand/);
      expect(p).not.toMatch(/\.skill(?!\))/);
    }
  });

  it('keeps every card text at the 12px floor (D4)',()=>{
    const sizes=fontSizes(swing);
    expect(sizes.length).toBeGreaterThan(5);
    for(const s of sizes)expect(s).toBeGreaterThanOrEqual(12);
  });

  it('keeps the name, type, coverage shape and board action on the face; the rule moves to the detail sheet',()=>{
    const hidden=rules(swing).filter(r=>/display:none/.test(r.body)).map(r=>r.sel).join(',');
    expect(hidden).toMatch(/\.card-rule/);
    for(const keep of ['>strong','.card-art','.card-type{','data-board-action'])expect(hidden.includes(keep)).toBe(false);
    expect(swing).toMatch(/>strong\{[^}]*font-size:13px/);
    expect(swing).toMatch(/data-board-action\]::after\{[^}]*bottom:/);
  });

  it('never lets a short-landscape card grow taller than its hand',()=>{
    expect(swing).toMatch(/@media \(orientation:landscape\) and \(max-height:500px\)\{[^@]*\.duel-hand>\.duel-card\{max-height:calc\(100% - 4px\)/);
  });
});

describe('V12 UX-2 desktop hand',()=>{
  it('uses the band from the left edge up to the watch button, without overlapping cards',()=>{
    const hand=desktop.match(/\.card-drawer>\.duel-hand\{left:(\d+)px!important;right:auto!important;width:(\d+)px/);
    const escape=desktop.match(/\.card-drawer>\.drawer-escape\{left:(\d+)px/);
    expect(hand&&escape).toBeTruthy();
    expect(+hand[1]+ +hand[2]).toBeLessThanOrEqual(+escape[1]);
    expect(desktop).toMatch(/\.duel-hand>\.duel-card\{margin-left:0!important\}/);
  });
});

describe('V12 UX-2 polish layer',()=>{
  it('loads after every screen layer, with the title layer still last',()=>{
    const at=main.indexOf('v12-polish.css');
    for(const before of ['landscape-declutter.css','v12-battle-landscape.css','v12-battle-desktop.css','v12-map.css','pitcher-portrait.css'])expect(at).toBeGreaterThan(main.indexOf(before));
    const cssImports=[...main.matchAll(/import "(\.\/duel\/[^"]+\.css)"/g)].map(m=>m[1]);
    expect(cssImports.at(-1)).toBe('./duel/title-pixel.css');
  });

  it('raises text to the 12px floor and never below',()=>{
    for(const s of fontSizes(polish))expect(s).toBeGreaterThanOrEqual(12);
    expect(polish).toMatch(/\.duel-header nav button\{font-size:12px/);
  });

  it('keeps every rule inside a media query and scoped to one screen',()=>{
    const css=strip(polish);
    expect(css.replace(/@media[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g,'').trim()).toBe('');
    for(const {sel} of rules(polish))for(const p of parts(sel))expect(p).toMatch(/^(\.duel-header nav button|\.duel-combat\.v12-design|\.v10-run-map-screen|\.duel-title)/);
  });

  it('hides the batter plate only in landscape/desktop battle, where the scoreboard already names the batter',()=>{
    const blocks=[...strip(polish).matchAll(/@media ([^{]+)\{((?:[^{}]*\{[^{}]*\})*)[^{}]*\}/g)];
    const withPlate=blocks.filter(b=>b[2].includes('batter-nameplate'));
    expect(withPlate).toHaveLength(1);
    expect(withPlate[0][1].trim()).toBe('(orientation:landscape)');
    expect(withPlate[0][2].trim()).toBe('.duel-combat.v12-design>.duel-arena .batter-nameplate{display:none!important}');
  });

  it('keeps the phone act bars on two rows instead of one squeezed row',()=>{
    expect(polish).toMatch(/@media \(max-width:600px\)\{[\s\S]*\.v10-act-step\{grid-column:2\/-1!important;grid-row:2/);
  });

  it('keeps the title start button inside a short landscape screen',()=>{
    expect(polish).toMatch(/@media \(orientation:landscape\) and \(max-height:500px\)\{[^@]*\.duel-title \.title-copy h1\{font-size:34px/);
  });
});
