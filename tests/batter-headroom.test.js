import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

// Regression: on short landscape screens landscape-declutter's actor `scale`
// pushed the authored batter's helmet under the header / AT BAT panel
// (844x390: helmet 63px above the scoreboard bottom).
const read=name=>fs.readFileSync(new URL('../src/duel/'+name,import.meta.url),'utf8');
const declutter=read('landscape-declutter.css');
const golden=read('golden-master.css');

// Flat list of {media, selector, body}; one level of @media nesting is enough here.
function rules(css){
  const out=[];const src=css.replace(/\/\*[\s\S]*?\*\//g,'');
  let i=0;
  const block=(media,end)=>{
    while(i<end){
      const open=src.indexOf('{',i);if(open<0||open>=end)return;
      const head=src.slice(i,open).trim();
      if(head.startsWith('@media')){
        let depth=1,j=open+1;while(depth&&j<src.length){if(src[j]==='{')depth++;else if(src[j]==='}')depth--;j++;}
        i=open+1;block(head.slice(6).trim(),j-1);i=j;continue;
      }
      const close=src.indexOf('}',open);
      out.push({media,selector:head,body:src.slice(open+1,close)});
      i=close+1;
    }
  };
  block('',src.length);
  return out;
}
const decl=(body,prop)=>{
  const m=body.match(new RegExp('(?:^|;|\\s)'+prop.replace(/[-]/g,'\\-')+':([^;]+)'));
  return m?m[1].trim():null;
};
const byMedia=list=>list.reduce((acc,r)=>((acc[r.media]||=[]).push(r),acc),{});

const ACTORS='.duel-combat.landscape-declutter>.duel-arena .actor-left';
const BATTER_LEFT='.duel-combat.landscape-declutter>.duel-arena .actor-left';
const HEADROOM_SEL='.duel-combat.landscape-declutter>.duel-arena.golden-master-stage .actor-left';

describe('batter headroom on landscape screens',()=>{
  const dRules=rules(declutter),gRules=rules(golden);

  it('every declutter actor scale is mirrored in --declutter-actor-scale',()=>{
    const scaled=dRules.filter(r=>r.selector.startsWith(ACTORS+',')&&/scale:[\d.]+!important/.test(r.body));
    expect(scaled.length).toBe(4);
    for(const r of scaled){
      const scale=decl(r.body,'scale').replace('!important','');
      expect(decl(r.body,'--declutter-actor-scale'),r.media).toBe(scale);
    }
  });

  it('every declutter batter left is mirrored in --declutter-batter-left',()=>{
    const groups=byMedia(dRules);
    let checked=0;
    for(const [media,list] of Object.entries(groups)){
      const left=list.find(r=>r.selector===BATTER_LEFT&&decl(r.body,'left'));
      if(!left)continue;
      const scaleRule=list.find(r=>r.selector.startsWith(ACTORS+',')&&decl(r.body,'--declutter-actor-scale'));
      expect(scaleRule,media).toBeTruthy();
      expect(decl(scaleRule.body,'--declutter-batter-left'),media).toBe(decl(left.body,'left').replace('!important',''));
      checked++;
    }
    expect(checked).toBe(3);
  });

  it('--scoreboard-bottom matches the landscape scoreboard top + height',()=>{
    const groups=byMedia(dRules);
    let checked=0;
    for(const [media,list] of Object.entries(groups)){
      const vars=list.find(r=>r.selector==='.duel-combat.landscape-declutter'&&decl(r.body,'--scoreboard-bottom'));
      if(!vars)continue;
      const board=list.find(r=>r.selector==='.duel-combat.v10-landscape-declutter>.scoreboard');
      expect(board,media).toBeTruthy();
      const px=v=>parseFloat(v);
      expect(px(decl(vars.body,'--scoreboard-bottom')),media).toBe(px(decl(board.body,'top'))+px(decl(board.body,'height')));
      checked++;
    }
    expect(checked).toBe(3);
  });

  it('golden-master batter sizes flow through --gm-batter-box',()=>{
    const sized=gRules.filter(r=>r.selector==='.duel-combat .golden-master-stage .actor-left'&&decl(r.body,'width'));
    expect(sized.length).toBe(3);
    for(const r of sized){
      expect(decl(r.body,'--gm-batter-box'),r.media).toBeTruthy();
      expect(decl(r.body,'width'),r.media).toBe('var(--gm-batter-box)!important');
      expect(decl(r.body,'height'),r.media).toBe('var(--gm-batter-box)!important');
    }
  });

  it('the authored batter replaces the scale with a headroom-limited size',()=>{
    const arena=gRules.find(r=>r.selector==='.duel-combat.landscape-declutter>.duel-arena.golden-master-stage');
    expect(arena?.media).toBe('(orientation:landscape)');
    expect(decl(arena.body,'container-type')).toBe('size');
    const r=gRules.find(x=>x.selector===HEADROOM_SEL&&decl(x.body,'--gm-batter-fit'));
    expect(r?.media).toBe('(orientation:landscape)');
    expect(decl(r.body,'scale')).toBe('none!important');
    expect(decl(r.body,'width')).toBe('var(--gm-batter-size)!important');
    expect(decl(r.body,'height')).toBe('var(--gm-batter-size)!important');
    expect(decl(r.body,'--gm-batter-size')).toContain('min(');
    expect(decl(r.body,'left')).toContain('var(--declutter-batter-left');
  });

  // Same arithmetic the browser does, fed with the CSS values above.
  // helmet y (from arena top) = 1.02 * arenaH - K * size, K from the headroom rule.
  it('keeps the helmet below the scoreboard on the screens that used to crop it',()=>{
    const r=gRules.find(x=>x.selector===HEADROOM_SEL&&decl(x.body,'--gm-batter-fit'));
    const K=Number(decl(r.body,'--gm-batter-fit').match(/\/ ?([\d.]+)\)$/)[1]);
    expect(K).toBeCloseTo(1.08-1.16*.15,3);
    const clamp=(lo,v,hi)=>Math.min(hi,Math.max(lo,v));
    const cases=[
      // [w,h, box, scale, arenaH, scoreboardBottom]
      [844,390,clamp(176,Math.min(.29*844,.62*390),245),1.28,390-34-112,38],
      [667,375,clamp(176,Math.min(.29*667,.62*375),245),1.28,375-34-112,38],
      [1024,600,clamp(210,Math.min(.31*1024,.76*600),330),1.42,600-38-clamp(124,.32*600,158),49],
      [1280,650,330,1.52,650-44-clamp(188,.27*650,230),58],
    ];
    for(const [w,h,box,scale,arenaH,sb] of cases){
      const before=1.02*arenaH-K*box*scale;
      const size=Math.min(box*scale,(1.02*arenaH-sb-4)/K);
      const after=1.02*arenaH-K*size;
      expect(before,`${w}x${h} reproduces the crop`).toBeLessThan(sb);
      expect(after,`${w}x${h} helmet clears the scoreboard`).toBeGreaterThanOrEqual(sb);
    }
  });
});
