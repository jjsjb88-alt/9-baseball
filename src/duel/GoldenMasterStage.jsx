import React from 'react';
import {cinemaDirector} from './presentation.js';

const POWER_GRADES=new Set(['dead-center','extra','homer','grand-slam']);
const DANGER_GRADES=new Set(['near-miss','near-miss-k','chase','chase-k','fooled','strikeout']);

const ACT_CLASS=match=>' gm-act-'+Math.min(3,Math.max(1,(Number(match)||0)+1));

export default function GoldenMasterStage({stage=null,shot=null,rival=false,match=0}){
  const grade=shot?.grade||'idle',director=cinemaDirector(shot).key;
  const power=POWER_GRADES.has(grade),danger=DANGER_GRADES.has(grade);
  const state=' gm-'+(stage||'idle')+' gm-director-'+director+(power?' gm-power':'')+(danger?' gm-danger':'')+(rival?' gm-rival':'')+ACT_CLASS(match);
  return <>
    <div className={'gm-depth-back'+state} aria-hidden="true">
      <span className="gm-skyline">
        {Array.from({length:11},(_,i)=><i key={i} style={{'--gm-h':`${28+i*2.4}%`}}/>)}
      </span>
      <span className="gm-roof-truss gm-truss-left">{Array.from({length:7},(_,i)=><i key={i}/>)}</span>
      <span className="gm-roof-truss gm-truss-right">{Array.from({length:7},(_,i)=><i key={i}/>)}</span>
      <span className="gm-scoreboard-shell"><i/><i/><i/><b>9Z</b></span>
      <span className="gm-light-tower gm-light-left">{Array.from({length:6},(_,i)=><i key={i}/>)}</span>
      <span className="gm-light-tower gm-light-right">{Array.from({length:6},(_,i)=><i key={i}/>)}</span>
      <span className="gm-upper-deck">{Array.from({length:18},(_,i)=><i key={i}/>)}</span>
      <span className="gm-concourse-windows">{Array.from({length:14},(_,i)=><i key={i}/>)}</span>
      <span className="gm-backstop-net"/>
      <span className="gm-haze-band"/>
      <span className="gm-light-shaft gm-shaft-left"/>
      <span className="gm-light-shaft gm-shaft-right"/>
      <span className="gm-mound-ring"/>
    </div>
    <div className={'gm-depth-mid'+state} aria-hidden="true">
      <span className="gm-side-crowd gm-crowd-left"/>
      <span className="gm-side-crowd gm-crowd-right"/>
      <span className="gm-dugout-mouth gm-dugout-left"><i/><i/><i/></span>
      <span className="gm-dugout-mouth gm-dugout-right"><i/><i/><i/></span>
      <span className="gm-bullpen gm-bullpen-left"><i/><i/></span>
      <span className="gm-bullpen gm-bullpen-right"><i/><i/></span>
      <span className="gm-mid-haze"/>
      <span className="gm-atmosphere">
        {Array.from({length:16},(_,i)=><i key={i} style={{'--gm-p':i}}/>)}
      </span>
      <span className="gm-duel-axis"/>
      <span className="gm-pitch-tunnel"><i/><i/><i/></span>
      <span className="gm-release-ring"><i/><b/></span>
      <span className="gm-foot-plant"><i/><i/><i/><i/></span>
      <span className="gm-bat-arc"><i/><b/></span>
      <span className="gm-actor-light gm-batter-light"/>
      <span className="gm-actor-light gm-pitcher-light"/>
      <span className="gm-contact-halo"><i/><b/></span>
    </div>
    <div className={'gm-depth-front'+state} aria-hidden="true">
      <span className="gm-dugout-rail gm-rail-left"/>
      <span className="gm-dugout-rail gm-rail-right"/>
      <span className="gm-camera-fence gm-fence-left"/>
      <span className="gm-camera-fence gm-fence-right"/>
      <span className="gm-camera-well gm-camera-well-left"><i/><i/></span>
      <span className="gm-camera-well gm-camera-well-right"><i/><i/></span>
      <span className="gm-grass-fringe"/>
      <span className="gm-plate-grit">{Array.from({length:10},(_,i)=><i key={i}/>)}</span>
    </div>
  </>;
}
