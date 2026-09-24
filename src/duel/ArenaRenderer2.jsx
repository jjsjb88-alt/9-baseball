
import React,{useEffect,useRef} from 'react';
import {PERF_DPR_CAP} from './useAdaptivePerformance.js';
import {cinemaDirector} from './presentation.js';

const VERT=[
'#version 300 es',
'precision highp float;',
'const vec2 POS[3]=vec2[3](vec2(-1.0,-1.0),vec2(3.0,-1.0),vec2(-1.0,3.0));',
'void main(){gl_Position=vec4(POS[gl_VertexID],0.0,1.0);}'
].join('\n');

const FRAG=[
'#version 300 es',
'precision highp float;',
'precision highp int;',
'out vec4 outColor;',
'uniform vec2 u_resolution;',
'uniform float u_time;',
'uniform float u_phase;',
'uniform float u_match;',
'uniform float u_rival;',
'uniform float u_success;',
'uniform float u_danger;',
'uniform float u_power;',
'uniform int u_director;',
'uniform int u_stage;',
'uniform int u_ballMode;',
'uniform int u_trace;',
'uniform int u_coverMask;',
'uniform int u_aim;',
'uniform int u_actual;',
'float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
'float lineMask(vec2 p,vec2 a,vec2 b,float w){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);return 1.0-smoothstep(w,w+.004,length(pa-ba*h));}',
'vec3 mix3(vec3 a,vec3 b,float t){return a+(b-a)*clamp(t,0.0,1.0);}',
'vec3 skyPal(float m){if(m<.5)return vec3(.055,.12,.14);if(m<1.5)return vec3(.045,.105,.095);if(m<2.5)return vec3(.025,.075,.13);return vec3(.018,.035,.075);}',
'vec3 fieldPal(float m){if(m<.5)return vec3(.11,.25,.16);if(m<1.5)return vec3(.085,.22,.13);if(m<2.5)return vec3(.055,.17,.13);return vec3(.035,.13,.12);}',
'vec3 dirtPal(float m){if(m<.5)return vec3(.34,.22,.12);if(m<1.5)return vec3(.29,.20,.12);if(m<2.5)return vec3(.24,.17,.12);return vec3(.20,.13,.105);}',
'vec2 camera(vec2 uv){float zoom=1.,pan=0.,tilt=0.;if(u_stage==1){float handoff=smoothstep(.18,.92,u_phase);zoom=mix(1.035,1.075,handoff);pan=mix(.038,-.020,handoff);tilt=mix(.006,-.004,handoff);}if(u_stage==2){if(u_director==2){zoom=1.160;pan=-.042;tilt=-.014;}else if(u_director==1){zoom=1.145;pan=-.034;tilt=-.012;}else if(u_director==3){zoom=1.095;pan=.006;tilt=-.004;}else if(u_director==4){zoom=1.082;pan=.018;tilt=.002;}else if(u_director==5){zoom=1.105;pan=-.018;tilt=-.007;}else{zoom=1.118;pan=u_danger>.5?.004:-.030;tilt=-.010;}}if(u_stage==3){if(u_director==2){zoom=1.152;pan=mix(-.040,-.052,u_phase);tilt=-.016;}else if(u_director==1){zoom=1.132;pan=-.036;tilt=-.012;}else if(u_director==3){zoom=1.112;pan=mix(.008,.042,u_phase);tilt=mix(-.004,.008,u_phase);}else if(u_director==4){zoom=1.102;pan=mix(.020,.006,u_phase);tilt=.004;}else{zoom=1.120;pan=u_danger>.5?.010:-.030;tilt=-.010;}}if(u_stage==4){if(u_director==2){zoom=mix(1.110,1.025,u_phase);pan=mix(-.046,-.105,u_phase);tilt=mix(-.016,-.030,u_phase);}else if(u_director==1){zoom=mix(1.095,1.050,u_phase);pan=mix(-.030,-.050,u_phase);tilt=mix(-.010,-.014,u_phase);}else if(u_director==3){zoom=mix(1.100,1.045,u_phase);pan=mix(.012,.064,u_phase);tilt=mix(-.004,.012,u_phase);}else if(u_director==4){zoom=mix(1.092,1.064,u_phase);pan=mix(.018,-.004,u_phase);tilt=mix(.004,-.002,u_phase);}else if(u_director==5){zoom=mix(1.086,1.040,u_phase);pan=mix(-.018,.006,u_phase);tilt=mix(-.006,.004,u_phase);}else{zoom=1.115-.072*u_phase;pan=mix(u_danger>.5?.010:-.034,u_power>.7?-.048:.008,u_phase);tilt=mix(-.010,u_power>.7?-.020:.006,u_phase);}}if(u_stage==5){if(u_director==2){zoom=mix(1.020,.985,u_phase);pan=mix(-.052,0.,u_phase);tilt=mix(-.016,0.,u_phase);}else if(u_director==4){zoom=mix(1.055,1.040,u_phase);pan=.012*(1.-u_phase);tilt=.003;}else{zoom=1.040-.030*u_phase;pan=.006*(1.-u_phase);}}vec2 p=uv-.5;p/=zoom;p+=vec2(pan,tilt);return p+.5;}',
'float lightAt(vec2 uv,vec2 pos,float r){float d=length((uv-pos)*vec2(1.,.75));return exp(-d*d/(r*r));}',
'float rectMask(vec2 p,vec2 c,vec2 h){vec2 d=abs(p-c)-h;return 1.-step(0.,max(d.x,d.y));}',
'vec2 ballPath(int mode,float t){vec2 plate=vec2(.39,.58),pit=vec2(.72,.47);if(mode==1)return mix(pit,plate,smoothstep(0.,1.,t));if(mode==2)return mix(plate,vec2(.92,.30),1.-pow(1.-t,2.2));if(mode==3){vec2 p=mix(plate,vec2(.94,.79),t);p.y-=sin(t*3.14159)*.035;return p;}if(mode==4){vec2 p=mix(plate,vec2(.74,.55),t);p.y-=sin(t*3.14159)*.34;return p;}if(mode==5){vec2 p=mix(plate,vec2(.88,-.08),1.-pow(1.-t,1.7));p.y-=sin(t*3.14159)*.08;return p;}if(mode==6)return mix(plate,vec2(.08,.77),t);return plate;}',
'float ballRadius(int mode,float t){if(mode==1)return mix(.004,.012,t);if(mode==5)return mix(.012,.003,t);return mix(.011,.004,t);}',
'void tracePlane(inout vec3 col,vec2 uv){if(u_trace==0)return;float yy=(uv.y-.56)/.34;if(yy<0.||yy>1.)return;float left=mix(.355,.205,yy),right=mix(.435,.595,yy),xx=(uv.x-left)/(right-left);if(xx<0.||xx>1.)return;int cx=min(2,int(floor(xx*3.))),cy=min(2,int(floor(yy*3.))),idx=cy*3+cx;vec2 cell=fract(vec2(xx,yy)*3.);float edge=min(1.,step(cell.x,.055)+step(1.-cell.x,.055)+step(cell.y,.055)+step(1.-cell.y,.055));bool cov=(u_coverMask&(1<<idx))!=0;bool act=u_actual==idx;bool aim=u_aim==idx;vec3 g=cov?vec3(.68,.54,.20):vec3(.17,.38,.36);if(aim)g=mix3(g,vec3(.95,.82,.42),.65);if(act&&cov)g=vec3(.24,.85,.48);else if(act)g=vec3(.96,.30,.23);float a=(cov?.13:.055)+(act?.36:0.)+(aim?.12:0.);col=mix3(col,g,a);col+=g*edge*(cov?.11:.045);}',
'void main(){',
' vec2 raw=gl_FragCoord.xy/u_resolution.xy;raw.y=1.-raw.y;vec2 q=floor(raw*vec2(384.,216.))/vec2(384.,216.);vec2 uv=camera(q);',
' vec3 sky=skyPal(u_match),field=fieldPal(u_match),dirt=dirtPal(u_match);if(u_rival>.5){sky*=vec3(1.05,.78,.72);field*=vec3(.92,.76,.73);dirt*=vec3(1.2,.78,.65);}vec3 col=sky;',
' float horizon=.34,haze=smoothstep(.13,.40,uv.y)*(1.-smoothstep(.40,.56,uv.y));col=mix3(col,vec3(.18,.23,.21),haze*.22);',
' for(int tier=0;tier<3;tier++){float fy=float(tier),top=.20+fy*.075,bot=top+.075,band=step(top,uv.y)*step(uv.y,bot);vec2 cell=floor(vec2(uv.x*118.,uv.y*250.+fy*17.));float h=hash21(cell);vec3 stand=vec3(.045,.075,.078)+h*vec3(.055,.052,.035);stand+=step(.982,h)*(u_stage>=4?1.:.38)*vec3(.8,.68,.38);col=mix3(col,stand,band*.92);col+=vec3(.15,.19,.17)*lineMask(uv,vec2(0.,bot),vec2(1.,bot),.002)*.6;}',
' float concourse=rectMask(uv,vec2(.5,.337),vec2(.49,.013));col=mix3(col,vec3(.025,.058,.061),concourse*.92);',
' float board=rectMask(uv,vec2(.735,.235),vec2(.092,.052));col=mix3(col,vec3(.018,.052,.057),board*.96);float boardInset=rectMask(uv,vec2(.735,.235),vec2(.078,.038));col=mix3(col,vec3(.11,.16,.13),boardInset*.42);',
' float poleL=rectMask(uv,vec2(.105,.205),vec2(.003,.12)),poleR=rectMask(uv,vec2(.895,.205),vec2(.003,.12));col=mix3(col,vec3(.11,.17,.16),min(1.,poleL+poleR));',
' float bankL=rectMask(uv,vec2(.105,.095),vec2(.055,.022)),bankR=rectMask(uv,vec2(.895,.095),vec2(.055,.022));vec2 lampCell=floor(uv*vec2(120.,180.));float lamp=step(.52,hash21(lampCell));col+=vec3(.78,.72,.50)*lamp*(bankL+bankR)*(.12+.09*u_match+(u_stage>=2?.08:.0));',
' float ground=step(horizon,uv.y),gy=clamp((uv.y-horizon)/(1.-horizon),0.,1.),halfW=mix(.055,.72,pow(gy,.83)),inside=step(abs(uv.x-.5),halfW);vec3 grass=field*(.88+.12*step(.5,fract((uv.x+gy*.19)*22.)));col=mix3(col,grass,ground*inside*.98);col=mix3(col,dirt*.45,ground*(1.-inside)*.7);',
' vec2 ip=vec2((uv.x-.5)/(.12+.38*gy),(uv.y-.70)/.24);float infield=1.-smoothstep(.68,.74,length(ip));col=mix3(col,dirt,infield*.88);float lane=step(abs(uv.x-.5),mix(.012,.095,gy))*step(.49,uv.y);col=mix3(col,dirt*1.08,lane*.72);',
' float fl=lineMask(uv,vec2(.365,.72),vec2(.05,.36),.0025)+lineMask(uv,vec2(.435,.72),vec2(.95,.36),.0025);col+=vec3(.72,.68,.47)*min(fl,1.)*.48;col+=vec3(.58,.53,.36)*lineMask(uv,vec2(.40,.72),vec2(.50,.39),.0014)*.18;',
' float mound=1.-smoothstep(.024,.029,length((uv-vec2(.50,.49))*vec2(1.,1.65)));col=mix3(col,dirt*1.15,mound*.8);float plate=lineMask(uv,vec2(.385,.72),vec2(.415,.72),.004)+lineMask(uv,vec2(.385,.72),vec2(.40,.738),.004)+lineMask(uv,vec2(.415,.72),vec2(.40,.738),.004);col+=vec3(.91,.88,.72)*min(plate,1.)*.75;',
' float L=lightAt(uv,vec2(.12,.02),.23)+lightAt(uv,vec2(.88,.02),.23);float beam=max(0.,1.-abs((uv.x-.12)-uv.y*.19)*8.)+max(0.,1.-abs((.88-uv.x)-uv.y*.19)*8.);float intensity=.11+.07*u_match+.08*u_rival;col+=vec3(.83,.76,.54)*L*intensity+vec3(.54,.67,.66)*beam*.025;float stadiumReaction=(u_director==2&&u_stage==4)?smoothstep(.08,.72,u_phase):(u_director==2&&u_stage==5?(1.-u_phase):0.);col+=vec3(.34,.27,.12)*(L+beam*.45)*stadiumReaction*.22;float releasePulse=u_stage==1?smoothstep(.42,.82,u_phase)*(1.-smoothstep(.86,1.,u_phase)):0.;float releaseLight=lightAt(uv,vec2(.72,.47),.105);col+=vec3(.42,.82,.82)*releaseLight*releasePulse*.34;float pitcherClaim=(u_director==4&&(u_stage==4||u_stage==5))?lightAt(uv,vec2(.70,.46),.16):0.;col+=vec3(.12,.30,.31)*pitcherClaim*(u_stage==4?.24:.13);float tunnel=lineMask(uv,vec2(.70,.48),vec2(.40,.60),.006);col+=vec3(.52,.78,.72)*tunnel*releasePulse*.12;',
' vec2 contact=vec2(.39,.58);float cd=length((uv-contact)*vec2(1.,1.25));float impactGain=u_director==2?1.18:u_director==1?1.04:u_director==5?.66:u_director==3?.28:u_director==4?.20:1.;if(u_stage==2)col+=mix(vec3(.95,.58,.25),vec3(.55,.95,.68),u_success)*exp(-cd*cd/.004)*(.45+.55*u_power)*impactGain;if(u_stage==3){float slowDim=u_director==2?.66:u_director==3?.78:u_director==4?.82:.72;col*=slowDim;col+=mix(vec3(.52,.16,.14),vec3(.18,.52,.46),u_success)*exp(-cd*cd/.018)*.34*impactGain;}if(u_stage==4&&u_director==2)col+=vec3(.52,.31,.12)*exp(-cd*cd/.028)*(1.-u_phase)*.32;',
' tracePlane(col,uv);',
' if(u_ballMode>0&&(u_stage==1||u_stage==3||u_stage==4)){float bp=u_stage==3?.52:u_phase;vec2 ball=ballPath(u_ballMode,bp);float br=ballRadius(u_ballMode,bp),d=length(uv-ball)-br,core=1.-smoothstep(0.,.003,d),glow=exp(-max(d,0.)*110.);col+=vec3(1.,.90,.58)*glow*.32;col=mix3(col,vec3(.99,.96,.80),core*.96);float seam=lineMask(uv,ball+vec2(-br*.45,-br*.28),ball+vec2(br*.38,br*.31),br*.12);col=mix3(col,vec3(.73,.22,.18),seam*core*.8);float ht=(u_ballMode==5||u_ballMode==4||u_ballMode==2)?sin(bp*3.14159):.15*sin(bp*3.14159);vec2 sh=vec2(ball.x,mix(ball.y,.78,.35)+ht*.18);float sd=length((uv-sh)*vec2(1.,3.));col*=1.-(1.-smoothstep(.018,.036,sd))*.20*(1.-ht*.65);}',
' vec2 dustCell=floor(vec2(q.x*90.,(q.y+u_time*.008)*65.));col+=vec3(.76,.66,.43)*step(.986,hash21(dustCell))*step(.32,q.y)*.18;',
' if(u_stage==2)col+=vec3(1.,.88,.62)*(1.-u_phase)*(.16+.20*u_power);float vign=1.-smoothstep(.38,.82,length((q-.5)*vec2(.92,1.15)));col*=mix(.66,1.,vign);if(u_danger>.5)col=mix3(col,col*vec3(1.07,.82,.82),.13);col=pow(max(col,vec3(0.)),vec3(.92));outColor=vec4(col,1.);',
'}'
].join('\n');

