/* Act 1 difficulty: a naive new-player bot (one swing card on the likeliest live cell, never watches)
   and a stacker (a second swing card on the second likeliest cell) play the first fight of Act 1
   over N seeds. Reports win rate, pitches, ball share and chase whiffs (swings at balls). */
import {createV10Duel,enterV10Node,playV10Action,advanceV10Pitch,advanceV10Batter,setAimZone,publicProbabilities} from '../src/duel/engine.js';
import {CARDS} from '../src/duel/cards.js';

const N=Math.max(1,Number(process.argv[2]||300));
function play(seed,stacker){
  let s=enterV10Node(createV10Duel(seed),'a1-entry');
  let pitches=0,balls=0,chases=0,guard=0;
  while(s.phase!=='reward'&&s.phase!=='lost'&&guard++<400){
    if(s.phase==='pitch'){s=advanceV10Pitch(s);continue;}
    if(s.phase==='between'){s=advanceV10Batter(s);continue;}
    if(s.phase!=='battle')break;
    const p=publicProbabilities(s),live=s.battle.intent.repertoire;
    let best=live[0];for(const z of live)if(p[z]>p[best])best=z;
    const swing=s.battle.hand.filter(id=>{const e=s.deck.find(c=>c.id===id);return e&&CARDS[e.kind]?.type!=='skill'&&e.kind!=='bunt';});
    const card=swing[0]||'basic';
    const second=[...live].filter(z=>z!==best).sort((a,b)=>p[b]-p[a])[0];
    const supports=stacker&&swing[1]&&second!=null?[{id:swing[1],aimZone:second}]:[];
    if(s.battle.pending.zone===9){balls++;chases++;}
    s=setAimZone(s,best);
    s=playV10Action(s,{type:'card',id:card,...(supports.length&&card!=='basic'?{supports}:{})});
    pitches++;
  }
  return {win:s.phase==='reward',pitches,balls,chases,hpLeft:s.pitcher?.hp??0,maxHp:s.pitcher?.maxHp};
}
const out={};
for(const [name,stacker] of [['naive',false],['stacker',true]]){
  let w=0,p=0,b=0,c=0,hp=0;
  for(let i=0;i<N;i++){const r=play(i,stacker);w+=r.win;p+=r.pitches;b+=r.balls;c+=r.chases;if(!r.win)hp+=r.hpLeft/r.maxHp;}
  out[name]={winRate:+(w/N).toFixed(3),pitchesPerFight:+(p/N).toFixed(1),ballShare:+(b/p).toFixed(3),chaseWhiffsPerFight:+(c/N).toFixed(2),lossHpLeft:w<N?+(hp/(N-w)).toFixed(2):0};
}
console.log(JSON.stringify({seeds:N,firstFight:createV10Duel(0).runMap.nodes.find(n=>n.id==='a1-entry').opponent.maxHp,...out},null,2));
