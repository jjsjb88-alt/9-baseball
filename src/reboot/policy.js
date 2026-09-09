import {newRun,startMatch,commitPitch,nextPitch,chooseReward,rewardOptions} from './engine.js';

// Deliberately limited to information actually visible to the player.
export function publicView(s) {
  return {match:s.match,balls:s.balls,strikes:s.strikes,focus:s.focus,hand:[...s.hand],mastery:[...s.mastery],
    odds:[...s.pitch.publicOdds],history:s.history.map(h=>({...h})),aims:[...s.aims]};
}
export function policyAction(view,policy='reader') {
  let zone=view.odds.slice(0,9).indexOf(Math.max(...view.odds.slice(0,9))), confident=false;
  if(policy==='reader'){
    if(view.match===0&&view.strikes===2){zone=7;confident=true;}
    if(view.match===1&&view.history.at(-1)?.outcome==='ball'){zone=2;confident=true;}
    if(view.match===2&&view.strikes===2){zone=3;confident=true;}
  }
  if(policy==='take')return {take:true};
  const preferred=policy==='power'||confident?['power','drive','contact','cover','cut']:['contact','cover','drive','cut','power'];
  const card=preferred.find(c=>view.hand.includes(c));
  return {zone,cardIndex:card?view.hand.indexOf(card):null,wager:confident?Math.min(2,view.focus):0};
}
export function simulateRun(seed,policy='reader') {
  let s=newRun(seed),steps=0;
  while(s.phase!=='finished'&&steps++<4000){
    if(s.phase==='brief')s=startMatch(s);
    else if(s.phase==='pitch')s=commitPitch(s,policyAction(publicView(s),policy));
    else if(s.phase==='result')s=nextPitch(s);
    else if(s.phase==='bench')s=chooseReward(s,rewardOptions(s)[0].id);
  }
  if(s.phase!=='finished')throw new Error('Policy run did not terminate');
  return s;
}
