const TYPES=new Set(['battle','elite','training','locker','shop','rest','boss']);
const COMBAT_TYPES=new Set(['battle','elite','boss']);
const LABELS={
  battle:'정규 승부',elite:'강적 승부',training:'타격 훈련',locker:'라커룸',shop:'장비 상점',rest:'휴식일',boss:'막 보스',
};
const ROUTE_LABELS={
  development:'육성 루트',steady:'안정 루트',craft:'정비 루트',scout:'분석 루트',gauntlet:'강행군',playoff:'플레이오프',ace:'에이스 사냥',
};
const UTILITY={
  training:{effect:'카드 강화',detail:'핵심 카드 하나를 강화해 다음 경기부터 역할을 선명하게 만듭니다.',risk:'낮음',reward:'덱 강화'},
  locker:{effect:'덱 정리',detail:'약한 카드를 덜 뽑도록 덱을 정리하는 구간입니다.',risk:'낮음',reward:'덱 압축'},
  shop:{effect:'전력 보강',detail:'다음 승부 전에 카드·장비 선택지를 확보하는 구간입니다.',risk:'낮음',reward:'선택지 확장'},
  rest:{effect:'컨디션 회복',detail:'다음 전투에서 타선의 타격 기술 +8. 강행군을 끊고 다음 투수를 안정적으로 공략합니다.',risk:'최저',reward:'다음 전투 타격 +8'},
};
const copy=o=>JSON.parse(JSON.stringify(o));
const mix=x=>{x=(x^61)^(x>>>16);x=(x+Math.imul(x,8))>>>0;x^=x>>>4;x=Math.imul(x,0x27d4eb2d)>>>0;x^=x>>>15;return x>>>0;};
const sample=(seed,salt,list)=>list[mix((seed>>>0)^Math.imul(salt+1,0x9e3779b1))%list.length];

const ARCHETYPES=[
  {key:'outside',label:'바깥쪽 제구형',style:'rookie',threat:'바깥 코스 비중이 높아 좁은 노림을 흔듭니다.',zoneOpen:4,zoneMax:6},
  {key:'sinker',label:'낮은 싱커형',style:'sinker',threat:'낮은 3분할을 오래 압박하고 병살 위험을 만듭니다.',zoneOpen:5,zoneMax:7},
  {key:'high',label:'높은 공 수비형',style:'deep',threat:'높은 공과 깊은 수비로 장타 기대값을 낮춥니다.',zoneOpen:5,zoneMax:8},
  {key:'closer',label:'반대 코스 승부형',style:'closer',threat:'이전 노림 반대편을 찌르며 2스트라이크에 존을 넓힙니다.',zoneOpen:7,zoneMax:9},
];
const ARCHETYPE_BY_KEY=Object.fromEntries(ARCHETYPES.map(x=>[x.key,x]));
/* 막이 오를수록 단순히 숫자만 세지는 게 아니라 상대의 질문 자체가 바뀐다. */
const ACT_ARCHETYPE_KEYS={
  1:['outside','sinker'],
  2:['sinker','high','outside'],
  3:['high','closer','sinker'],
};
const BOSS_ARCHETYPE={1:'sinker',2:'high',3:'closer'};
/* 한 런의 전투 칸은 최대 23개다. 이름 풀은 그보다 넉넉해야 한 런 안에서 겹치지 않는다. */
const NAMES=['윤태성','민재호','강도윤','박현우','이시훈','최준혁','김태겸','한지우','오세민','정우찬',
  '임건호','서재윤','노경환','백승호','류지환','문성주','조현성','신동하','황인우','고태원',
  '남기웅','배정후','심규빈','전우영','권재민','유상혁','장민석','차도훈','표세진','홍기준'];

/* 막마다 무엇이 어려워지는지 한 곳에 적는다. 화면도 이 표를 그대로 읽어 플레이어에게 보여준다.
   hp는 끌어내릴 양, stat은 투수 기본기, zone은 쓰는 코스 수. 코스가 넓어지는 게 읽기를 가장 어렵게 만든다. */
