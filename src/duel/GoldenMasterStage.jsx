import React from 'react';

const POWER_GRADES=new Set(['dead-center','extra','homer','grand-slam']);
const DANGER_GRADES=new Set(['near-miss','near-miss-k','chase','chase-k','fooled','strikeout']);

export default function GoldenMasterStage({stage=null,shot=null,rival=false}){
  const grade=shot?.grade||'idle';
  const power=POWER_GRADES.has(grade),danger=DANGER_GRADES.has(grade);
  return <>
    <div className={'gm-depth-back gm-'+(stage||'idle')+(power?' gm-power':'')+(danger?' gm-danger':'')+(rival?' gm-rival':'')} aria-hidden="true">
      <span className="gm-scoreboard-shell"><i/><i/><i/><b>9Z</b></span>
      <span className="gm-light-tower gm-light-left">{Array.from({length:6},(_,i)=><i key={i}/>)}</span>
      <span className="gm-light-tower gm-light-right">{Array.from({length:6},(_,i)=><i key={i}/>)}</span>
      <span className="gm-upper-deck">{Array.from({length:18},(_,i)=><i key={i}/>)}</span>
      <span className="gm-backstop-net"/>
      <span className="gm-haze-band"/>
      <span className="gm-mound-ring"/>
    </div>
    <div className={'gm-depth-mid gm-'+(stage||'idle')+(power?' gm-power':'')+(danger?' gm-danger':'')+(rival?' gm-rival':'')} aria-hidden="true">
      <span className="gm-side-crowd gm-crowd-left"/>
      <span className="gm-side-crowd gm-crowd-right"/>
      <span className="gm-dugout-mouth gm-dugout-left"><i/><i/><i/></span>
      <span className="gm-dugout-mouth gm-dugout-right"><i/><i/><i/></span>
      <span className="gm-mid-haze"/>
      <span className="gm-duel-axis"/>
      <span className="gm-pitch-tunnel"><i/><i/><i/></span>
      <span className="gm-release-ring"><i/><b/></span>
      <span className="gm-foot-plant"><i/><i/><i/><i/></span>
      <span className="gm-bat-arc"><i/><b/></span>
      <span className="gm-actor-light gm-batter-light"/>
      <span className="gm-actor-light gm-pitcher-light"/>
      <span className="gm-contact-halo"><i/><b/></span>
    </div>
    <div className={'gm-depth-front gm-'+(stage||'idle')+(power?' gm-power':'')+(danger?' gm-danger':'')} aria-hidden="true">
      <span className="gm-dugout-rail gm-rail-left"/>
      <span className="gm-dugout-rail gm-rail-right"/>
      <span className="gm-camera-fence gm-fence-left"/>
      <span className="gm-camera-fence gm-fence-right"/>
      <span className="gm-plate-grit">{Array.from({length:10},(_,i)=><i key={i}/>)}</span>
    </div>
  </>;
}
