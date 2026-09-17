import fs from 'node:fs';
const path='src/duel/App.jsx';
let text=fs.readFileSync(path,'utf8');
const replace=(from,to,label)=>{
  if(text.includes(to))return;
  if(!text.includes(from))throw new Error('missing copy marker: '+label);
  text=text.replace(from,to);
};
replace(
  "{eyebrow:'WELCOME 4 / 6',target:'swing',title:'두 번째 행동 · 스윙하기',text:'실제 공이 카드의 타격 범위에 들어오면 안타 확정입니다. 타자·투수 스탯으로 안타 종류만 달라집니다. 헛스윙과 파울이면 같은 타석이 이어집니다.',tip:'넓게 버틸지, 좁게 장타를 노릴지 고릅니다.'}",
  "{eyebrow:'WELCOME 4 / 6',target:'swing',title:'두 번째 행동 · 카드를 존에 놓고 스윙',text:'스윙을 열면 손패 카드를 9존에 직접 놓습니다. 첫 카드가 타격 효과를, 추가 카드는 빈 코스를 커버합니다. 최대 4장까지 배치할 수 있습니다.',tip:'카드 탭 → 존 탭, 또는 카드 자체를 존으로 드래그하세요.'}",
  'tour swing');
replace("{isV10?'카드 최대 '+V10_SWING_STACK_MAX+'장 겹치기':swingHand.length+'장 + 기본 스윙'}","{isV10?'카드를 존에 최대 '+V10_SWING_STACK_MAX+'장 배치':swingHand.length+'장 + 기본 스윙'}",'hub swing hint');
replace('③ 9존에서 코스 선택 → 커버·확률 확인 → 카드 사용','③ 스윙 카드를 9존에 놓기 → 커버 확인 → 스윙','help steps');
replace('MAIN RUN의 스윙 카드는 최대 4장까지 겹칠 수 있습니다. 한 장은 HP 피해 100%, 2장 80%, 3장 65%, 4장 50%이며 겹친 카드는 모두 소비됩니다.','MAIN RUN은 공격 카드를 9존에 직접 놓습니다. 첫 카드는 타격 효과를 내고 추가 카드는 커버가 됩니다. 한 장은 HP 피해 100%, 2장 80%, 3장 65%, 4장 50%이며 배치한 카드는 모두 소비됩니다.','help paragraph');
replace("activeStack.length?(1+activeStack.length)+'장 겹쳐 스윙 · HP '+Math.round((choice?.damageRate??1)*100)+'%'","activeStack.length?(1+activeStack.length)+'장 배치 스윙 · HP '+Math.round((choice?.damageRate??1)*100)+'%'",'execute copy');
replace('<b>카드 한 장을 선택하세요.</b><span>카드와 노릴 존을 고르면 커버·안타·파울 확률을 보여줍니다.</span>','<b>카드를 9존에 놓으세요.</b><span>카드를 놓은 위치가 노림존이 됩니다. 추가 카드를 더 놓으면 커버가 넓어집니다.</span>','empty preview');
fs.writeFileSync(path,text);
console.log('zone board copy aligned');
