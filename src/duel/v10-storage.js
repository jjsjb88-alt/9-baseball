import {validateRunMap} from './run-map.js';
import {isPitcherHp} from './pitcher-hp.js';

export const V10_SAVE_KEY='9zone-v10-run';
const PHASES=new Set(['map','battle','pitch','between','reward','lost','won','training','locker','shop','rest']);

export function validateV10State(s){
  if(!s||s.version!==10||!Number.isInteger(s.initialSeed)||!PHASES.has(s.phase)||!validateRunMap(s.runMap))return false;
  if(!Array.isArray(s.deck)||s.deck.some(c=>!c||typeof c.id!=='string'||typeof c.kind!=='string'))return false;
  if(!Array.isArray(s.rewards)||!s.v10||typeof s.v10!=='object')return false;
  if(s.pitcher!==null&&s.pitcher!==undefined&&!isPitcherHp(s.pitcher))return false;
  if(['battle','pitch','between','reward','lost'].includes(s.phase)&&!isPitcherHp(s.pitcher))return false;
  if(s.phase==='reward'&&s.pitcher?.hp!==0)return false;
  const last=s.v10.lastCombat;
  if(last!==null&&last!==undefined){
    if(typeof last.choice!=='string'||!Number.isInteger(last.actualPitch)||last.actualPitch<0||last.actualPitch>9
      ||typeof last.verdict!=='string'||!Number.isInteger(last.damage)||last.damage<0||!Number.isInteger(last.hpAfter)||last.hpAfter<0)return false;
  }
  return true;
}

const fail=()=>{throw new Error('V10 저장 기록이 손상됐습니다.');};

export function saveV10State(storage,state){
  if(!storage||typeof storage.setItem!=='function'||!validateV10State(state))fail();
  storage.setItem(V10_SAVE_KEY,JSON.stringify(state));
}

export function readV10State(storage){
  if(!storage||typeof storage.getItem!=='function')return null;
  const raw=storage.getItem(V10_SAVE_KEY);if(!raw)return null;
  let state;try{state=JSON.parse(raw);}catch{fail();}
  if(!validateV10State(state))fail();return state;
}
