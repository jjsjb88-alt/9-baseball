export function haptic(pattern){
  try{
    if(!pattern||!globalThis.navigator?.vibrate)return false;
    return !!globalThis.navigator.vibrate(pattern);
  }catch{return false;}
}
