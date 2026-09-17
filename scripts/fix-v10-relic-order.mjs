import fs from 'node:fs';
const path='src/duel/engine.js';
let text=fs.readFileSync(path,'utf8');
const from='    return [...relics,...cards];';
const to='    return [...cards,...relics];';
if(!text.includes(from))throw new Error('relic shop order marker missing');
text=text.replace(from,to);
fs.writeFileSync(path,text);
console.log('shop order preserved: cards first, relics second');
