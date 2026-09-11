// Right-handed batter: screen-left is inside. Cards shape coverage, not a contact threshold.
export const ZONES=['몸쪽 높음','가운데 높음','바깥 높음','몸쪽 중간','한가운데','바깥 중간','몸쪽 낮음','가운데 낮음','바깥 낮음'];
export const CARDS={
  strike:{name:'밀어치기',type:'attack',art:'bat',shape:'column',power:0,text:'선택한 세로 3존 커버. 적중하면 안타 확정. 바깥쪽에서 타구 질 보너스.',flavor:'바깥 공을 끝까지 보고 반대편으로.'},
  slug:{name:'당겨 넘기기',type:'attack',art:'comet',shape:'point',power:2,text:'선택한 1존 적중 시 안타 확정. 파워 +36으로 장타 베팅. 빗나가면 헛스윙 위험.',flavor:'내가 기다린 공 하나.'},
  rally:{name:'주자 연결',type:'attack',art:'double',shape:'row',power:0,text:'선택한 가로 3존 커버. 안타 때 기존 주자는 최소 두 베이스 전진.',flavor:'홈으로 부를 공을 기다린다.'},
  bunt:{name:'희생 번트',type:'attack',art:'diamond',shape:'all',power:0,text:'9존 대응. 스트라이크에 70% 희생 번트, 30% 파울. 2스트라이크 번트 파울은 삼진.',flavor:'세 번째 아웃이면 득점도 없다.'},
  finisher:{name:'갭 공략',type:'attack',art:'sun',shape:'row',power:1,text:'가로 3존 커버. 안타 때 2루타·홈런 기회. 파워 +18.',flavor:'수비 사이를 가른다.'},
  defend:{name:'커트 스윙',type:'attack',art:'shield',shape:'cross',power:-1,text:'선택 존과 상하좌우 커버. 범위 적중은 단타 확정. 범위 밖에서도 파울 생존에 유리.',flavor:'좋은 공까지 타석을 이어간다.'},
  setup:{name:'타이밍 맞추기',type:'skill',art:'target',text:'준비 1회 · 이번 타석 집중 +1. 타격 +8 · 파워 +5로 적중한 공의 안타 종류를 개선.',flavor:'위치를 못 읽은 스윙까지 구해주지는 않는다.'},
  watch:{name:'작전 확인',type:'skill',art:'eye',text:'준비 1회 · 카드 2장 뽑기. 준비는 타석당 최대 2회.',flavor:'한 타석에 쓸 선택지를 늘린다.'},
  scout:{name:'릴리스 간파',type:'skill',art:'book',text:'준비 1회 · 이번 공의 높음/중간/낮음 또는 볼 여부를 확인. 카드 1장 뽑기.',flavor:'정답 존이 아닌, 관찰 가능한 단서.'},
  lure:{name:'코스 조정',type:'skill',art:'ball',text:'준비 1회 · 다음 스윙 커버를 상하좌우 1칸 확장. 사용 후 소멸.',flavor:'투수의 공을 바꾸지 않고 내 대응을 바꾼다.'},
  flow:{name:'히트앤드런 사인',type:'skill',art:'spark',text:'준비 1회 · 이번 타석 안타 때 기존 주자 추가 1베이스. 주자가 있어야 사용.',flavor:'사인만으로 주자가 움직이지는 않는다.'},
  calm:{name:'호흡 고르기',type:'skill',art:'moon',text:'준비 1회 · 이번 타석 파울 생존력 증가. 카드 1장 뽑기.',flavor:'몰려도 승부는 끝나지 않았다.'},
};
export const BUILDS={
  pull:{name:'몸쪽 장타',description:'좁게 기다려 크게 친다 · 당겨 넘기기 중심',stats:{technique:52,power:76,luck:44},zones:[0,3,4,6],cards:['slug','slug','setup','scout','lure','strike','slug','flow','watch','setup','rally','calm']},
  away:{name:'바깥 연결',description:'세로 커버로 출루와 진루 · 밀어치기 중심',stats:{technique:76,power:45,luck:50},zones:[2,4,5,8],cards:['strike','rally','scout','watch','setup','strike','rally','flow','calm','strike','lure','bunt']},
  contact:{name:'끈질긴 컨택',description:'넓게 버티며 볼넷과 기회 탐색 · 커트 중심',stats:{technique:58,power:34,luck:72},zones:[1,3,5,7],cards:['defend','strike','scout','calm','watch','defend','rally','defend','setup','lure','bunt','calm']},
};
export const TYPE_NAMES={attack:'한 공의 스윙',skill:'타석 준비 · 최대 2회'};
export const GROWTHS={
  patience:{name:'끝까지 기다린 한 공',short:'기다림',art:'comet',color:'power',signature:'scout',
    ranks:['지켜본 스트라이크마다 기다림 +1 (타석당 2). 모은 기다림을 써서 한 존 스윙에 파워 +24/중첩. 헛스윙해도 소모.',
      '한 존 승부의 파워가 기다림당 +36으로 강화.',
      '한 존 승부의 파워가 기다림당 +48로 강화.'],
    change:'관찰 카드와 지켜보기로 준비한 한 공. 넓은 커버를 포기하고 장타에 건다.'},
  relay:{name:'다음 타자를 믿는다',short:'연결',art:'double',color:'relay',signature:'bunt',
    ranks:['희생 번트로 주자를 진루시키면 다음 타자에게 연결 사인. 그 타석 타격 +10, 안타 때 기존 주자 추가 1베이스.',
      '연결 사인의 타격 보너스 +20. 기존 주자 추가 1베이스.',
      '연결 사인의 타격 보너스 +30, 기존 주자 추가 2베이스.'],
    change:'아웃 하나를 다음 타석에 투자한다. 3아웃과 승부 종료 시 사인은 소멸.'},
  fortune:{name:'이상하게 풀리는 날',short:'행운',art:'spark',color:'fortune',signature:'defend',
    ranks:['땅볼 안타 +1, 바가지 안타 +2 행운 (최대 6). 3행운을 예약하면 다음 비홈런 안타 때 타자와 기존 주자 추가 1베이스.',
      '행운 사용 비용 3 → 2. 미적중·홈런이면 행운을 소비하지 않음.',
      '땅볼 +2 / 바가지 +3 행운. 사용한 안타에서는 행운을 다시 얻지 않음.'],
    change:'약한 단타를 모아 수비 혼선을 일으킨다. 행운은 승부 사이에도 남는다.'},
};
export const growthCost=level=>level>=2?2:3;
export const rewardChoices=(stage,growthKey)=>[...new Set([...(REWARDS[stage]||[]),...(GROWTHS[growthKey]?[GROWTHS[growthKey].signature]:[])])];
export const SAVE_KEY='9zone-growth-v6';
export const LINEUP=[
  {id:'p1',name:'강한결',number:7},{id:'p2',name:'이민준',number:12},{id:'p3',name:'박도윤',number:24},
  {id:'p4',name:'최태오',number:33},{id:'p5',name:'정시우',number:18},{id:'p6',name:'한재윤',number:5},
  {id:'p7',name:'서지호',number:41},{id:'p8',name:'오하준',number:9},{id:'p9',name:'김유찬',number:16},
];
export const STAGES=[
  {name:'루키의 승부',sub:'3아웃 전 2점 · 바깥 선호, 2스트라이크 몸쪽',target:2,style:'rookie',stats:{stuff:48,movement:46,command:50}},
  {name:'낮게 가라앉는 공',sub:'3아웃 전 3점 · 낮은 공, 높은 변화량',target:3,style:'sinker',stats:{stuff:58,movement:68,command:58}},
  {name:'담장 앞의 수비',sub:'3아웃 전 3점 · 외야 후퇴, 단타 연결',target:3,style:'deep',stats:{stuff:63,movement:52,command:64}},
  {name:'마지막 세 개의 아웃',sub:'3아웃 전 4점 · 반복한 노림의 반대편',target:4,style:'closer',stats:{stuff:78,movement:72,command:76}},
];
export const REWARDS=[['calm','flow','rally'],['lure','scout','defend'],['finisher','slug','setup']];
export const GLOSSARY=[
  ['9존과 4숙련존','우타자 기준 왼쪽은 몸쪽. 시작 덱마다 4숙련존이 다릅니다. 카드 타격 범위에 실제 공이 들어오면 안타 확정입니다. 숙련존은 타구 질과 장타력 +12이며 안타 여부를 뒤집지 않습니다.'],
  ['READ → BET → REVEAL → IMPACT','코스 경향과 기록 읽기 → 준비·카드·노릴 존 선택 → 실제 공과 결과 공개 → 다음 공 또는 다음 타자. 적중 여부는 코스에 달리고, 적중 후에는 스탯 비교로 안타 종류를 정합니다.'],
  ['볼과 스트라이크','지켜본 볼은 볼카운트 +1, 스트라이크는 +1. 4볼은 밀어내기 포함 볼넷, 3스트라이크는 삼진. 일반 파울은 2스트라이크에서 더 늘지 않습니다. 번트 파울은 예외입니다.'],
  ['BASIC SWING','카드 없이 선택한 1존을 스윙합니다. 일반적으로 적중하면 단타이며, 기다림 성장을 사용하면 장타도 가능합니다. 카드가 없어도 읽은 공에 승부할 수 있습니다.'],
  ['공개 정보와 실제 공','표시된 코스 확률로 다음 공을 미리 추첨합니다. 존을 바꾸거나 카드를 고른다고 공이 다시 뽑히지 않습니다. 릴리스 간파는 그 공의 높이만 추가로 보여줍니다.'],
  ['선수와 카드','베이스에는 p1–p9 선수만 올라갑니다. 사용한 카드는 버린 더미로 갑니다. 헛스윙·파울 뒤 같은 타자가 계속 서며, 타석 종료 후에만 다음 타자를 입장시킵니다.'],
  ['검증 범위','같은 시험 시드로 세 덱을 비교하는 전략 시험판입니다. 투구 코스·범위 밖 파울과 헛스윙·적중 후 안타 종류에 확률을 사용합니다. 안타·진루는 단순화돼 있으며 실제 야구 통계나 30분의 재미를 검증한 완성판이 아닙니다.'],
];
