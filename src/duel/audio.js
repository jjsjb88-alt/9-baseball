// Synthesized judgement cues. No network assets: every important baseball decision gets its own sound signature.
let context;
const CUES={
  hit:{type:'triangle',gain:.075,notes:[[180,0,.055,.7],[95,.04,.13,.55],[620,.095,.1,.8]]},
  extra:{type:'triangle',gain:.08,notes:[[170,0,.06,.72],[260,.045,.08,.9],[520,.105,.12,.75],[780,.18,.11,.82]]},
  homer:{type:'square',gain:.065,notes:[[92,0,.12,.72],[184,.045,.13,.8],[368,.1,.15,.84],[736,.2,.2,.9]]},
  whiff:{type:'sawtooth',gain:.045,notes:[[420,0,.07,.45],[220,.045,.12,.38],[105,.105,.15,.5]]},
  foul:{type:'square',gain:.035,notes:[[760,0,.035,.85],[1040,.045,.05,.9],[520,.09,.08,.6]]},
  ball:{type:'sine',gain:.05,notes:[[300,0,.08,.92],[420,.075,.1,.95]]},
  walk:{type:'sine',gain:.055,notes:[[280,0,.07,.94],[380,.07,.08,.96],[520,.14,.11,.98]]},
  called:{type:'triangle',gain:.05,notes:[[210,0,.09,.66],[165,.11,.12,.72]]},
  strikeout:{type:'sawtooth',gain:.05,notes:[[260,0,.07,.62],[170,.07,.09,.55],[88,.16,.18,.5]]},
  out:{type:'triangle',gain:.055,notes:[[150,0,.08,.58],[112,.08,.13,.62]]},
  sacrifice:{type:'sine',gain:.055,notes:[[240,0,.07,.9],[330,.075,.09,.94],[260,.15,.1,.8]]},
  read:{type:'sine',gain:.045,notes:[[520,0,.05,1.04],[680,.055,.06,1.03],[880,.12,.09,1.02]]},
  lock:{type:'triangle',gain:.04,notes:[[360,0,.055,.9],[360,.07,.07,1.02]]},
  signal:{type:'square',gain:.035,notes:[[320,0,.05,.9],[480,.06,.07,.95],[640,.13,.08,1]]},
  draw:{type:'sine',gain:.035,notes:[[500,0,.04,1.04],[600,.045,.045,1.04],[700,.095,.05,1.04]]},
  pitch:{type:'sine',gain:.05,notes:[[310,0,.09,.62],[110,.14,.1,.58]]},
  skill:{type:'sine',gain:.045,notes:[[440,0,.06,.9],[660,.06,.1,.92]]},
};
export function cue(kind){
  try{
    const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;
    context??=new Audio();context.resume().catch(()=>{});
    const cue=CUES[kind]||CUES.skill;
    for(const [frequency,delay,duration,endRatio] of cue.notes){
      const osc=context.createOscillator(),gain=context.createGain(),t=context.currentTime+delay;
      osc.type=cue.type;osc.frequency.setValueAtTime(frequency,t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(35,frequency*endRatio),t+duration);
      gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(cue.gain,t+.006);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
      osc.connect(gain);gain.connect(context.destination);osc.start(t);osc.stop(t+duration+.025);osc.onended=()=>{osc.disconnect();gain.disconnect()};
    }
  }catch{/* Audio failure must never interrupt combat. */}
}
