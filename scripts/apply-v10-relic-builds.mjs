import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s);
const replaceOnce=(text,from,to,label)=>{
  const i=text.indexOf(from);
  if(i<0)throw new Error('missing replacement: '+label);
  if(text.indexOf(from,i+from.length)>=0)throw new Error('ambiguous replacement: '+label);
  return text.slice(0,i)+to+text.slice(i+from.length);
};

const relicModule=`export const V10_RELICS=Object.freeze({
  firstPitch:{name:'초구 노림표',mark:'1ST',text:'타석 첫 공에서 HP 피해가 발생하면 +3 HP.'},
  twoStack:{name:'더블 그립',mark:'2X',text:'2장 SWING STACK의 HP 피해 효율을 100%로 유지.'},
  foulTape:{name:'커트 테이프',mark:'CUT',text:'파울이 투수 HP에 추가 +2 피해.'},
  awayBadge:{name:'반대 방향 배지',mark:'OUT',text:'바깥쪽 코스를 안타로 만들면 추가 +4 HP.'},
  slugBand:{name:'클린업 손목밴드',mark:'XBH',text:'2루타 이상 장타면 추가 +4 HP.'},
});

export const V10_RELIC_KEYS=Object.freeze(Object.keys(V10_RELICS));
const ACT_POOLS=Object.freeze({
  1:['firstPitch','foulTape','twoStack','awayBadge'],
  2:['twoStack','awayBadge','slugBand','foulTape','firstPitch'],
  3:['slugBand','awayBadge','twoStack','foulTape','firstPitch'],
});
const mix=x=>{x=(x^61)^(x>>>16);x=(x+Math.imul(x,8))>>>0;x^=x>>>4;x=Math.imul(x,0x27d4eb2d)>>>0;x^=x>>>15;return x>>>0;};

export function v10RelicOffers({seed=0,act=1,nodeSeed=0,owned=[]}={}){
  const pool=(ACT_POOLS[act]||ACT_POOLS[1]).filter(k=>!owned.includes(k));
  if(pool.length<=2)return pool;
  const offset=mix((seed>>>0)^(nodeSeed>>>0)^Math.imul(act,0x9e3779b1))%pool.length;
  return [...pool.slice(offset),...pool.slice(0,offset)].slice(0,2);
}

export function v10RelicDamageRate(relics=[],cardCount=1,baseRate=1){
  return relics.includes('twoStack')&&cardCount===2?1:baseRate;
}

const damagingOutcome=o=>o?.kind==='hit'||o?.kind==='foul'||o?.kind==='whiff'||o?.kind==='miss'||o?.kind==='ball'||o?.kind==='walk'||o?.kind==='out'||o?.kind==='sacrifice'||o?.label==='볼넷';

export function v10RelicDamagePlan({relics=[],outcome={},cardCount=1,damageRate=1,pitchInPA=1}={}){
  const events=[];
  const rate=v10RelicDamageRate(relics,cardCount,damageRate);
  let bonus=0;
  if(relics.includes('twoStack')&&cardCount===2&&rate!==damageRate)events.push('더블 그립 · 2장 스택 피해 100%');
  if(relics.includes('firstPitch')&&pitchInPA===1&&damagingOutcome(outcome)){
    bonus+=3;events.push('초구 노림표 · +3 HP');
  }
  if(relics.includes('foulTape')&&outcome?.kind==='foul'){
    bonus+=2;events.push('커트 테이프 · 파울 +2 HP');
  }
  if(relics.includes('awayBadge')&&outcome?.kind==='hit'&&Number.isInteger(outcome.zone)&&outcome.zone%3===2){
    bonus+=4;events.push('반대 방향 배지 · 바깥 안타 +4 HP');
  }
  if(relics.includes('slugBand')&&outcome?.kind==='hit'&&(outcome.bases||1)>=2){
    bonus+=4;events.push('클린업 손목밴드 · 장타 +4 HP');
  }
  return {damageRate:rate,damageBonus:bonus,events};
}
`;
write('src/duel/v10-relics.js',relicModule);

