import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
// V12 UX — short portrait phones (≤760px tall): the battle fits one screen and the pinned execute
// strip never covers the hand (375×667 ran 872px and hid the whole hand once a card was placed).
const read=f=>fs.readFileSync(path.resolve(process.cwd(),f),'utf8');
const css=read('src/duel/v12-battle-short.css'),main=read('src/main.jsx');
const parts=t=>{const out=[];let d=0,cur='';for(const ch of t){if(ch==='(')d++;if(ch===')')d--;if(ch===','&&!d){out.push(cur);cur=''}else cur+=ch}out.push(cur);return out};
const rules=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/@media[^{]*\{/g,'').split('}').map(r=>r.split('{')).filter(r=>r.length===2&&r[0].trim());
describe('V12 short portrait battle',()=>{
  it('loads after the portrait layer and stays on the design-state battle',()=>{
    expect(main.indexOf('v12-battle-short.css')).toBeGreaterThan(main.indexOf('v12-battle-portrait.css'));
    for(const [sel] of rules)for(const p of parts(sel))expect(p.trim()).toMatch(/^\.duel-combat\.v12-design/);
  });
  it('folds only repeated or secondary lines, and keeps the event line for screen readers',()=>{
    expect(css).toMatch(/max-height:760px\)\{[\s\S]*\.battle-ribbon\{display:none/);
    expect(css).toMatch(/\.diamond-events\{position:absolute!important;width:1px/);
    expect(css).not.toMatch(/\.(zone-grid|duel-hand|drawer-watch|card-detail-open|card-order-open)[^{]*\{[^}]*display:none/);
  });
  it('reserves the pinned strip’s height so it never covers the hand',()=>{
    expect(css).toMatch(/:has\(\.decision-preview\.active\)\{padding-bottom:68px/);
    expect(css).toMatch(/min-height:761px\)\{[\s\S]*padding-bottom:132px/);
  });
});
