import {CARDS,REWARDS,SAVE_KEY,STAGES} from './cards.js';
const clone=s=>JSON.parse(JSON.stringify(s));
const rand=s=>{s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;};
function shuffle(s,a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rand(s)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const cardById=(s,id)=>s.deck.find(c=>c.id===id);
function draw(s,n){const b=s.battle;while(n-->0&&b.hand.length<10){if(!b.draw.length)b.draw=shuffle(s,b.discard.splice(0));if(!b.draw.length)break;b.hand.push(b.draw.pop());}}
export function baseIntent(s){
  const b=s.battle,atk=STAGES[s.stage].attack+b.strength;
  switch((b.turn-1)%4){
    case 0:return {kind:'breaking',name:'낮은 변화구',attack:atk,block:0,detail:'턴 종료 시 공격. 볼 골라내기로 카운트를 유리하게 만들 수 있습니다.'};
    case 1:return {kind:'fastball',name:'몸쪽 직구',attack:atk+2,block:0,detail:'턴 종료 시 공격. 풀스윙의 추가 피해가 발동합니다.'};
    case 2:return {kind:'rest',name:'로진백 · 재정비',attack:0,block:8+s.stage*2,detail:'공격하지 않습니다. 방어를 얻고 이후 공격력이 2 증가합니다.'};
    default:return {kind:'breaking',name:'바깥 슬라이더',attack:atk+4,block:0,detail:'강한 공격. 방어를 쌓거나 직구로 유도하세요.'};
  }
}
export function createDuel(seed=Date.now()>>>0){
  const kinds=['strike','strike','strike','defend','defend','defend','watch','watch','setup','slug'];
  return {version:1,seed:seed>>>0,phase:'map',stage:0,hp:50,maxHp:50,deck:kinds.map((kind,i)=>({id:`c${i}`,kind})),nextId:10,
    battle:null,rewards:[],victories:0,stats:{cards:0,turns:0,damage:0,blocked:0,taken:0},last:null};
}
export function startBattle(state){
  if(state.phase!=='map')return state;
  const s=clone(state);s.phase='battle';
  s.battle={turn:1,enemyHp:STAGES[s.stage].hp,enemyBlock:0,strength:0,block:0,energy:3,aim:0,count:0,
    calm:0,played:0,skills:0,hand:[],draw:shuffle(s,s.deck.map(c=>c.id)),discard:[],exhaust:[],intent:null,log:[]};
  draw(s,5);s.battle.intent=baseIntent(s);s.last={kind:'start',text:'상대의 의도를 보고, 손패를 연결하세요.'};return s;
}
export function cardProblem(s,id){
  if(s.phase!=='battle')return '전투 중에만 사용할 수 있습니다.';
  const b=s.battle,c=cardById(s,id);if(!c||!b.hand.includes(id))return '손패에 없는 카드입니다.';
  if(CARDS[c.kind].cost>b.energy)return '행동력이 부족합니다.';
  if(c.kind==='lure'&&b.count<1)return '유리한 카운트 1이 필요합니다.';
  if(c.kind==='flow'&&b.skills<2)return '이번 턴에 스킬 2장을 먼저 사용하세요.';
  return null;
}
function damage(s,amount){
  const b=s.battle,blocked=Math.min(b.enemyBlock,amount);b.enemyBlock-=blocked;
  const dealt=Math.min(b.enemyHp,Math.max(0,amount-blocked));b.enemyHp-=dealt;s.stats.damage+=dealt;return dealt;
}
function settle(s){
  if(s.battle.enemyHp<=0){s.victories++;s.phase=s.stage===3?'won':'reward';s.hp=Math.min(s.maxHp,s.hp+5);}
  if(s.hp<=0)s.phase='lost';return s;
}
export function playCard(state,id){
  if(cardProblem(state,id))return state;
  const s=clone(state),b=s.battle,c=cardById(s,id),def=CARDS[c.kind];
  const before={hp:b.enemyHp,block:b.block,energy:b.energy,hand:b.hand.length};
  b.hand.splice(b.hand.indexOf(id),1);b.energy-=def.cost;
  (['scout','flow','calm'].includes(c.kind)?b.exhaust:b.discard).push(id);
  const hit=n=>{const bonus=b.aim*3;b.aim=0;damage(s,n+bonus);};
  switch(c.kind){
    case 'strike':hit(6);break;
    case 'defend':b.block+=7;break;
    case 'watch':b.block+=5;if(b.intent.kind==='breaking'){b.count=Math.min(5,b.count+1);draw(s,1);}break;
    case 'scout':draw(s,2);b.aim++;break;
    case 'lure':b.count--;b.intent={kind:'fastball',name:'유도한 직구',attack:Math.max(0,b.intent.attack-2),block:0,detail:'카드로 바꾼 의도. 풀스윙의 추가 피해가 발동합니다.'};b.aim++;break;
    case 'slug':hit(12+(b.intent.kind==='fastball'?10:0));break;
    case 'rally':{const n=4+(b.skills>0?2:0);hit(n);hit(n);break;}
    case 'bunt':hit(4);b.block+=5;break;
    case 'setup':b.aim+=2;b.block+=3;break;
    case 'flow':b.energy++;draw(s,1);break;
    case 'calm':b.calm++;break;
    case 'finisher':hit(8+Math.min(6,b.played)*4);break;
  }
  b.played++;if(def.type==='skill')b.skills++;s.stats.cards++;
  s.last={kind:def.type==='attack'?'hit':c.kind==='lure'?'lure':'skill',card:c.kind,
    damage:before.hp-b.enemyHp,block:b.block-before.block,text:`${def.name}${before.hp>b.enemyHp?` · 피해 ${before.hp-b.enemyHp}`:b.block>before.block?` · 방어 +${b.block-before.block}`:''}`};
  b.log=[s.last.text,...b.log].slice(0,8);return settle(s);
}
export function previewCard(s,id){
  const problem=cardProblem(s,id);if(problem)return {problem};
  const after=playCard(s,id);return {damage:after.last.damage,block:after.last.block,energy:after.battle.energy,
    draw:Math.max(0,after.battle.hand.length-(s.battle.hand.length-1)),intent:after.battle.intent.kind};
}
export function endTurn(state){
  if(state.phase!=='battle')return state;
  const s=clone(state),b=s.battle,intent=b.intent;
  const blocked=Math.min(intent.attack,b.block),taken=intent.attack-blocked;
  s.hp=Math.max(0,s.hp-taken);s.stats.blocked+=blocked;s.stats.taken+=taken;s.stats.turns++;
  b.enemyBlock=intent.block;if(intent.kind==='rest')b.strength+=2;
  b.discard.push(...b.hand);b.hand=[];b.block=b.calm*3;b.energy=3;b.played=0;b.skills=0;b.turn++;
  s.last={kind:'pitch',damage:taken,blocked,text:intent.attack?`${intent.name} · ${blocked} 방어 / ${taken} 피해`:`재정비 · 상대 방어 ${intent.block}, 공격력 +2`};
  b.log=[s.last.text,...b.log].slice(0,8);
  if(s.hp<=0){s.phase='lost';return s;}
  draw(s,5);b.intent=baseIntent(s);return s;
}
export function chooseCard(state,kind){
  if(state.phase!=='reward'||(kind!=='skip'&&!REWARDS[state.stage].includes(kind)))return state;
  const s=clone(state);
  if(kind!=='skip')s.deck.push({id:`c${s.nextId++}`,kind});else s.hp=Math.min(s.maxHp,s.hp+4);
  s.rewards.push(kind);s.stage++;s.phase='map';s.last=null;return s;
}
export function saveDuel(storage,s){storage.setItem(SAVE_KEY,JSON.stringify(s));}
export function readDuel(storage){
  const raw=storage.getItem(SAVE_KEY);if(!raw)return null;const s=JSON.parse(raw);
  const int=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
  if(!s||s.version!==1||!int(s.seed,0,0xffffffff)||!['map','battle','reward','won','lost'].includes(s.phase)
    ||!int(s.stage,0,3)||!int(s.hp,0,50)||s.maxHp!==50||!int(s.nextId,10,13)||!int(s.victories,0,4)
    ||!Array.isArray(s.deck)||s.deck.length<10||s.deck.length>13||!s.deck.every(c=>c&&typeof c.id==='string'&&Object.hasOwn(CARDS,c.kind))
    ||new Set(s.deck.map(c=>c.id)).size!==s.deck.length||!Array.isArray(s.rewards)||s.rewards.length>3
    ||!s.rewards.every(k=>k==='skip'||Object.hasOwn(CARDS,k))||!s.stats||!['cards','turns','damage','blocked','taken'].every(k=>int(s.stats[k],0,1000000)))throw new Error('저장된 덱을 읽지 못했습니다.');
  const b=s.battle;
  if(b){
    const groups=['hand','draw','discard','exhaust'];
    if(!groups.every(k=>Array.isArray(b[k]))||!['turn','enemyHp','enemyBlock','strength','block','energy','aim','count','calm','played','skills'].every(k=>int(b[k],0,1000000))
      ||!b.intent||!['breaking','fastball','rest'].includes(b.intent.kind)||!int(b.intent.attack,0,1000000)||!int(b.intent.block,0,1000000)
      ||typeof b.intent.name!=='string'||typeof b.intent.detail!=='string'||!Array.isArray(b.log)||!b.log.every(x=>typeof x==='string'))throw new Error('전투 기록이 손상됐습니다.');
    const ids=groups.flatMap(k=>b[k]);const expected=s.deck.map(c=>c.id);
    // After a reward, the newly acquired card has not entered a battle yet.
    if(new Set(ids).size!==ids.length||!ids.every(id=>expected.includes(id))||ids.length<(s.phase==='map'?expected.length-1:expected.length)||ids.length>expected.length)throw new Error('카드 더미가 손상됐습니다.');
  }else if(s.phase!=='map')throw new Error('전투 정보가 없습니다.');
  return s;
}
