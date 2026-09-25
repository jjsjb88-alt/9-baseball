/* V13 NIGHT GAME — 짧은 해설자 톤. 규칙 원문은 카드 상세 시트와 도움말에 있다.
   엔진의 intent.name을 키로 받아 (속삭임, 코치 한 줄)을 준다. 모르는 이름은 엔진 문구를 그대로 쓴다. */
const INTENT_LINES={
  '바깥쪽 승부':['바깥쪽을 노린다','바깥쪽을 좋아한다. 몰리면 몸쪽으로 온다.'],
  '낮은 싱커':['낮게 떨어뜨린다','낮은 공이 온다. 맞혀도 타구가 무겁다.'],
  '높은 공 · 외야 후퇴':['높은 공으로 띄운다','뜬공을 노린다. 못 넘기면 단타다.'],
  '몸쪽 승부구':['몸쪽으로 파고든다','투 스트라이크. 몸쪽이 온다.'],
  '이전 노림의 반대편':['방금 노린 반대편','네가 노린 반대쪽으로 던진다.'],
};

export function intentLines(intent){
  if(!intent)return {whisper:'',coach:''};
  const hit=INTENT_LINES[intent.name];
  return hit?{whisper:hit[0],coach:hit[1]}:{whisper:intent.name||'',coach:intent.detail||''};
}

export const ZONE_WORDS=['몸쪽 높게','가운데 높게','바깥쪽 높게','몸쪽','가운데','바깥쪽','몸쪽 낮게','가운데 낮게','바깥쪽 낮게'];

/* 12칸 HP 눈금: 남은 HP가 조금이라도 있으면 최소 한 칸은 켜 둔다. */
export function hpTicks(hp,maxHp,ticks=12){
  const max=Math.max(0,Number(maxHp)||0),cur=Math.max(0,Math.min(max,Number(hp)||0));
  if(!max||!cur)return 0;
  return Math.max(1,Math.round(cur/max*ticks));
}
