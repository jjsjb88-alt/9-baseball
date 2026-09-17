import './act23-deckbuilding.css';

const SIGNATURES={
  '존 봉쇄':{act:1,label:'ACT I SIGNATURE',copy:'넓은 커버를 한 장으로 완성하는 1막 강적 보상'},
  '라인드라이브':{act:2,label:'ACT II SIGNATURE',copy:'안정성과 장타를 동시에 묶는 2막 강적 보상'},
  '끝장 승부':{act:3,label:'ACT III SIGNATURE',copy:'완성된 읽기와 압축 덱에 보상하는 3막 강적 보상'},
};

const normalize=s=>(s||'').replace(/\s+/g,' ').trim();
function signatureForCard(card){
  const name=normalize(card?.querySelector('strong')?.textContent).replace(/\+$/,'');
  return SIGNATURES[name]||null;
}
function markSignatureCards(root=document){
  root.querySelectorAll?.('.duel-card').forEach(card=>{
    const sig=signatureForCard(card);
    if(!sig){card.removeAttribute('data-signature-act');card.removeAttribute('data-signature-label');return;}
    if(card.dataset.signatureAct!==String(sig.act))card.dataset.signatureAct=String(sig.act);
    if(card.dataset.signatureLabel!==sig.label)card.dataset.signatureLabel=sig.label;
  });
}
function rewardCallout(root=document){
  const screen=root.querySelector?.('.reward-screen');
  if(!screen)return;
  const cards=[...screen.querySelectorAll('.reward-cards .duel-card')];
  const sigCard=cards.find(signatureForCard),sig=signatureForCard(sigCard);
  let callout=screen.querySelector('.signature-draft-callout');
  if(!sig){callout?.remove();screen.removeAttribute('data-signature-draft');return;}
  screen.dataset.signatureDraft=String(sig.act);
  if(!callout){
    callout=document.createElement('div');callout.className='signature-draft-callout';callout.setAttribute('role','note');
    screen.querySelector('.reward-cards')?.before(callout);
  }
  if(callout.dataset.signatureAct!==String(sig.act)){
    callout.dataset.signatureAct=String(sig.act);
    callout.innerHTML=`<span>${sig.label}</span><strong>강적을 잡아야만 열리는 한 장.</strong><small>${sig.copy}</small>`;
  }
}
function refresh(root=document){markSignatureCards(root);rewardCallout(root);}

export function installAct23DeckbuildingUi(root=document){
  if(root.__act23DeckbuildingInstalled)return ()=>{};
  root.__act23DeckbuildingInstalled=true;
  let queued=false;
  const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh(root);});};
  const observer=new MutationObserver(schedule);
  observer.observe(root.documentElement||root,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-label']});
  schedule();
  return ()=>{observer.disconnect();delete root.__act23DeckbuildingInstalled;};
}

if(typeof document!=='undefined')installAct23DeckbuildingUi(document);
