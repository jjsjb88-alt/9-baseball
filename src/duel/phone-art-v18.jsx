import React from 'react';
/* Phone asset queue A01–A09 (assets/production-art/phone-assets-v18) + the v17 Red Rush knockout layers,
   composed as separate layers the way their README asks: ending (A07 batter, A08 plate), home-run cut-in (A01 batter, A02 plate, A03 ball + trail — the code
   draws no second ball there), knockout (v17 stagger -> A09 mid-collapse -> v17 kneel, one canvas). */
import hrBatter from '../../assets/production-art/phone-assets-v18/A01-homerun-batter-9.png';
import hrPlate from '../../assets/production-art/phone-assets-v18/A02-homerun-stadium-plate.png';
import hrTrail from '../../assets/production-art/phone-assets-v18/A03-homerun-ball-trail.png';
import endBatter from '../../assets/production-art/phone-assets-v18/A07-ending-batter-9.png';
import endPlate from '../../assets/production-art/phone-assets-v18/A08-ending-stadium-plate.png';
import koMid from '../../assets/production-art/phone-assets-v18/A09-red-rush-mid-collapse.png';
import koPlate from '../../assets/production-art/red-rush-knockout-layers-v17/knockout-stadium-plate.png';
import koStagger from '../../assets/production-art/red-rush-knockout-layers-v17/red-rush-knockout-stagger.png';
import koKneel from '../../assets/production-art/red-rush-knockout-layers-v17/red-rush-knockout-actor.png';
import './phone-art-v18.css';

export const PHONE_ART_V18={hrBatter,hrPlate,hrTrail,endBatter,endPlate,koMid,koPlate,koStagger,koKneel};
/* the knockout keyposes are the female Red Rush; other pitchers keep the plate and their own cutout */
export const KO_POSE_ART_ID='regular-01-red-rush';

export function EndingHero(){
  return <div className="end-hero" aria-hidden="true">
    <i className="eh-plate" style={{backgroundImage:`url(${endPlate})`}}/>
    <img className="eh-batter" alt="" src={endBatter}/>
  </div>;
}

/* inside the home-run verdict card: plate, the swing, then the ball and its trail leaving the bat */
export function HomeRunCut(){
  return <span className="hr-cut" aria-hidden="true">
    <i className="hr-plate" style={{backgroundImage:`url(${hrPlate})`}}/>
    <img className="hr-trail" alt="" src={hrTrail}/>
    {/* SPRITEBREW-HOOK(홈런): <SpritePlayer character="batter" animation="homerun" fallback={this img}/> once frames land */}
    <img className="hr-batter" alt="" src={hrBatter}/>
  </span>;
}

/* inside the knockout verdict card: Red Rush staggers, folds (A09), kneels; others sink in their cutout */
export function KnockoutCut({artId=null,figure=null}){
  const poses=artId===KO_POSE_ART_ID;
  return <span className={'ko-cut'+(poses?' poses':'')} aria-hidden="true">
    <i className="ko-plate" style={{backgroundImage:`url(${koPlate})`}}/>
    {poses?<>
      <img className="ko-pose ko-stagger" alt="" src={koStagger}/>
      <img className="ko-pose ko-mid" alt="" src={koMid}/>
      <img className="ko-pose ko-kneel" alt="" src={koKneel}/>
    </>:figure&&<img className="ko-figure" alt="" src={figure}/>}
  </span>;
}
