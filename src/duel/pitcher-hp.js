export const PITCHER_DAMAGE=Object.freeze({
  homeRun:30,triple:22,double:18,single:12,inPlayOut:4,walk:6,
  hardFoul:3,foul:2,nearMiss:2,whiff:1,ball:1,calledStrike:0,
});

const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const int=n=>Number.isInteger(n);

export function pitcherPhase(hp,maxHp){
  if(hp<=0)return 'defeated';
  const ratio=hp/maxHp;
  if(ratio<=.30)return 'critical';
  if(ratio<=.60)return 'pressured';
  return 'steady';
}

const PATTERNS={
  rookie:['바깥 승부','가운데 유인','낮은 공','몸쪽 승부'],
  sinker:['낮은 싱커','낮은 유인','몸쪽 싱커','바깥 싱커'],
  deep:['높은 공','바깥 승부','가운데 유인','몸쪽 승부'],
  closer:['몸쪽 승부구','바깥 유인','가운데 강공','낮은 결정구'],
};

export function buildPitchPattern(seed=0,style='rookie'){
  const source=PATTERNS[style]||PATTERNS.rookie,offset=(seed>>>0)%source.length;
  return source.map((_,i)=>source[(i+offset)%source.length]);
}

export function createPitcherHp({name='상대 투수',maxHp=72,seed=0,style='rookie'}={}){
  const safeMax=int(maxHp)&&maxHp>0?maxHp:72;
  return {name,hp:safeMax,maxHp:safeMax,phase:'steady',lastDamage:0,lastPitchId:null,foulStreak:0,
    pattern:buildPitchPattern(seed,style),patternSeed:seed>>>0};
}

export function zoneDistance(a,b){
  if(!int(a)||!int(b)||a<0||a>8||b<0||b>8)return Infinity;
  return Math.abs(Math.floor(a/3)-Math.floor(b/3))+Math.abs(a%3-b%3);
}

export function damageForOutcome(outcome={},foulStreak=0){
  const kind=outcome.kind,label=String(outcome.label||''),distance=zoneDistance(outcome.aimZone,outcome.zone);
  let key='calledStrike',base=PITCHER_DAMAGE.calledStrike;
  if(kind==='hit'){
    const bases=outcome.bases||1;
    if(bases>=4){key='homeRun';base=PITCHER_DAMAGE.homeRun;}
    else if(bases===3){key='triple';base=PITCHER_DAMAGE.triple;}
    else if(bases===2){key='double';base=PITCHER_DAMAGE.double;}
    else {key='single';base=PITCHER_DAMAGE.single;}
  }else if(label==='볼넷'||kind==='walk'){
    key='walk';base=PITCHER_DAMAGE.walk;
  }else if(kind==='out'||kind==='sacrifice'){
    key='inPlayOut';base=PITCHER_DAMAGE.inPlayOut;
  }else if(kind==='foul'){
    const hard=outcome.hardFoul===true||distance===1;
    key=hard?'hardFoul':'foul';base=hard?PITCHER_DAMAGE.hardFoul:PITCHER_DAMAGE.foul;
    base=Math.max(0,base-Math.max(0,foulStreak));
  }else if(kind==='whiff'||kind==='miss'){
    const near=distance===1;
    key=near?'nearMiss':'whiff';base=near?PITCHER_DAMAGE.nearMiss:PITCHER_DAMAGE.whiff;
  }else if(kind==='ball'){
    key='ball';base=PITCHER_DAMAGE.ball;
  }else if(kind==='called'){
    key='calledStrike';base=PITCHER_DAMAGE.calledStrike;
  }
  return {key,damage:clamp(base,0,99)};
}

export function applyPitcherOutcome(pitcher,outcome,opts={}){
  if(!pitcher)return {pitcher:null,result:{damage:0,hpAfter:0,locked:true}};
  const pitchId=opts.pitchId??null;
  if(pitcher.hp<=0)return {pitcher,result:{damage:0,hpAfter:0,locked:true,duplicate:false}};
  if(pitchId!==null&&pitcher.lastPitchId===pitchId)
    return {pitcher,result:{damage:0,hpAfter:pitcher.hp,locked:false,duplicate:true}};
  const calc=damageForOutcome(outcome,pitcher.foulStreak||0),hpAfter=Math.max(0,pitcher.hp-calc.damage);
  const next={...pitcher,hp:hpAfter,phase:pitcherPhase(hpAfter,pitcher.maxHp),lastDamage:calc.damage,
    lastPitchId:pitchId,foulStreak:outcome?.kind==='foul'?(pitcher.foulStreak||0)+1:0};
  return {pitcher:next,result:{...calc,hpAfter,locked:hpAfter<=0,duplicate:false}};
}

export const pitcherSelector=p=>p?({name:p.name,hp:p.hp,maxHp:p.maxHp,phase:p.phase,lastDamage:p.lastDamage}):null;

export function isPitcherHp(p){
  return !!p&&typeof p.name==='string'&&int(p.hp)&&int(p.maxHp)&&p.maxHp>0&&p.hp>=0&&p.hp<=p.maxHp
    &&['steady','pressured','critical','defeated'].includes(p.phase)&&p.phase===pitcherPhase(p.hp,p.maxHp)
    &&int(p.lastDamage)&&p.lastDamage>=0&&Array.isArray(p.pattern);
}
