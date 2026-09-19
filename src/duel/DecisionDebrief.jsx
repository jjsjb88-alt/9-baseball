import React from 'react';
import {CARDS,ZONES} from './cards.js';
import './decision-debrief.css';

const pct=n=>Math.round((Number.isFinite(n)?n:1)*100);
const zoneName=z=>z===9?'존 밖':(ZONES[z]||'알 수 없음');

function planText(combat){
  if(!combat)return '';
  const count=combat.cardCount||1,kind=combat.choice||'basic';
  if(count>1)return count+'장 STACK · CONNECT '+(combat.connectCount||0)+'/'+Math.max(0,count-1)+' · HP '+pct(combat.damageRate)+'%';
  if(kind==='place')return '1존 정타 · 정확 적중 ×1.5';
  if(kind==='strike')return '세로 3존 · 안정 커버';
  if(kind==='basic')return '카드 보존 · 1존 승부';
  const name=CARDS[kind]?.name||'스윙';
  return name+' · '+(CARDS[kind]?.shape==='point'?'1존 집중':'카드 1장');
}

function lessonFor(combat,revealed){
  if(!combat||!revealed)return {tone:'neutral',title:'이번 공 복기',text:'선택과 실제 공을 비교해 다음 공의 범위를 조정하세요.'};
  const count=combat.cardCount||1,links=Math.max(0,count-1),connect=combat.connectCount||0;
  const actual=revealed.zone;
  const main=new Set(revealed.primaryCoverage||[]);
  const supportOnly=!!revealed.assistOnly||revealed.label==='겹친 카드 단타';
  const exactPrecision=(combat.precisionBonus||0)>0;

  if(actual===9&&combat.choice!=='take'){
    return {tone:'danger',title:'유인구를 쫓았습니다.',text:'실제 공은 존 밖이었습니다. 같은 읽기라면 지켜보기가 카드와 스트라이크를 아낍니다.'};
  }
  if(exactPrecision){
    return {tone:'success',title:'정타 노림 성공.',text:'1존 리스크가 정타 보너스 +'+combat.precisionBonus+' HP로 돌아왔습니다. 확신 있는 코스에서는 좁게 치는 이유가 생깁니다.'};
  }
  if(supportOnly){
    return {tone:'success',title:'STACK이 빈틈을 막았습니다.',text:'메인 커버 밖 공을 지원 카드가 단타로 바꿨습니다. 여러 장의 가치는 이런 실패 방지에 있습니다.'};
  }
  if(count>1&&links&&connect===links){
    return {tone:'success',title:'경로까지 연결했습니다.',text:'커버를 넓히면서 CONNECT '+connect+'/'+links+'로 HP 효율을 '+pct(combat.damageRate)+'%까지 회복했습니다.'};
  }
  if(count>1&&connect<links){
    return {tone:'warn',title:'커버는 샀지만 경로가 끊겼습니다.',text:'BREAK '+(links-connect)+'개 때문에 HP 효율이 '+pct(combat.damageRate)+'%에 머뭅니다. 같은 카드라도 순서를 바꾸면 더 강해질 수 있습니다.'};
  }
  if(combat.choice==='strike'&&main.has(actual)){
    return {tone:'success',title:'밀어치기의 값이 나왔습니다.',text:'정타 보너스 대신 세로 3존 커버로 실제 공을 잡았습니다. 확신이 낮을 때 안전을 사는 선택입니다.'};
  }
  if(combat.choice==='place'&&!main.has(actual)){
    return {tone:'warn',title:'정타 노림이 비었습니다.',text:'실제 공이 메인 1존 밖이었습니다. 확신이 낮다면 밀어치기나 STACK으로 커버를 넓히세요.'};
  }
  if(main.has(actual)){
    return {tone:'success',title:'읽은 범위 안에 들어왔습니다.',text:'선택한 커버가 실제 공을 잡았습니다. 다음 공도 투수 경향과 카드 범위를 함께 비교하세요.'};
  }
  return {tone:'warn',title:'실제 공이 커버 밖이었습니다.',text:'다음에는 해당 코스를 덮는 카드, STACK, 또는 지켜보기를 비교하세요.'};
}

export default function DecisionDebrief({combat,revealed}){
  if(!combat||!revealed)return null;
  const lesson=lessonFor(combat,revealed);
  const main=new Set(revealed.primaryCoverage||[]);
  const supportOnly=!!revealed.assistOnly||revealed.label==='겹친 카드 단타';
  const actualStatus=revealed.zone===9?'OUTSIDE':supportOnly?'SUPPORT SAVE':main.has(revealed.zone)?'MAIN COVER':'MISSED COVER';

  return <aside className={'decision-debrief tone-'+lesson.tone} aria-label="이번 선택 복기">
    <div className="debrief-step plan">
      <span>PLAN</span>
      <strong>{planText(combat)}</strong>
      <small>{combat.aimLabel||'노림 코스 선택'}</small>
    </div>
    <i aria-hidden="true">→</i>
    <div className="debrief-step actual">
      <span>ACTUAL</span>
      <strong>{zoneName(revealed.zone)}</strong>
      <small>{actualStatus}</small>
    </div>
    <i aria-hidden="true">→</i>
    <div className="debrief-step lesson">
      <span>LESSON</span>
      <strong>{lesson.title}</strong>
      <small>{lesson.text}</small>
    </div>
  </aside>;
}

export {lessonFor,planText};
