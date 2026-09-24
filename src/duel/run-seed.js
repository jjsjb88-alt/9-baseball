/* MAIN RUN은 런마다 새 시드를 받아 지도·상대·투구가 달라진다.
   타이틀의 "비교용 시드"는 튜토리얼 비교 전용이다. QA 재현은 ?seed=N 으로 고정한다. */
export function mainRunSeed({search=globalThis.location?.search||'',crypto=globalThis.crypto}={}){
  const fixed=new URLSearchParams(search).get('seed');
  if(fixed!==null&&/^\d+$/.test(fixed))return Number(fixed)>>>0;
  if(crypto?.getRandomValues)return crypto.getRandomValues(new Uint32Array(1))[0]>>>0;
  return Math.floor(Math.random()*0x100000000)>>>0;
}