export const ACT_ESCALATION={
  1:{name:'개막',hp:0,stat:0,zone:0,note:'바깥·낮은 공 중심. 읽은 대로 치며 덱의 첫 방향을 정하는 막.'},
  2:{name:'중반',hp:16,stat:4,zone:1,note:'싱커와 높은 공이 섞이고 코스가 하나 더 열린다. 1막에서 고른 카드끼리 연계를 만들 시점.'},
  3:{name:'결승',hp:36,stat:9,zone:2,note:'높은 공·반대 코스 승부가 본격화되고 코스 둘이 더 열린다. 압축과 시그니처 카드가 없으면 한 타석이 비싸다.'},
};
export const actEscalation=act=>ACT_ESCALATION[act]||ACT_ESCALATION[1];

function makeOpponent(seed,act,type,row,lane,route){
  const salt=act*101+row*17+lane*7+(type==='elite'?31:type==='boss'?67:0);
  const pool=(ACT_ARCHETYPE_KEYS[act]||ACT_ARCHETYPE_KEYS[1]).map(k=>ARCHETYPE_BY_KEY[k]);
  const archetype=type==='boss'?ARCHETYPE_BY_KEY[BOSS_ARCHETYPE[act]||'outside']:sample(seed,salt,pool);
  const step=actEscalation(act);
  const base={battle:72,elite:92,boss:120}[type]+step.hp;
  const routeBonus=route==='gauntlet'||route==='ace'?8:route==='playoff'?4:0;
  const maxHp=base+routeBonus;
  const rewardTier=type==='boss'?3:type==='elite'?2:1;
  const reward=rewardTier===1?'막별 기본 3장 드래프트':rewardTier===2?'시그니처 카드 포함 4장 드래프트':act===3?'최종 결승 · 런 완주':'막 돌파 · 시그니처 4장 드래프트';
  return {
    name:sample(seed,salt+13,NAMES),archetype:archetype.label,archetypeKey:archetype.key,style:archetype.style,
    maxHp,statBonus:(type==='battle'?0:type==='elite'?6:10)+step.stat+Math.floor(routeBonus/2),
    zoneOpen:Math.min(9,archetype.zoneOpen+step.zone),zoneMax:Math.min(9,archetype.zoneMax+step.zone),
    threat:archetype.threat,rewardTier,act,actName:step.name,
    /* 화면이 막 난도를 추론하지 않게, 이 막에서 무엇이 얼마나 올랐는지 그대로 실어 보낸다. */
    escalation:{name:step.name,hp:step.hp,stat:step.stat,zone:step.zone,note:step.note},
    risk:rewardTier===3?'최종':rewardTier===2?'높음':routeBonus?'중상':'보통',
    reward,
  };
}

function makeNode(seed,act,spec){
  const base={id:`a${act}-${spec.key}`,act,row:spec.row,lane:spec.lane,type:spec.type,name:LABELS[spec.type],
    route:spec.route||'steady',routeLabel:ROUTE_LABELS[spec.route||'steady'],seed:mix((seed>>>0)^Math.imul(act*131+spec.row*19+spec.lane*7+spec.key.length,0x9e3779b1))};
  if(COMBAT_TYPES.has(spec.type)){
    const opponent=makeOpponent(seed,act,spec.type,spec.row,spec.lane,base.route);
    return {...base,opponent,risk:opponent.risk,reward:opponent.reward,preview:`${opponent.name} · ${opponent.archetype} · HP ${opponent.maxHp}`};
  }
  const utility=UTILITY[spec.type];
  return {...base,utility:{...utility},risk:utility.risk,reward:utility.reward,preview:`${utility.effect} · ${utility.detail}`};
}