const relicUi=`import {V10_RELICS} from './v10-relics.js';
const SAVE='9zone-v10-run';
let scheduled=false,lastTrigger='';
const state=()=>{try{return JSON.parse(localStorage.getItem(SAVE)||'null')}catch{return null}};
const owned=s=>(s?.relics||[]).filter(k=>V10_RELICS[k]);
function rack(){
  const combat=document.querySelector('.duel-combat');if(!combat)return;
  const s=state(),keys=owned(s);let el=combat.querySelector('.v10-relic-rack');
  if(!keys.length){el?.remove();return;}
  if(!el){el=document.createElement('div');el.className='v10-relic-rack';el.setAttribute('aria-label','보유 유물');combat.prepend(el);}
  el.innerHTML=keys.map(k=>{const r=V10_RELICS[k];return '<span class="v10-relic-chip" title="'+r.name+' · '+r.text+'"><i>'+r.mark+'</i><b>'+r.name+'</b></span>';}).join('');
}
function shop(){
  document.querySelectorAll('.reward-screen .duel-card.skill strong').forEach(strong=>{
    const text=strong.textContent||'';if(!text.startsWith('RELIC · '))return;
    const card=strong.closest('.duel-card');if(!card||card.dataset.relicDecorated)return;
    const [name,...detail]=text.slice(8).split(' / ');card.dataset.relicDecorated='1';card.classList.add('v10-relic-offer');
    strong.textContent=name;const tag=document.createElement('span');tag.className='v10-relic-offer-tag';tag.textContent='RELIC';card.prepend(tag);
    const rule=card.querySelector('.card-rule');if(rule)rule.textContent=detail.join(' / ');else{const p=document.createElement('p');p.className='card-rule';p.textContent=detail.join(' / ');card.appendChild(p);}
  });
}
function trigger(){
  const s=state(),events=s?.v10?.lastCombat?.relicEvents||[];if(!events.length)return;
  const combat=document.querySelector('.duel-combat');if(!combat)return;
  const sig=(s?.stats?.pitches||0)+':'+events.join('|');if(sig===lastTrigger)return;lastTrigger=sig;
  combat.querySelector('.v10-relic-trigger')?.remove();const el=document.createElement('div');el.className='v10-relic-trigger';el.setAttribute('role','status');
  el.innerHTML='<span>RELIC TRIGGER</span><strong>'+events.join(' · ')+'</strong>';combat.appendChild(el);setTimeout(()=>el.remove(),1700);
}
function refresh(){scheduled=false;rack();shop();trigger()}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(refresh)}
if(typeof document!=='undefined'){new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true});window.addEventListener('storage',schedule);schedule()}
`;
write('src/duel/v10-relic-ui.js',relicUi);

const relicCss=`.v10-relic-rack{position:absolute;z-index:42;top:48px;left:50%;transform:translateX(-50%);display:flex;gap:5px;max-width:46vw;overflow:hidden;pointer-events:none}.v10-relic-chip{display:flex;align-items:center;gap:5px;padding:3px 7px;border:1px solid #9a7a42;border-radius:999px;background:#17150fdd;box-shadow:0 3px 10px #0008;color:#f5df9c;white-space:nowrap}.v10-relic-chip i{display:grid;place-items:center;min-width:23px;height:17px;border-radius:5px;background:#d5ad50;color:#1c160b;font:1000 7px/1 ui-monospace,monospace;font-style:normal}.v10-relic-chip b{font-size:8px;letter-spacing:.1px}.v10-relic-offer{border-color:#b58c3f!important;background:linear-gradient(160deg,#2a2418,#151b1a)!important;box-shadow:0 0 0 1px #ead07a22 inset,0 8px 24px #0007!important}.v10-relic-offer-tag{align-self:flex-start;padding:3px 6px;border-radius:5px;background:#d5ad50;color:#1d160a;font:1000 7px/1 ui-monospace,monospace;letter-spacing:1px}.v10-relic-offer .card-rule{display:block!important;color:#ead9a8!important}.v10-relic-trigger{position:absolute;z-index:80;right:20%;top:34%;display:grid;gap:4px;max-width:42vw;padding:7px 10px;border:1px solid #d7a94d;border-radius:8px;background:#171109ee;box-shadow:0 0 24px #d99e3a55;pointer-events:none;animation:v10RelicPop 1.7s ease-out both}.v10-relic-trigger span{font:1000 7px/1 ui-monospace,monospace;letter-spacing:1.5px;color:#e6ba59}.v10-relic-trigger strong{font-size:11px;color:#fff0b8}@keyframes v10RelicPop{0%{opacity:0;transform:translateY(12px) scale(.9)}14%{opacity:1;transform:translateY(0) scale(1.04)}72%{opacity:1}100%{opacity:0;transform:translateY(-16px) scale(.98)}}@media (orientation:landscape) and (max-height:430px){.v10-relic-rack{top:39px;max-width:42vw}.v10-relic-chip b{display:none}.v10-relic-chip{padding:2px 4px}.v10-relic-trigger{right:24%;top:28%;max-width:35vw}}@media (orientation:portrait){.v10-relic-rack{position:fixed;top:auto;bottom:8px;left:8px;transform:none;z-index:85;max-width:72vw}.v10-relic-chip b{display:none}.v10-relic-trigger{right:8%;top:29%;max-width:70vw}}@media (prefers-reduced-motion:reduce){.v10-relic-trigger{animation:none;opacity:1}}
`;
write('src/duel/v10-relic-ui.css',relicCss);

