export const CARDS={
  strike:{name:'밀어치기',type:'attack',art:'bat',contact:2,text:'컨택 2 · 단타. 직구에는 컨택 +1. 출루하면 이 카드가 1루에 묶입니다.',flavor:'안타는 카드의 여행이 시작되는 순간.'},
  slug:{name:'담장 넘기기',type:'attack',art:'comet',contact:1,text:'컨택 1 · 2루타. 노림 3 이상이면 홈런. 출루하면 강타 카드도 덱에서 빠집니다.',flavor:'장타를 쳤다. 그런데 다음 손패에서 사라졌다.'},
  rally:{name:'주자 불러들이기',type:'attack',art:'double',contact:2,text:'컨택 2 + 주자 수. 단타지만 기존 주자는 두 베이스 전진합니다.',flavor:'혼자서는 약하다. 동료가 나가 있으면 강하다.'},
  bunt:{name:'스퀴즈 번트',type:'attack',art:'diamond',text:'확정 아웃 1. 주자 모두 한 베이스 전진. 3아웃이면 진루·득점 없음.',flavor:'내 카드를 희생해, 강한 카드를 집으로.'},
  finisher:{name:'투아웃 해결사',type:'attack',art:'sun',contact:2,text:'컨택 2 + 아웃 수 · 2루타. 2아웃이면 3루타.',flavor:'같은 카드. 완전히 다른 무게.'},
  setup:{name:'타이밍 맞추기',type:'skill',art:'target',text:'스트라이크 1을 대가로 노림 +2. 노림은 이번 타석의 타격 컨택에 더합니다.',flavor:'한 번 늦었다. 다음에는 놓치지 않는다.'},
  watch:{name:'커트로 버티기',type:'skill',art:'eye',text:'스트라이크 1을 대가로 카드 3장 뽑기. 손패는 타석이 끝나도 유지됩니다.',flavor:'지금 손에 없는 해법을 찾는다.'},
  scout:{name:'릴리스 간파',type:'skill',art:'book',text:'스트라이크 1을 대가로 노림 +1, 카드 2장 뽑기.',flavor:'공 하나로 정보를 산다.'},
  lure:{name:'승부구 끌어내기',type:'skill',art:'ball',text:'스트라이크 1을 대가로 이번 타석을 직구 승부로 고정. 병살 유도와 결정구를 무력화.',flavor:'너도 이제 물러날 곳이 없지.'},
  flow:{name:'딜레이드 스틸',type:'skill',art:'spark',text:'스트라이크 1을 대가로 선두 주자 한 베이스 전진. 득점한 카드는 손패로 복귀.',flavor:'공을 치지 않고 덱을 돌리는 방법.'},
  calm:{name:'대주자 교체',type:'skill',art:'moon',text:'스트라이크 1을 대가로 선두 주자 카드를 손패로 회수. 이 카드가 그 베이스를 대신 차지.',flavor:'2루에 묶인 강타 카드를 다시 타석으로.'},
  defend:{name:'진루타',type:'attack',art:'shield',text:'확정 아웃 1. 선두 주자 두 베이스 전진. 3아웃이면 진루·득점 없음.',flavor:'한 아웃으로 한 점과 한 장을 돌려받는다.'},
};
export const TYPE_NAMES={attack:'타석 결판',skill:'카운트 거래'};
export const SAVE_KEY='9zone-diamond-v2';
export const STAGES=[
  {name:'카드가 주자가 되는 순간',sub:'3아웃 전에 2점 · 기본 수비',target:2,style:'rookie'},
  {name:'병살의 덫',sub:'3아웃 전에 3점 · 1루를 노리는 투수',target:3,style:'sinker'},
  {name:'담장 앞의 수비',sub:'3아웃 전에 3점 · 장타를 단타로 억제',target:3,style:'deep'},
  {name:'마지막 세 개의 아웃',sub:'3아웃 전에 4점 · 결정구 강화',target:4,style:'closer'},
];
export const REWARDS=[['calm','flow','rally'],['lure','scout','defend'],['finisher','slug','setup']];
export const GLOSSARY=[
  ['베이스 = 덱의 일부','출루한 카드는 주자가 되어 뽑기·버리기 더미에서 빠집니다. 득점하면 손패로 돌아옵니다. 손패가 9장이면 버린 더미로 복귀합니다.'],
  ['3아웃','적 체력은 없습니다. 3아웃 전에 목표 점수를 내세요. 아웃된 카드는 그 승부 동안 벤치에 머뭅니다. 다음 승부에서는 모두 돌아옵니다.'],
  ['카운트 거래','작전 카드는 스트라이크 하나를 소비합니다. 2스트라이크에서는 쓸 수 없습니다. 실제 야구의 모든 규칙을 재현하는 시뮬레이터가 아닌 전술적 추상화입니다.'],
  ['컨택과 노림','컨택이 투수 요구치 이상이면 표시된 안타, 미달이면 아웃. 확률은 없으며 결과를 미리 보여줍니다. 노림과 스트라이크는 타석 종료 시 초기화됩니다.'],
  ['한 구 지켜보기','스트라이크 +1, 카드 1장 뽑기. 세 번째 스트라이크는 아웃입니다. 다른 카드를 찾기 위해 카운트를 지불하는 최후의 선택입니다.'],
  ['반응하는 수비','1루 주자가 차면 병살 유도, 2스트라이크면 결정구. 왜 바뀌었는지 공개합니다. 승부구 끌어내기로 이번 타석의 의도를 고정할 수 있습니다.'],
];