const A1=[
  {
    nodes:[
      ['entry',0,1,'battle','steady'],
      ['develop',1,0,'training','development'],['road',1,3,'elite','gauntlet'],
      ['develop-game',2,0,'battle','development'],['road-game',2,3,'battle','gauntlet'],
      ['develop-rest',3,0,'rest','development'],['develop-push',3,1,'elite','gauntlet'],
      ['road-cash',3,2,'shop','craft'],['road-push',3,3,'elite','gauntlet'],
      ['boss',4,1,'boss','playoff'],
    ],
    edges:[
      ['entry','develop'],['entry','road'],['develop','develop-game'],['road','road-game'],
      ['develop-game','develop-rest'],['develop-game','develop-push'],
      ['road-game','road-cash'],['road-game','road-push'],
      ['develop-rest','boss'],['develop-push','boss'],['road-cash','boss'],['road-push','boss'],
    ],
  },
  {
    nodes:[
      ['entry',0,1,'battle','steady'],
      ['craft',1,0,'locker','craft'],['steady',1,1,'training','development'],['risk',1,3,'elite','gauntlet'],
      ['craft-game',2,0,'battle','craft'],['steady-game',2,1,'battle','steady'],['risk-game',2,3,'elite','gauntlet'],
      ['craft-shop',3,0,'shop','craft'],['steady-rest',3,1,'rest','steady'],['risk-shop',3,2,'shop','gauntlet'],['risk-elite',3,3,'elite','gauntlet'],
      ['boss',4,1,'boss','playoff'],
    ],
    edges:[
      ['entry','craft'],['entry','steady'],['entry','risk'],
      ['craft','craft-game'],['steady','steady-game'],['risk','risk-game'],
      ['craft-game','craft-shop'],['steady-game','steady-rest'],
      ['risk-game','risk-shop'],['risk-game','risk-elite'],
      ['craft-shop','boss'],['steady-rest','boss'],['risk-shop','boss'],['risk-elite','boss'],
    ],
  },
];

const A2=[
  {
    nodes:[
      ['entry',0,1,'battle','steady'],
      ['recover',1,0,'rest','steady'],['analyze',1,1,'locker','scout'],['hunt',1,3,'elite','ace'],
      ['recover-game',2,0,'battle','steady'],['analyze-game',2,1,'battle','scout'],['hunt-game',2,3,'elite','ace'],
      ['recover-train',3,0,'training','development'],['analyze-shop',3,1,'shop','scout'],
      ['hunt-cash',3,2,'shop','ace'],['hunt-ace',3,3,'elite','ace'],
      ['boss',4,1,'boss','playoff'],
    ],
    edges:[
      ['entry','recover'],['entry','analyze'],['entry','hunt'],
      ['recover','recover-game'],['analyze','analyze-game'],['hunt','hunt-game'],
      ['recover-game','recover-train'],['analyze-game','analyze-shop'],
      ['hunt-game','hunt-cash'],['hunt-game','hunt-ace'],
      ['recover-train','boss'],['analyze-shop','boss'],['hunt-cash','boss'],['hunt-ace','boss'],
    ],
  },
  {
    nodes:[
      ['entry',0,1,'battle','steady'],
      ['prep',1,0,'locker','craft'],['rival',1,3,'elite','gauntlet'],
      ['prep-game',2,0,'battle','craft'],['rival-game',2,3,'battle','gauntlet'],
      ['prep-train',3,0,'training','development'],['prep-push',3,1,'elite','playoff'],
      ['rival-rest',3,2,'rest','steady'],['rival-ace',3,3,'elite','ace'],
      ['shop',4,1,'shop','scout'],['boss',5,1,'boss','playoff'],
    ],
    edges:[
      ['entry','prep'],['entry','rival'],['prep','prep-game'],['rival','rival-game'],
      ['prep-game','prep-train'],['prep-game','prep-push'],
      ['rival-game','rival-rest'],['rival-game','rival-ace'],
      ['prep-train','shop'],['prep-push','shop'],['rival-rest','shop'],['rival-ace','shop'],['shop','boss'],
    ],
  },
];

