export const CARDS={
  strike:{name:'밀어치기',type:'attack',art:'bat',contact:2,text:'컨택 2 · 단타. 직구에는 컨택 +1. 현재 타자가 출루하고 타석 종료.',flavor:'한 번의 스윙. 한 명의 주자.'},
  slug:{name:'담장 넘기기',type:'attack',art:'comet',contact:1,text:'컨택 1 · 2루타. 노림 3 이상이면 홈런. 스윙 후 타석 종료.',flavor:'한 공을 위해 준비한 한 번의 스윙.'},
  rally:{name:'주자 불러들이기',type:'attack',art:'double',contact:2,text:'컨택 2 + 주자 수. 단타지만 기존 주자는 두 베이스 전진합니다.',flavor:'혼자서는 약하다. 동료가 나가 있으면 강하다.'},
  bunt:{name:'스퀴즈 번트',type:'attack',art:'diamond',text:'확정 아웃 1. 주자 모두 한 베이스 전진. 3아웃이면 진루·득점 없음.',flavor:'타자 한 명의 희생으로 주자를 홈으로.'},
  finisher:{name:'투아웃 해결사',type:'attack',art:'sun',contact:2,text:'컨택 2 + 아웃 수 · 2루타. 2아웃이면 3루타.',flavor:'같은 카드. 완전히 다른 무게.'},
  setup:{name:'타이밍 맞추기',type:'skill',art:'target',text:'준비 1회 · 노림 +2. 이번 타석의 스윙에 적용. 공을 소비하지 않습니다.',flavor:'발을 고르고, 한 구를 기다린다.'},
  watch:{name:'작전 확인',type:'skill',art:'eye',text:'준비 1회 · 카드 3장 뽑기. 준비는 타석당 2회. 스트라이크는 늘지 않습니다.',flavor:'더그아웃에서 건네는 선택지.'},
  scout:{name:'릴리스 간파',type:'skill',art:'book',text:'준비 1회 · 노림 +1, 카드 2장 뽑기.',flavor:'앞선 투구에서 찾은 단서.'},
  lure:{name:'승부구 끌어내기',type:'skill',art:'ball',text:'준비 1회 · 이번 타석의 의도를 직구로 고정. 병살 유도와 결정구 무력화.',flavor:'투수 의도 조작은 이 검증판의 전술적 추상화입니다.'},
  flow:{name:'히트앤드런 사인',type:'skill',art:'spark',text:'준비 1회 · 이번 안타 때 기존 주자 추가 1베이스. 사인만으로 주자가 이동하지 않습니다.',flavor:'주자는 다음 타격과 함께 움직인다.'},
  calm:{name:'호흡 고르기',type:'skill',art:'moon',text:'준비 1회 · 노림 +1, 카드 1장 뽑기.',flavor:'선수는 선수. 카드는 그 선수의 행동.'},
  defend:{name:'진루타',type:'attack',art:'shield',text:'확정 아웃 1. 선두 주자 두 베이스 전진. 3아웃이면 진루·득점 없음.',flavor:'타자의 아웃과 주자의 진루를 맞바꾼다.'},
};
export const TYPE_NAMES={attack:'스윙 1회 · 타석 종료',skill:'스윙 전 준비'};
export const SAVE_KEY='9zone-lineup-v3';
export const LINEUP=[
  {id:'p1',name:'강한결',number:7},{id:'p2',name:'이민준',number:12},{id:'p3',name:'박도윤',number:24},
  {id:'p4',name:'최태오',number:33},{id:'p5',name:'정시우',number:18},{id:'p6',name:'한재윤',number:5},
  {id:'p7',name:'서지호',number:41},{id:'p8',name:'오하준',number:9},{id:'p9',name:'김유찬',number:16},
];
export const STAGES=[
  {name:'한 타자, 한 번의 승부',sub:'3아웃 전에 2점 · 기본 수비',target:2,style:'rookie'},
  {name:'병살의 덫',sub:'3아웃 전에 3점 · 1루를 노리는 투수',target:3,style:'sinker'},
  {name:'담장 앞의 수비',sub:'3아웃 전에 3점 · 장타를 단타로 억제',target:3,style:'deep'},
  {name:'마지막 세 개의 아웃',sub:'3아웃 전에 4점 · 결정구 강화',target:4,style:'closer'},
];
export const REWARDS=[['calm','flow','rally'],['lure','scout','defend'],['finisher','slug','setup']];
export const GLOSSARY=[
  ['선수와 행동 카드','9명의 선수가 1번부터 타순대로 등장합니다. 베이스에는 선수만 올라갑니다. 모든 사용 카드는 버린 더미로 이동하며, 출루하거나 득점한다고 카드가 주자가 되거나 회수되지 않습니다.'],
  ['타석 종료','타격을 확정하면 스윙과 진루를 한 번만 처리합니다. 결과 화면에서 다음 타자 입장을 눌러야 다시 행동할 수 있습니다. 새로고침해도 이 대기 상태가 유지됩니다.'],
  ['스윙 전 준비','한 타석에서 준비 카드 최대 2장. 준비 자체로 투구나 스트라이크가 발생하지 않습니다. 그 뒤 최종 타격 카드를 한 장 선택합니다.'],
  ['컨택과 노림','컨택이 투수 요구치 이상이면 표시된 안타, 미달이면 아웃. 확률은 없으며 결과를 미리 보여줍니다. 노림과 스트라이크는 타석 종료 시 초기화됩니다.'],
  ['한 구 지켜보기','스트라이크 +1, 카드 1장 뽑기. 세 번째 스트라이크는 아웃입니다. 다른 카드를 찾기 위해 카운트를 지불하는 최후의 선택입니다.'],
  ['3아웃과 반응형 수비','3아웃 전에 목표 점수를 내세요. 주자와 카운트에 따른 수비 변화와 결과는 공개됩니다. 컨택 수치·의도 고정은 덱빌딩을 위한 추상화이며 정밀 야구 시뮬레이터는 아닙니다.'],
];