let engine=read('src/duel/engine.js');
engine=replaceOnce(engine,
  "import {V10_SAVE_KEY as V10_STORAGE_KEY,saveV10State,readV10State} from './v10-storage.js';",
  "import {V10_SAVE_KEY as V10_STORAGE_KEY,saveV10State,readV10State} from './v10-storage.js';\nimport {V10_RELICS,v10RelicOffers,v10RelicDamagePlan,v10RelicDamageRate} from './v10-relics.js';",
  'engine relic import');
engine=replaceOnce(engine,
  "  const hr=types.find(t=>t.bases===4)?.p||0,cardCount=1+supports.length,damageRate=v10SwingDamageRate(cardCount);",
  "  const hr=types.find(t=>t.bases===4)?.p||0,cardCount=1+supports.length,damageRate=v10RelicDamageRate(s.relics||[],cardCount,v10SwingDamageRate(cardCount));",
  'stack preview relic rate');
engine=replaceOnce(engine,
`const v10ShopPool=s=>{\n  const node=currentV10Node(s),stage=v10StageForNode(node),route=(ROUTE_CHOICES[stage]||[])[0];\n  const pool=[...new Set(rewardChoices(stage,null,DECKBUILDER_BUILD,route?.id||null))];\n  if(!pool.length)return [];\n  const offset=(node?.seed||0)%pool.length;\n  return [...pool.slice(offset),...pool.slice(0,offset)].slice(0,3);\n};`,
`const v10ShopPool=s=>{\n  const node=currentV10Node(s),stage=v10StageForNode(node),route=(ROUTE_CHOICES[stage]||[])[0];\n  const pool=[...new Set(rewardChoices(stage,null,DECKBUILDER_BUILD,route?.id||null))];\n  if(!pool.length)return [];\n  const offset=(node?.seed||0)%pool.length;\n  return [...pool.slice(offset),...pool.slice(0,offset)].slice(0,3);\n};\nconst v10RelicPool=s=>{\n  const node=currentV10Node(s);\n  return v10RelicOffers({seed:s.initialSeed,act:node?.act||1,nodeSeed:node?.seed||0,owned:s.relics||[]});\n};`,
  'relic shop pool');
engine=replaceOnce(engine,
  "  if(state.phase==='shop')return state.deck.length>=DECK_MAX?[]:v10ShopPool(state).map(kind=>({type:'add',kind,name:CARDS[kind].name}));",
  "  if(state.phase==='shop'){\n    const relics=v10RelicPool(state).map(relic=>({type:'relic',relic,name:`RELIC · ${V10_RELICS[relic].name} / ${V10_RELICS[relic].text}`}));\n    const cards=state.deck.length>=DECK_MAX?[]:v10ShopPool(state).map(kind=>({type:'add',kind,name:CARDS[kind].name}));\n    return [...relics,...cards];\n  }",
  'shop options');