const A3=[
  {
    nodes:[
      ['entry',0,1,'battle','playoff'],
      ['series',1,0,'battle','playoff'],['ace-hunt',1,3,'elite','ace'],
      ['series-elite',2,0,'elite','playoff'],['ace-hunt-2',2,3,'elite','ace'],
      ['series-rest',3,0,'rest','steady'],['series-push',3,1,'elite','playoff'],
      ['ace-shop',3,2,'shop','ace'],['ace-final',3,3,'elite','ace'],
      ['boss',4,1,'boss','ace'],
    ],
    edges:[
      ['entry','series'],['entry','ace-hunt'],['series','series-elite'],['ace-hunt','ace-hunt-2'],
      ['series-elite','series-rest'],['series-elite','series-push'],
      ['ace-hunt-2','ace-shop'],['ace-hunt-2','ace-final'],
      ['series-rest','boss'],['series-push','boss'],['ace-shop','boss'],['ace-final','boss'],
    ],
  },
  {
    nodes:[
      ['entry',0,1,'battle','playoff'],
      ['wildcard',1,0,'battle','playoff'],['rival',1,1,'elite','playoff'],['ace',1,3,'elite','ace'],
      ['wildcard-2',2,0,'battle','playoff'],['rival-2',2,1,'elite','playoff'],['ace-2',2,3,'elite','ace'],
      ['wildcard-rest',3,0,'rest','steady'],['rival-shop',3,1,'shop','playoff'],['ace-3',3,3,'elite','ace'],
      ['boss',4,1,'boss','ace'],
    ],
    edges:[
      ['entry','wildcard'],['entry','rival'],['entry','ace'],
      ['wildcard','wildcard-2'],['rival','rival-2'],['ace','ace-2'],
      ['wildcard-2','wildcard-rest'],['rival-2','rival-shop'],['ace-2','ace-3'],
      ['wildcard-rest','boss'],['rival-shop','boss'],['ace-3','boss'],
    ],
  },
];

const TEMPLATES={1:A1,2:A2,3:A3};

function buildAct(seed,act){
  const choices=TEMPLATES[act],template=choices[mix((seed>>>0)^Math.imul(act,0x85ebca6b))%choices.length];
  const nodes=template.nodes.map(([key,row,lane,type,route])=>makeNode(seed,act,{key,row,lane,type,route}));
  const edges=template.edges.map(([from,to])=>({from:`a${act}-${from}`,to:`a${act}-${to}`}));
  return {nodes,edges};
}

/* 이름 풀이 전투 칸보다 짧다. 시드에서 시작점을 정해 돌려 쓰되, 한 바퀴 안에서는 겹치지 않게 한다. */
function nameOpponents(seed,nodes){
  const combat=nodes.filter(n=>COMBAT_TYPES.has(n.type)&&n.opponent);
  const offset=mix((seed>>>0)^0x51ed270b)%NAMES.length;
  combat.forEach((node,index)=>{node.opponent.name=NAMES[(offset+index)%NAMES.length];});
  return nodes;
}

export function createRunMap(seed=0){
  const nodes=[],edges=[];
  for(let act=1;act<=3;act++){
    const built=buildAct(seed,act);nodes.push(...built.nodes);edges.push(...built.edges);
    if(act<3)edges.push({from:`a${act}-boss`,to:`a${act+1}-entry`});
  }
  nameOpponents(seed,nodes);
  for(const node of nodes)if(node.opponent)node.preview=`${node.opponent.name} · ${node.opponent.archetype} · HP ${node.opponent.maxHp}`;
  return {seed:seed>>>0,nodes,edges,currentNodeId:null,completedNodeIds:[],reachableIds:['a1-entry']};
}

export const getRunNode=(map,id)=>map?.nodes?.find(n=>n.id===id)||null;
export const isCombatNode=n=>!!n&&COMBAT_TYPES.has(n.type);

export function selectRunNode(map,nodeId){
  if(!map||!map.reachableIds?.includes(nodeId))return {map,error:'unreachable'};
  const n=getRunNode(map,nodeId);if(!n||map.completedNodeIds.includes(nodeId))return {map,error:'invalid'};
  const next=copy(map);next.currentNodeId=nodeId;next.reachableIds=[];return {map:next,error:null,node:getRunNode(next,nodeId)};
}

