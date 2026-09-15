// Synthesized judgement cues. No network assets: impact, air, crowd-like swell and UI tones are layered in Web Audio.
let context,master;
const CUES={
  deadCenter:{type:'triangle',gain:.078,noise:.072,noiseDur:.06,crack:.085,echo:.10,notes:[[188,0,.05,.72,-.18],[96,.035,.12,.54,.02],[720,.09,.13,.84,.2]]},
  hit:{type:'triangle',gain:.074,noise:.055,noiseDur:.055,crack:.07,echo:.06,notes:[[176,0,.055,.7,-.15],[92,.038,.13,.55,.05],[620,.095,.10,.8,.18]]},
  jammed:{type:'triangle',gain:.052,noise:.085,noiseDur:.09,crack:.035,echo:.04,notes:[[132,0,.055,.62,-.12],[84,.05,.11,.58,.08],[390,.14,.09,.78,.18]]},
  lucky:{type:'sine',gain:.048,noise:.04,noiseDur:.07,crack:.028,echo:.08,notes:[[220,0,.055,.9,-.16],[330,.11,.08,.96,0],[520,.24,.16,1.02,.2]]},

  extra:{type:'triangle',gain:.078,noise:.07,noiseDur:.075,crack:.088,echo:.14,notes:[[162,0,.06,.72,-.18],[248,.045,.08,.9,.1],[505,.105,.12,.75,.24],[760,.18,.12,.82,-.05]]},
  homer:{type:'square',gain:.06,noise:.095,noiseDur:.11,swell:.12,crack:.105,echo:.20,notes:[[88,0,.13,.7,-.2],[176,.04,.14,.8,.15],[352,.10,.16,.84,-.1],[704,.20,.22,.9,.2],[1056,.34,.28,.94,0]]},
  grandSlam:{type:'square',gain:.064,noise:.12,noiseDur:.14,swell:.18,crack:.12,echo:.27,notes:[[72,0,.15,.68,-.2],[144,.045,.16,.78,.15],[288,.11,.19,.82,-.1],[576,.22,.26,.88,.2],[864,.42,.32,.94,-.15],[1152,.62,.34,.96,.15]]},
  nearMiss:{type:'sawtooth',gain:.034,noise:.03,noiseDur:.13,notes:[[520,0,.08,.7,.24],[310,.11,.16,.48,0],[156,.31,.22,.56,-.18]]},
  chase:{type:'sawtooth',gain:.039,noise:.045,noiseDur:.1,notes:[[380,0,.075,.44,.18],[165,.07,.15,.34,-.18]]},
  fooled:{type:'sawtooth',gain:.043,noise:.04,noiseDur:.09,notes:[[460,0,.075,.38,.2],[205,.05,.14,.34,-.12],[92,.14,.17,.44,0]]},
  whiff:{type:'sawtooth',gain:.042,noise:.034,noiseDur:.09,notes:[[440,0,.08,.42,.18],[230,.045,.13,.36,-.12],[108,.11,.16,.48,0]]},
  foul:{type:'square',gain:.034,noise:.06,noiseDur:.04,crack:.045,echo:.03,notes:[[820,0,.032,.86,.2],[1120,.042,.05,.9,-.15],[540,.09,.08,.6,.08]]},
  battleFoul:{type:'square',gain:.038,noise:.065,noiseDur:.05,crack:.052,echo:.04,notes:[[860,0,.032,.86,.22],[1180,.045,.05,.9,-.18],[590,.10,.08,.64,.08],[760,.19,.08,.92,0]]},
  ball:{type:'sine',gain:.045,noise:.012,noiseDur:.035,notes:[[300,0,.08,.92,-.08],[420,.075,.10,.95,.08]]},
  walk:{type:'sine',gain:.052,noise:.018,noiseDur:.04,notes:[[280,0,.07,.94,-.1],[380,.07,.08,.96,0],[520,.14,.11,.98,.12]]},
  walkRbi:{type:'sine',gain:.056,noise:.022,noiseDur:.045,notes:[[260,0,.07,.94,-.12],[360,.07,.08,.96,0],[500,.14,.11,.98,.12],[650,.24,.12,1.01,.18]]},
  called:{type:'triangle',gain:.045,noise:.018,noiseDur:.05,notes:[[210,0,.09,.66,0],[165,.11,.12,.72,-.08]]},
  strikeout:{type:'sawtooth',gain:.047,noise:.05,noiseDur:.08,notes:[[260,0,.07,.62,.15],[170,.07,.09,.55,-.1],[88,.16,.18,.5,0]]},
  out:{type:'triangle',gain:.05,noise:.038,noiseDur:.06,notes:[[150,0,.08,.58,-.1],[112,.08,.13,.62,.08]]},
  sacrifice:{type:'sine',gain:.05,noise:.025,noiseDur:.04,notes:[[240,0,.07,.9,-.1],[330,.075,.09,.94,.08],[260,.15,.1,.8,0]]},
  read:{type:'sine',gain:.042,noise:.008,noiseDur:.03,notes:[[520,0,.05,1.04,-.25],[680,.055,.06,1.03,0],[880,.12,.09,1.02,.25]]},
  lock:{type:'triangle',gain:.038,noise:.012,noiseDur:.03,notes:[[360,0,.055,.9,-.08],[360,.07,.07,1.02,.08]]},
  expand:{type:'sine',gain:.04,noise:.018,noiseDur:.05,notes:[[330,0,.05,.92,-.22],[440,.045,.07,1.02,0],[660,.11,.09,1.05,.22]]},
  signal:{type:'square',gain:.032,noise:.014,noiseDur:.035,notes:[[320,0,.05,.9,-.2],[480,.06,.07,.95,0],[640,.13,.08,1,.2]]},
  reset:{type:'sine',gain:.038,noise:.008,noiseDur:.03,notes:[[520,0,.05,.82,.12],[390,.055,.08,.92,0],[300,.13,.11,1.02,-.1]]},
  draw:{type:'sine',gain:.032,noise:.006,noiseDur:.025,notes:[[500,0,.04,1.04,-.18],[600,.045,.045,1.04,0],[700,.095,.05,1.04,.18]]},
  pitch:{type:'sine',gain:.045,noise:.025,noiseDur:.07,notes:[[310,0,.09,.62,.16],[110,.14,.1,.58,-.12]]},
  skill:{type:'sine',gain:.04,noise:.008,noiseDur:.025,notes:[[440,0,.06,.9,-.08],[660,.06,.1,.92,.08]]},
};
function audio(){
  const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return null;
  context??=new Audio();
  if(!master){
    const comp=context.createDynamicsCompressor();
    comp.threshold.value=-18;comp.knee.value=14;comp.ratio.value=5;comp.attack.value=.003;comp.release.value=.12;
    const gain=context.createGain();gain.gain.value=.82;comp.connect(gain);gain.connect(context.destination);master=comp;
  }
  context.resume().catch(()=>{});return context;
}
function panNode(ctx,pan){
  if(!ctx.createStereoPanner)return null;const p=ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan||0));return p;
}
function noiseBurst(ctx,at,duration,gainValue,pan=0,lowpass=5200){
  if(!gainValue||!duration)return;
  const frames=Math.max(1,Math.floor(ctx.sampleRate*duration)),buffer=ctx.createBuffer(1,frames,ctx.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<frames;i++)data[i]=(Math.random()*2-1)*(1-i/frames);
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),panner=panNode(ctx,pan);
  src.buffer=buffer;filter.type='lowpass';filter.frequency.value=lowpass;
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(gainValue,at+.004);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  src.connect(filter);filter.connect(gain);if(panner){gain.connect(panner);panner.connect(master)}else gain.connect(master);
  src.start(at);src.stop(at+duration+.01);
}
function batCrack(ctx,at,gainValue,pan=-.08){
  if(!gainValue)return;
  const osc=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter(),panner=panNode(ctx,pan);
  osc.type='square';osc.frequency.setValueAtTime(1680,at);osc.frequency.exponentialRampToValueAtTime(740,at+.026);
  filter.type='highpass';filter.frequency.value=520;
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(gainValue,at+.0025);gain.gain.exponentialRampToValueAtTime(.0001,at+.032);
  osc.connect(filter);filter.connect(gain);if(panner){gain.connect(panner);panner.connect(master)}else gain.connect(master);
  osc.start(at);osc.stop(at+.038);
  noiseBurst(ctx,at,.018,gainValue*.72,pan,7600);
}
function echoSend(ctx,node,amount,delayTime=.105){
  if(!amount)return;
  const delay=ctx.createDelay(.35),wet=ctx.createGain();
  delay.delayTime.value=delayTime;wet.gain.value=amount;
  node.connect(delay);delay.connect(wet);wet.connect(master);
  globalThis.setTimeout?.(()=>{try{delay.disconnect();wet.disconnect()}catch{}},650);
}
function crowdSwell(ctx,at,gainValue){
  const duration=.62,frames=Math.floor(ctx.sampleRate*duration),buffer=ctx.createBuffer(1,frames,ctx.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<frames;i++)data[i]=(Math.random()*2-1)*(.35+.65*Math.sin(Math.PI*i/frames));
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  src.buffer=buffer;filter.type='bandpass';filter.frequency.value=620;filter.Q.value=.45;
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(gainValue,at+.16);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  src.connect(filter);filter.connect(gain);gain.connect(master);src.start(at);src.stop(at+duration+.02);
}
export function cue(kind){
  try{
    const ctx=audio();if(!ctx)return;
    const c=CUES[kind]||CUES.skill,base=ctx.currentTime+.008;
    noiseBurst(ctx,base,c.noiseDur,c.noise,['whiff','nearMiss','chase','fooled'].includes(kind)?.22:['hit','deadCenter','extra','homer','grandSlam'].includes(kind)?-.08:0,['homer','grandSlam'].includes(kind)?3500:5200);
    if(c.crack)batCrack(ctx,base,c.crack);
    if(c.swell)crowdSwell(ctx,base+.16,c.swell);
    for(const [frequency,delay,duration,endRatio,pan] of c.notes){
      const osc=ctx.createOscillator(),gain=ctx.createGain(),panner=panNode(ctx,pan),t=base+delay;
      osc.type=c.type;osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(Math.max(35,frequency*endRatio),t+duration);
      gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(c.gain,t+.006);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
      osc.connect(gain);const output=panner||gain;if(panner){gain.connect(panner);panner.connect(master)}else gain.connect(master);
      if(c.echo)echoSend(ctx,output,c.echo,['homer','grandSlam'].includes(kind)?.13:.095);
      osc.start(t);osc.stop(t+duration+.025);osc.onended=()=>{osc.disconnect();gain.disconnect();panner?.disconnect()};
    }
  }catch{/* Audio failure must never interrupt combat. */}
}