function shader(gl,type,src){
  const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const msg=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(msg||'shader compile failed');}
  return s;
}
function makeProgram(gl){
  const p=gl.createProgram(),vs=shader(gl,gl.VERTEX_SHADER,VERT),fs=shader(gl,gl.FRAGMENT_SHADER,FRAG);
  gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const msg=gl.getProgramInfoLog(p);gl.deleteProgram(p);throw new Error(msg||'program link failed');}
  return p;
}
function durationFor(stage,shot){
  const m=shot?.motion;if(!m)return 600;
  if(stage==='windup')return Math.max(80,m.impactAt);
  if(stage==='impact')return Math.max(45,m.freeze||55);
  if(stage==='slowmo')return Math.max(60,m.slowmo||120);
  if(stage==='release')return Math.max(100,m.settleAt-(m.releaseAt||m.impactAt+(m.freeze||0)+(m.slowmo||0)));
  if(stage==='settle')return Math.max(90,m.duration-m.settleAt);
  return 600;
}
const STAGE={windup:1,impact:2,slowmo:3,release:4,settle:5};
function flags(shot){
  const grade=shot?.grade||'',success=['dead-center','solid','jammed','lucky','extra','homer','grand-slam'].includes(grade)?1:0,danger=['near-miss','near-miss-k','chase','chase-k','fooled','strikeout'].includes(grade)?1:0;
  const power=grade==='grand-slam'?1:grade==='homer'?.92:grade==='extra'?.74:grade==='dead-center'?.62:grade==='solid'?.42:success?.26:0;
  let ballMode=0;if(['dead-center','solid','extra'].includes(grade))ballMode=2;else if(grade==='jammed')ballMode=3;else if(grade==='lucky')ballMode=4;else if(['homer','grand-slam'].includes(grade))ballMode=5;else if(danger)ballMode=6;
  return {success,danger,power,ballMode};
}
const coverMask=zones=>(zones||[]).reduce((m,z)=>z>=0&&z<9?m|(1<<z):m,0);

