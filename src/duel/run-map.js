const TYPES=new Set(['battle','elite','training','locker','shop','rest','boss']);
const UTILITY=['training','locker','shop','rest'];
const LABELS={
  battle:'정규 승부',elite:'강적 승부',training:'타격 훈련',locker:'라커룸',shop:'장비 상점',rest:'휴식일',boss:'막 보스',
};
const copy=o=>JSON.parse(JSON.stringify(o));
const mix=x=>{x=(x^61)^(x>>>16);x=(x+Math.imul(x,8))>>>0;x^=x>>>4;x=Math.imul(x,0x27d4eb2d)>>>0;x^=x>>>15;return x>>>0;};
function shuffledUtilities(seed){
  const a=[...UTILITY],box={x:seed>>>0};
  const next=()=>{box.x=(Math.imul(box.x,1664525)+1013904223)>>>0;return box.x/4294967296;};
  for(let i=a.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
const node=(seed,act,key,row,lane,type)=>({id:`a${act}-${key}`,act,row,lane,type,name:LABELS[type],seed:mix((seed>>>0)^Math.imul(act*17+row*5+lane+1,0x9e3779b1))});

export function createRunMap(seed=0){
  const nodes=[],edges=[],utilities=shuffledUtilities(seed),utilAt=i=>utilities[i%utilities.length];
  for(let act=1;act<=3;act++){
    const base=(act-1)*3;
    const parts=[
      node(seed,act,'entry',0,1,'battle'),
      node(seed,act,'fork-a',1,0,utilAt(base)),
      node(seed,act,'fork-b',1,2,'elite'),
      node(seed,act,'mid',2,1,'battle'),
      node(seed,act,'late-a',3,0,utilAt(base+1)),
      node(seed,act,'late-b',3,2,utilAt(base+2)),
      node(seed,act,'boss',4,1,'boss'),
    ];
    nodes.push(...parts);
    const id=k=>`a${act}-${k}`;
    edges.push(
      {from:id('entry'),to:id('fork-a')},{from:id('entry'),to:id('fork-b')},
      {from:id('fork-a'),to:id('mid')},{from:id('fork-b'),to:id('mid')},
      {from:id('mid'),to:id('late-a')},{from:id('mid'),to:id('late-b')},
      {from:id('late-a'),to:id('boss')},{from:id('late-b'),to:id('boss')},
    );
    if(act<3)edges.push({from:id('boss'),to:`a${act+1}-entry`});
  }
  return {seed:seed>>>0,nodes,edges,currentNodeId:null,completedNodeIds:[],reachableIds:['a1-entry']};
}

export const getRunNode=(map,id)=>map?.nodes?.find(n=>n.id===id)||null;
export const isCombatNode=n=>!!n&&['battle','elite','boss'].includes(n.type);

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

export function validateRunMap(map){
  if(!map||!Number.isInteger(map.seed)||!Array.isArray(map.nodes)||!Array.isArray(map.edges)
    ||!Array.isArray(map.completedNodeIds)||!Array.isArray(map.reachableIds))return false;
  const ids=map.nodes.map(n=>n?.id);
  if(new Set(ids).size!==ids.length||map.nodes.some(n=>!n||!TYPES.has(n.type)||!Number.isInteger(n.act)||n.act<1||n.act>3))return false;
  const set=new Set(ids);
  if(map.edges.some(e=>!e||!set.has(e.from)||!set.has(e.to)||e.from===e.to))return false;
  if(map.currentNodeId!==null&&!set.has(map.currentNodeId))return false;
  if(map.completedNodeIds.some(id=>!set.has(id))||map.reachableIds.some(id=>!set.has(id))
    ||new Set(map.completedNodeIds).size!==map.completedNodeIds.length||new Set(map.reachableIds).size!==map.reachableIds.length)return false;
  if(map.reachableIds.some(id=>map.completedNodeIds.includes(id)))return false;
  for(let act=1;act<=3;act++)if(!actHasBossPath(map,act))return false;
  return true;
}

export const runMapSelector=map=>map?({
  nodes:copy(map.nodes),edges:copy(map.edges),currentNodeId:map.currentNodeId,reachableIds:[...map.reachableIds],
}):null;
