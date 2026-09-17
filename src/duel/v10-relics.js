export const V10_RELICS=Object.freeze({
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
