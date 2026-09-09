import {simulateRun} from '../src/reboot/policy.js';
const count=Number(process.argv[2]||200);
if(!Number.isInteger(count)||count<1||count>5000)throw new Error('Use 1–5000 runs');
const reports=['public','reader','power','take'].map(policy=>{
  const runs=Array.from({length:count},(_,i)=>simulateRun(71237+i*104729,policy));
  const avg=key=>runs.reduce((a,r)=>a+r.stats[key],0)/count;
  const wins=runs.filter(r=>r.won);
  return {policy,runs:count,winRate:(wins.length/count*100).toFixed(1)+'%',avgPitches:avg('pitches').toFixed(1),
    avgRuns:avg('runs').toFixed(1),avgRead:avg('reads').toFixed(1),
    completedRunPitches:wins.length?(wins.reduce((a,r)=>a+r.stats.pitches,0)/wins.length).toFixed(1):'n/a'};
});
console.table(reports);
console.log('Synthetic policies use visible information only. These are not human playtime or fun results.');
