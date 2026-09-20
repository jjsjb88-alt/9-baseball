import {readFile,writeFile} from 'node:fs/promises';

const file=process.argv[2];
if(!file)throw new Error('usage: node scripts/gm12-freeze-lab.mjs <App.jsx>');

const source=await readFile(file,'utf8');
const from=`function CinemaLab({sound,onBack}){
  const [chosen,setChosen]=useState(CINEMA_CASES[1]),[stage,setStage]=useState(null),`;
const to=`function CinemaLab({sound,onBack}){
  const qaParams=typeof window==='undefined'?null:new URLSearchParams(window.location.search);
  const qaCase=qaParams?.get('qaCase'),qaStage=qaParams?.get('qaStage');
  const qaChosen=CINEMA_CASES.find(item=>item.key===qaCase)||CINEMA_CASES[1];
  const qaFrozenStage=['windup','impact','slowmo','release','settle'].includes(qaStage)?qaStage:null;
  const [chosen,setChosen]=useState(qaChosen),[stage,setStage]=useState(qaFrozenStage),`;

if(!source.includes(from))throw new Error(`CinemaLab marker not found in ${file}`);
await writeFile(file,source.replace(from,to));
console.log(`GM12 frozen-stage QA patch applied · ${file}`);
