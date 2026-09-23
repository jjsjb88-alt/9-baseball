import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe,expect,it} from 'vitest';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const TOKENS=path.join(ROOT,'src/duel/tokens.css');

const expected={
  '--t-display':'40px','--t-display-line':'44px',
  '--t-h1':'28px','--t-h1-line':'34px',
  '--t-h2':'22px','--t-h2-line':'28px',
  '--t-h3':'18px','--t-h3-line':'24px',
  '--t-body':'15px','--t-body-line':'22px',
  '--t-label':'13px','--t-label-line':'18px',
  '--t-micro':'12px','--t-micro-line':'16px',
  '--t-num':'20px','--t-num-line':'24px',
  '--tracking-body':'0',
  '--num-variant':'tabular-nums',

  '--surface-0':'#07120F','--surface-1':'#07141B','--surface-2':'#132B33',
  '--edge':'#235060','--ink-1':'#F4ECD8','--ink-2':'#CCD8D0','--ink-3':'#7D9388',
  '--aim':'#FFE4A2','--cover-main':'#FFE4A2','--cover-support':'#6FD7C6',
  '--link-on':'#6FD7C6','--link-off':'#AA7E67','--bone':'#DED6B9',

  '--space-1':'4px','--space-2':'8px','--space-3':'12px','--space-4':'16px',
  '--space-6':'24px','--space-8':'32px',
  '--radius-1':'2px','--radius-2':'8px','--radius-pill':'999px',
  '--target-min':'44px','--zone-min':'48px',

  '--z-field':'0','--z-actors':'10','--z-vfx':'20','--z-board':'30',
  '--z-hud':'40','--z-drawer':'50','--z-overlay':'60','--z-modal':'70',

  '--motion-tap':'120ms','--motion-state':'180ms','--motion-move':'260ms',
  '--motion-reveal':'420ms','--motion-response-max':'100ms',
  '--ease-standard':'cubic-bezier(.2,.8,.2,1)',
  '--ease-accel':'cubic-bezier(.4,0,1,1)',
  '--ease-decel':'cubic-bezier(0,0,.2,1)',
};

function parseTokens(css){
  return Object.fromEntries(
    [...css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)]
      .map(([,name,value])=>[name,value.trim()])
  );
}

describe('V12 P0-3 design-token definitions',()=>{
  it('defines the reviewed V12 token values without weakening or inventing product values',()=>{
    const css=readFileSync(TOKENS,'utf8');
    expect(parseTokens(css)).toEqual(expected);
  });

  it('contains definitions only: one :root rule, no layer and no important',()=>{
    const css=readFileSync(TOKENS,'utf8');
    const stripped=css.replace(/\/\*[\s\S]*?\*\//g,'').trim();
    const selectors=[...stripped.matchAll(/([^{}]+)\{/g)].map(m=>m[1].trim());
    expect(selectors).toEqual([':root']);
    expect(css).not.toContain('@layer');
    expect(css).not.toContain('!important');
  });

  it('is not imported by runtime source during P0',()=>{
    let found='';
    try{
      found=execFileSync('git',['grep','-n','tokens.css','--','src'],{cwd:ROOT,encoding:'utf8'});
    }catch(error){
      if(error.status!==1)throw error;
    }
    expect(found.trim()).toBe('');
  });
});
