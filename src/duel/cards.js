export const CARDS = {
  strike:{name:'정타',type:'attack',cost:1,art:'bat',text:'피해 6.',flavor:'작게, 정확하게.'},
  defend:{name:'파울로 버티기',type:'skill',cost:1,art:'shield',text:'방어 7.',flavor:'이 타석은 아직 안 끝났다.'},
  watch:{name:'볼 골라내기',type:'skill',cost:1,art:'eye',text:'방어 5. 변화구 의도라면 유리한 카운트 1을 얻고 1장 뽑습니다.',flavor:'유혹에 넘어가지 않는다.'},
  scout:{name:'스카우팅',type:'skill',cost:0,art:'book',text:'2장 뽑고 노림 1을 얻습니다. 소멸.',flavor:'아까와 같은 버릇.'},
  lure:{name:'직구 유도',type:'skill',cost:0,art:'ball',text:'유리한 카운트 1 소비. 의도를 직구로 바꾸고 공격력을 2 낮춥니다. 노림 1.',flavor:'내가 기다리는 공을 던져.'},
  slug:{name:'풀스윙',type:'attack',cost:2,art:'comet',text:'피해 12. 직구 의도라면 피해 +10.',flavor:'이 한 구를 위해.'},
  rally:{name:'연속 안타',type:'attack',cost:1,art:'double',text:'피해 4를 2번. 이번 턴 스킬을 썼다면 각각 피해 +2.',flavor:'흐름은 끊기지 않는다.'},
  bunt:{name:'번트 작전',type:'attack',cost:1,art:'diamond',text:'피해 4. 방어 5.',flavor:'한 걸음도 전진이다.'},
  setup:{name:'타석 준비',type:'skill',cost:1,art:'target',text:'노림 2. 방어 3. 노림 1당 다음 공격의 첫 타격에 피해 +3.',flavor:'발을 고르고, 시선을 낮춘다.'},
  flow:{name:'리듬 타기',type:'skill',cost:0,art:'spark',text:'이번 턴 스킬 2장 필요. 행동력 1을 얻고 1장 뽑습니다. 소멸.',flavor:'이제 내 속도다.'},
  calm:{name:'침착함',type:'power',cost:1,art:'moon',text:'이번 전투 동안 매 턴 시작에 방어 3. 중첩 가능. 사용 후 소멸.',flavor:'소음은 멀어지고, 공만 남는다.'},
  finisher:{name:'승부의 한 방',type:'attack',cost:2,art:'sun',text:'피해 8 + 이번 턴 앞서 쓴 카드당 4 (최대 +24).',flavor:'앞선 모든 선택의 끝.'},
};
export const TYPE_NAMES={attack:'타격',skill:'기술',power:'지속'};
export const SAVE_KEY='9zone-duel-v1';
export const STAGES=[
  {name:'첫 번째 타석',sub:'선구안을 시험한다',hp:34,attack:6},
  {name:'승부의 설계',sub:'공을 기다리지 말고, 유도하라',hp:44,attack:8},
  {name:'흐름을 빼앗다',sub:'손패를 하나의 공격으로',hp:54,attack:10},
  {name:'마지막 승부',sub:'완성한 덱을 증명하라',hp:70,attack:12},
];
export const REWARDS=[['lure','rally','calm'],['flow','scout','bunt'],['finisher','slug','watch']];
export const GLOSSARY=[
  ['평정심','플레이어의 생명력. 0이 되면 런이 끝납니다.'],
  ['제구','투수의 생명력. 타격 카드로 0까지 낮추면 승리합니다. 실제 야구 득점이 아닌 심리전 전투 수치입니다.'],
  ['방어','이번 턴에 받을 공격을 먼저 막습니다. 다음 턴 시작에 남은 방어가 사라집니다.'],
  ['노림','다음 공격의 첫 타격에 중첩당 피해 +3. 공격하면 모두 소비합니다. 턴을 넘겨도 남습니다.'],
  ['유리한 카운트','변화구에 볼 골라내기를 사용하면 얻습니다. 직구 유도에 필요하고 턴을 넘겨도 남습니다.'],
  ['소멸','이번 전투의 덱에서 빠집니다. 다음 전투에는 돌아옵니다.'],
];