engine=replaceOnce(engine,
  "  if(state.phase==='shop')return options.some(o=>o.type==='add'&&o.kind===action.kind)?null:'이번 상점의 카드가 아닙니다.';",
  "  if(state.phase==='shop'){\n    if(action.type==='add')return options.some(o=>o.type==='add'&&o.kind===action.kind)?null:'이번 상점의 카드가 아닙니다.';\n    if(action.type==='relic')return options.some(o=>o.type==='relic'&&o.relic===action.relic)?null:'이번 상점의 유물이 아닙니다.';\n    return '카드 또는 유물 하나를 선택하세요.';\n  }",
  'shop problem');
engine=replaceOnce(engine,
`  }else if(action.type==='rest')s.v10.nextBattleBonus={technique:8,source:'rest'};`,
`  }else if(action.type==='relic'){\n    if(!s.relics.includes(action.relic))s.relics.push(action.relic);\n  }else if(action.type==='rest')s.v10.nextBattleBonus={technique:8,source:'rest'};`,
  'complete relic utility');
engine=replaceOnce(engine,
`  const r=next.battle?.revealed;if(!r)return next;\n  const stackCardCount=action.type==='card'?(r.stackCardCount||1):1,damageRate=v10SwingDamageRate(stackCardCount);\n  const applied=applyPitcherOutcome(next.pitcher,{\n    kind:r.kind,label:r.label,bases:v10BasesForReveal(r),zone:r.zone,aimZone:r.aimZone,\n    covered:Array.isArray(r.coverage)&&r.coverage.includes(r.zone),\n  },{pitchId:next.stats.pitches,damageMultiplier:damageRate});\n  next.pitcher=applied.pitcher;`,
`  const r=next.battle?.revealed;if(!r)return next;\n  const stackCardCount=action.type==='card'?(r.stackCardCount||1):1,stackDamageRate=v10SwingDamageRate(stackCardCount);\n  const outcome={kind:r.kind,label:r.label,bases:v10BasesForReveal(r),zone:r.zone,aimZone:r.aimZone,\n    covered:Array.isArray(r.coverage)&&r.coverage.includes(r.zone)};\n  const pitchInPA=Math.max(1,(next.battle?.history||[]).filter(h=>h.turn===next.battle.turn).length);\n  const relicPlan=v10RelicDamagePlan({relics:next.relics||[],outcome,cardCount:stackCardCount,damageRate:stackDamageRate,pitchInPA});\n  const applied=applyPitcherOutcome(next.pitcher,outcome,{pitchId:next.stats.pitches,damageMultiplier:relicPlan.damageRate,damageBonus:relicPlan.damageBonus});\n  next.pitcher=applied.pitcher;`,
  'play relic damage');
engine=replaceOnce(engine,
  "    verdict:r.label,damage:applied.result.damage,baseDamage:applied.result.baseDamage,damageRate,cardCount:stackCardCount,hpAfter:applied.result.hpAfter,\n  }};",
  "    verdict:r.label,damage:applied.result.damage,baseDamage:applied.result.baseDamage,damageRate:relicPlan.damageRate,baseStackDamageRate:stackDamageRate,\n    relicBonus:relicPlan.damageBonus,relicEvents:relicPlan.events,cardCount:stackCardCount,hpAfter:applied.result.hpAfter,\n  }};\n  if(relicPlan.events.length&&next.last?.events)next.last.events=[...relicPlan.events.map(e=>'유물 · '+e),...next.last.events];",
  'last combat relic metadata');
write('src/duel/engine.js',engine);

let hp=read('src/duel/pitcher-hp.js');
hp=replaceOnce(hp,
`  const damageMultiplier=Number.isFinite(opts.damageMultiplier)?clamp(opts.damageMultiplier,0,1):1;\n  const damage=calc.damage>0?Math.max(1,Math.round(calc.damage*damageMultiplier)):0;`,
`  const damageMultiplier=Number.isFinite(opts.damageMultiplier)?clamp(opts.damageMultiplier,0,1):1;\n  const damageBonus=Number.isFinite(opts.damageBonus)?clamp(Math.round(opts.damageBonus),0,99):0;\n  const damage=calc.damage>0?Math.max(1,Math.round(calc.damage*damageMultiplier)+damageBonus):0;`,
  'pitcher damage bonus');
