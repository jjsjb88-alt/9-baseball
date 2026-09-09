let context;
export function playCue(kind, muted) {
  if(muted)return;
  try {
    context ||= new (window.AudioContext || window.webkitAudioContext)();
    if(context.state==='suspended')context.resume().catch(()=>{});
    const notes=kind==='homerun'?[220,330,440,660]:kind==='hit'?[160,360]:kind==='pitch'?[110]:[180];
    notes.forEach((frequency,i)=>{
      const osc=context.createOscillator(),gain=context.createGain(),at=context.currentTime+i*.10;
      osc.type=kind==='pitch'?'sine':'triangle';osc.frequency.setValueAtTime(frequency,at);
      osc.frequency.exponentialRampToValueAtTime(frequency*.65,at+.13);
      gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.065,at+.007);
      gain.gain.exponentialRampToValueAtTime(.001,at+.20);
      osc.connect(gain);gain.connect(context.destination);osc.start(at);osc.stop(at+.22);
    });
  }catch { /* Audio may be unavailable; gameplay never depends on it. */ }
}