export function completeRunNode(map,nodeId=map?.currentNodeId){
  if(!map||!nodeId||map.currentNodeId!==nodeId||map.completedNodeIds.includes(nodeId))return map;
  const next=copy(map);next.completedNodeIds=[...next.completedNodeIds,nodeId];
  next.reachableIds=next.edges.filter(e=>e.from===nodeId).map(e=>e.to);return next;
}

function pathExists(map,start,target,act){
  const q=[start],seen=new Set();
  while(q.length){const id=q.shift();if(id===target)return true;if(seen.has(id))continue;seen.add(id);
    for(const e of map.edges)if(e.from===id){const n=getRunNode(map,e.to);if(n&&n.act===act)q.push(e.to);}}
  return false;
}

export function actHasBossPath(map,act){
  return pathExists(map,`a${act}-entry`,`a${act}-boss`,act);
}

/* 고른 칸이 막다른 길이면 지도에서 갈 곳이 사라진다. 모든 칸이 그 막의 보스까지 닿는지 본다. */
export function everyNodeReachesBoss(map,act){
  const target=`a${act}-boss`;
  return map.nodes.filter(n=>n.act===act&&n.id!==target).every(n=>pathExists(map,n.id,target,act));
}

/* 갈 수 있는 칸은 저장에 적힌 대로가 아니라 진행에서 따라 나와야 한다. */
export function reachableMatchesProgress(map){
  const last=map.completedNodeIds[map.completedNodeIds.length-1];
  const expected=last?map.edges.filter(e=>e.from===last).map(e=>e.to):['a1-entry'];
  const open=map.currentNodeId&&!map.completedNodeIds.includes(map.currentNodeId);
  if(open)return map.reachableIds.length===0;
  return map.reachableIds.length===expected.length&&map.reachableIds.every(id=>expected.includes(id));
}

export function validateRunMap(map){
  if(!map||!Number.isInteger(map.seed)||!Array.isArray(map.nodes)||!Array.isArray(map.edges)
    ||!Array.isArray(map.completedNodeIds)||!Array.isArray(map.reachableIds))return false;
  const ids=map.nodes.map(n=>n?.id),set=new Set(ids);
  if(set.size!==ids.length||map.nodes.some(n=>!n||!TYPES.has(n.type)||!Number.isInteger(n.act)||n.act<1||n.act>3
    ||!Number.isInteger(n.row)||!Number.isFinite(n.lane)||typeof n.route!=='string'||typeof n.preview!=='string'))return false;
  if(map.nodes.some(n=>COMBAT_TYPES.has(n.type)
    ?!n.opponent||!Number.isInteger(n.opponent.maxHp)||n.opponent.maxHp<=0||!['rookie','sinker','deep','closer'].includes(n.opponent.style)
      ||!Number.isInteger(n.opponent.rewardTier)||n.opponent.rewardTier<1||n.opponent.rewardTier>3
    :!n.utility||typeof n.utility.effect!=='string'))return false;
  if(map.edges.some(e=>{
    if(!e||!set.has(e.from)||!set.has(e.to)||e.from===e.to)return true;
    const from=getRunNode(map,e.from),to=getRunNode(map,e.to);
    return from.act===to.act?to.row<=from.row:!(from.type==='boss'&&to.id===`a${from.act+1}-entry`);
  }))return false;
  if(map.currentNodeId!==null&&!set.has(map.currentNodeId))return false;
  if(map.completedNodeIds.some(id=>!set.has(id))||map.reachableIds.some(id=>!set.has(id))
    ||new Set(map.completedNodeIds).size!==map.completedNodeIds.length||new Set(map.reachableIds).size!==map.reachableIds.length)return false;
  if(map.reachableIds.some(id=>map.completedNodeIds.includes(id)))return false;
  for(let act=1;act<=3;act++)if(!actHasBossPath(map,act)||!everyNodeReachesBoss(map,act))return false;
  if(!reachableMatchesProgress(map))return false;
  return true;
}

export const runMapSelector=map=>map?({
  nodes:copy(map.nodes),edges:copy(map.edges),currentNodeId:map.currentNodeId,reachableIds:[...map.reachableIds],
}):null;