// Small synthesized cues, no network assets. Only enabled by a user gesture.
let context;
export function cue(kind){
  try{
    const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;
    context??=new Audio();context.resume().catch(()=>{});
    const notes=kind==='hit'?[[170,0,.06],[85,.045,.13],[660,.1,.09]]:kind==='pitch'?[[310,0,.09],[110,.14,.1]]:[[440,0,.06],[660,.06,.1]];
    for(const [frequency,delay,duration] of notes){const osc=context.createOscillator(),gain=context.createGain(),t=context.currentTime+delay;
      osc.type=kind==='hit'?'triangle':'sine';osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(frequency*.55,t+duration);
      gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.07,t+.007);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
      osc.connect(gain);gain.connect(context.destination);osc.start(t);osc.stop(t+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect()};
    }
  }catch{/* Audio failure must never interrupt combat. */}
}
