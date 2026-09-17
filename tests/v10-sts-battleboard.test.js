import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/duel/sts-battleboard.css',import.meta.url),'utf8');
const sidecar=readFileSync(new URL('../src/duel/sts-battleboard.js',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');

describe('V10 Slay-the-Spire landscape battleboard contract',()=>{
  it('loads the battleboard after the old responsive layers',()=>{
    const responsive=main.indexOf('./duel/responsive-master.css');
    const js=main.indexOf('./duel/sts-battleboard.js');
    const sheet=main.indexOf('./duel/sts-battleboard.css');
    expect(responsive).toBeGreaterThan(-1);
    expect(js).toBeGreaterThan(responsive);
    expect(sheet).toBeGreaterThan(js);
  });

  it('makes the arena the scene and the hand a full-width bottom rail',()=>{
    expect(css).toContain('@media (orientation: landscape)');
    expect(css).toContain('.duel-combat>.duel-arena');
    expect(css).toContain('inset:22px 0 var(--sts-hand-h) 0!important');
    expect(css).toContain('.duel-combat>.duel-table');
    expect(css).toContain('bottom:0!important');
    expect(css).toContain('height:var(--sts-hand-h)!important');
    expect(css).toContain('.card-drawer .duel-hand');
    expect(css).toContain('left:12px!important;right:178px!important;bottom:4px!important');
  });

  it('keeps cards directly selectable instead of clipping them under panels',()=>{
    expect(css).toContain('overflow-x:auto!important;overflow-y:visible!important');
    expect(css).toContain('touch-action:pan-x!important');
    expect(css).toContain('.duel-card.selected');
    expect(css).toContain('translateY(-10px) scale(1.055)');
    expect(css).toContain('.decision-preview');
    expect(css).toContain('right:8px!important;bottom:8px!important');
  });

  it('treats the 9-zone as a floating target widget rather than a layout column',()=>{
    expect(css).toContain('.duel-combat>.zone-panel');
    expect(css).toContain('position:absolute!important');
    expect(css).toContain('width:clamp(245px,29vw,340px)!important');
    expect(css).toContain('.zone-cell{height:30px!important');
  });

  it('auto-opens the V10 hand only in landscape battle state',()=>{
    expect(sidecar).toContain("matchMedia('(orientation: landscape)')");
    expect(sidecar).toContain(".duel-combat.phase-battle.decision-hub");
    expect(sidecar).toContain(".v10-combat-hp");
    expect(sidecar).toContain(".action.swing:not(:disabled)");
    expect(sidecar).toContain('swing.click()');
  });

  it('preserves swipe COVER by leaving stack data in the DOM',()=>{
    expect(css).toContain('Stack data remains in the DOM for swipe-COVER');
    expect(css).toContain('.swing-stack>.stack-candidates');
    expect(css).toContain('display:none!important');
    expect(css).toContain('.stack-aim-editor.direct-open');
  });
});
