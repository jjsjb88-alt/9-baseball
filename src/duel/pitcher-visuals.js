import redRushAtlas from '../../assets/pitcher-sd-v1/red-rush-pitch-120-atlas.png';
import redRushPortrait from '../../assets/pitcher-mobs-v1/regular-01-red-rush.png';

const rosterAtlases=import.meta.glob('../../assets/pitcher-sd-v2/atlases/*-pitch-120-atlas.png',{eager:true,query:'?url',import:'default'});
const rosterPortraits=import.meta.glob('../../assets/pitcher-mobs-v1/*.png',{eager:true,query:'?url',import:'default'});
const idFrom=(path,suffix)=>path.split('/').pop().replace(suffix,'');

export const pitcherAtlases={
  'regular-01-red-rush':redRushAtlas,
  ...Object.fromEntries(Object.entries(rosterAtlases).map(([path,url])=>[idFrom(path,'-pitch-120-atlas.png'),url])),
};
export const pitcherPortraits={
  'regular-01-red-rush':redRushPortrait,
  ...Object.fromEntries(Object.entries(rosterPortraits).map(([path,url])=>[idFrom(path,'.png'),url])),
};