export default function ArenaRenderer2({stage=null,shot=null,match=0,rival=false,revealed=null,token=0,label='Pixel Cinema Renderer 2.0',onStatus=null,quality='high'}){
  const ref=useRef(null);
  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;
    let gl;try{gl=canvas.getContext?.('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:false});}catch{onStatus?.('fallback');return;}
    if(!gl){onStatus?.('fallback');return;}
    let p;try{p=makeProgram(gl);}catch(err){canvas.dataset.rendererError=String(err?.message||err);onStatus?.('error');return;}
    canvas.dataset.renderer='webgl2';onStatus?.('webgl2');
    const uniform=name=>gl.getUniformLocation(p,name),U={resolution:uniform('u_resolution'),time:uniform('u_time'),phase:uniform('u_phase'),match:uniform('u_match'),rival:uniform('u_rival'),success:uniform('u_success'),danger:uniform('u_danger'),power:uniform('u_power'),director:uniform('u_director'),stage:uniform('u_stage'),ballMode:uniform('u_ballMode'),trace:uniform('u_trace'),coverMask:uniform('u_coverMask'),aim:uniform('u_aim'),actual:uniform('u_actual')};
    const code=STAGE[stage]||0,start=performance.now(),duration=durationFor(stage,shot),f=flags(shot),director=cinemaDirector(shot);
    const tactical=!!revealed&&['dead-center','solid','jammed','lucky','extra','homer','grand-slam','near-miss','near-miss-k','chase','chase-k','fooled','strikeout'].includes(shot?.grade||'')&&[2,3,4].includes(code);
    let raf=0,alive=true,ro,lastPaint=0;
    const frameBudget=quality==='high'?0:quality==='balanced'?28:40;
    const resize=()=>{const rect=canvas.getBoundingClientRect?.()||{width:640,height:360},cap=PERF_DPR_CAP[quality]||PERF_DPR_CAP.high,dpr=Math.min(cap,globalThis.devicePixelRatio||1),w=Math.max(320,Math.round((rect.width||640)*dpr)),h=Math.max(180,Math.round((rect.height||360)*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}canvas.dataset.quality=quality;canvas.dataset.dpr=String(dpr);};
    resize();if(globalThis.ResizeObserver){ro=new ResizeObserver(resize);ro.observe(canvas);}
    const onWindowResize=()=>resize();
    globalThis.addEventListener?.('resize',onWindowResize,{passive:true});
    const draw=now=>{
      if(!alive)return;
      if(frameBudget&&now-lastPaint<frameBudget){raf=requestAnimationFrame(draw);return;}
      lastPaint=now;
      const phase=Math.min(1,(now-start)/duration);gl.useProgram(p);
      gl.uniform2f(U.resolution,canvas.width,canvas.height);gl.uniform1f(U.time,now/1000);gl.uniform1f(U.phase,phase);gl.uniform1f(U.match,match);gl.uniform1f(U.rival,rival?1:0);gl.uniform1f(U.success,f.success);gl.uniform1f(U.danger,f.danger);gl.uniform1f(U.power,f.power);gl.uniform1i(U.director,director.code);gl.uniform1i(U.stage,code);gl.uniform1i(U.ballMode,stage==='windup'&&shot?.grade?1:(stage==='release'||stage==='slowmo')?f.ballMode:0);gl.uniform1i(U.trace,tactical?1:0);gl.uniform1i(U.coverMask,coverMask(revealed?.coverage));gl.uniform1i(U.aim,revealed?.aimZone??-1);gl.uniform1i(U.actual,revealed?.zone??-1);
      gl.drawArrays(gl.TRIANGLES,0,3);raf=requestAnimationFrame(draw);
    };
    raf=requestAnimationFrame(draw);
    return ()=>{alive=false;cancelAnimationFrame(raf);ro?.disconnect();globalThis.removeEventListener?.('resize',onWindowResize);gl.deleteProgram(p);};
  },[stage,shot?.grade,shot?.kind,match,rival,revealed?.zone,revealed?.aimZone,JSON.stringify(revealed?.coverage||[]),token,quality]);
  return <canvas ref={ref} className="arena-renderer2" aria-label={label} aria-hidden="true"/>;
}