hp=replaceOnce(hp,
  "  return {pitcher:next,result:{...calc,baseDamage:calc.damage,damage,damageMultiplier,hpAfter,locked:hpAfter<=0,duplicate:false}};",
  "  return {pitcher:next,result:{...calc,baseDamage:calc.damage,damage,damageMultiplier,damageBonus,hpAfter,locked:hpAfter<=0,duplicate:false}};",
  'pitcher result bonus');
write('src/duel/pitcher-hp.js',hp);

let main=read('src/main.jsx');
main=replaceOnce(main,
  'import "./duel/combat-readability.css";',
  'import "./duel/combat-readability.css";\nimport "./duel/v10-relic-ui.js";\nimport "./duel/v10-relic-ui.css";',
  'main relic ui imports');
write('src/main.jsx',main);

let map=read('src/duel/run-map.js');
map=replaceOnce(map,
  "  shop:{effect:'전력 보강',detail:'다음 승부 전에 카드·장비 선택지를 확보하는 구간입니다.',risk:'낮음',reward:'선택지 확장'},",
  "  shop:{effect:'전력 보강',detail:'카드와 런 전체를 바꾸는 유물 중 하나를 골라 전력을 보강합니다.',risk:'낮음',reward:'카드 / 유물'},",
  'shop copy');
write('src/duel/run-map.js',map);

const test=`import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {V10_RELICS,v10RelicOffers,v10RelicDamagePlan,v10RelicDamageRate} from '../src/duel/v10-relics.js';
import {createPitcherHp,applyPitcherOutcome} from '../src/duel/pitcher-hp.js';

describe('V10 build relics',()=>{
  it('offers two deterministic unowned relics',()=>{
    const a=v10RelicOffers({seed:17,act:1,nodeSeed:91,owned:[]});
    expect(a).toHaveLength(2);expect(v10RelicOffers({seed:17,act:1,nodeSeed:91,owned:[]})).toEqual(a);
    expect(v10RelicOffers({seed:17,act:1,nodeSeed:91,owned:[a[0]]})).not.toContain(a[0]);
  });
  it('makes the two-card stack a real build direction',()=>{
    expect(v10RelicDamageRate([],2,.8)).toBe(.8);
    expect(v10RelicDamageRate(['twoStack'],2,.8)).toBe(1);
    const plan=v10RelicDamagePlan({relics:['twoStack'],outcome:{kind:'hit',bases:1,zone:4},cardCount:2,damageRate:.8,pitchInPA:2});
    expect(plan.damageRate).toBe(1);expect(plan.events.join(' ')).toContain('더블 그립');
  });
  it('stacks situational HP bonuses without changing base damage tables',()=>{
    const plan=v10RelicDamagePlan({relics:['firstPitch','awayBadge','slugBand'],outcome:{kind:'hit',bases:2,zone:5},cardCount:1,damageRate:1,pitchInPA:1});
    expect(plan.damageBonus).toBe(11);expect(plan.events).toHaveLength(3);
    const applied=applyPitcherOutcome(createPitcherHp({maxHp:72}),{kind:'hit',bases:2,zone:5,aimZone:5},{pitchId:1,damageBonus:plan.damageBonus});
    expect(applied.result.baseDamage).toBe(18);expect(applied.result.damage).toBe(29);
  });
  it('defines five readable relic identities',()=>{
    expect(Object.keys(V10_RELICS)).toHaveLength(5);
    for(const relic of Object.values(V10_RELICS)){expect(relic.name.length).toBeGreaterThan(2);expect(relic.text).toContain('HP');}
  });
  it('wires relic choice, combat metadata and HUD into the main run',()=>{
    const engine=fs.readFileSync(new URL('../src/duel/engine.js',import.meta.url),'utf8');
    const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
    expect(engine).toContain("type:'relic'");expect(engine).toContain('v10RelicDamagePlan');expect(engine).toContain('relicEvents:relicPlan.events');
    expect(main).toContain('v10-relic-ui.js');expect(main).toContain('v10-relic-ui.css');
  });
});
`;
write('tests/v10-relics.test.js',test);
console.log('V10 relic build patch applied');
