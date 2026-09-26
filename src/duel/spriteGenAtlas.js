const finitePositive=value=>Number.isFinite(Number(value))&&Number(value)>0;

function rowContract(manifest,state){
  const animation=manifest?.animation?.rows?.[state];
  const rects=manifest?.frame_layout?.rows?.[state];
  if(!animation||!Array.isArray(rects)||rects.length===0)return null;

  const declared=Number(animation.frames);
  const frameCount=Math.max(
    1,
    Math.min(
      rects.length,
      Number.isInteger(declared)&&declared>0?declared:rects.length,
    ),
  );
  const fps=finitePositive(animation.fps)?Number(animation.fps):12;
  const supplied=Array.isArray(animation.durations_ms)?animation.durations_ms.slice(0,frameCount):[];
  const durations=supplied.length===frameCount&&supplied.every(finitePositive)
    ? supplied.map(Number)
    : Array.from({length:frameCount},()=>1000/fps);
  const totalMs=durations.reduce((sum,value)=>sum+value,0);

  return {
    state,
    rects:rects.slice(0,frameCount),
    frameCount,
    fps,
    loop:animation.loop!==false,
    durations,
    totalMs,
  };
}

export function spriteGenStateContract(manifest,state){
  return rowContract(manifest,state);
}

export function spriteGenFrameAt(manifest,state,elapsedMs){
  const row=rowContract(manifest,state);
  if(!row)return null;

  const raw=Math.max(0,Number(elapsedMs)||0);
  const local=row.loop
    ? raw%row.totalMs
    : Math.min(raw,Math.max(0,row.totalMs-0.0001));

  let cursor=0;
  for(let index=0;index<row.frameCount;index+=1){
    const durationMs=row.durations[index];
    const end=cursor+durationMs;
    if(local<end||index===row.frameCount-1){
      return {
        state,
        index,
        rect:row.rects[index],
        elapsedMs:local,
        frameStartMs:cursor,
        frameDurationMs:durationMs,
        totalMs:row.totalMs,
        loop:row.loop,
      };
    }
    cursor=end;
  }
  return null;
}

export function spriteGenElapsedAtFrame(manifest,state,index){
  const row=rowContract(manifest,state);
  if(!row)return null;
  const safe=Math.max(0,Math.min(row.frameCount-1,Math.trunc(Number(index)||0)));
  let elapsedMs=0;
  for(let i=0;i<safe;i+=1)elapsedMs+=row.durations[i];
  return elapsedMs;
}

export function spriteGenSyncedElapsed(manifest,state,motionMap,motion,elapsedMs){
  const row=rowContract(manifest,state);
  if(!row)return null;

  const contactIndex=Number(motionMap?.markers?.contact);
  const targetImpact=Number(motion?.impactAt);
  const targetDuration=Number(motion?.duration);
  if(!Number.isInteger(contactIndex)||contactIndex<0||
    !finitePositive(targetImpact)||!finitePositive(targetDuration)||targetImpact>=targetDuration){
    return Math.max(0,Number(elapsedMs)||0);
  }

  const nativeImpact=spriteGenElapsedAtFrame(manifest,state,contactIndex);
  if(nativeImpact==null||nativeImpact<=0||nativeImpact>=row.totalMs){
    return Math.max(0,Number(elapsedMs)||0);
  }

  const target=Math.max(0,Math.min(Number(elapsedMs)||0,targetDuration));
  if(target<=targetImpact){
    return nativeImpact*(target/targetImpact);
  }

  const targetPost=Math.max(1,targetDuration-targetImpact);
  const nativePost=row.totalMs-nativeImpact;
  return nativeImpact+nativePost*((target-targetImpact)/targetPost);
}

export function spriteGenSyncedFrameAt(manifest,state,motionMap,motion,elapsedMs){
  const synced=spriteGenSyncedElapsed(manifest,state,motionMap,motion,elapsedMs);
  return spriteGenFrameAt(manifest,state,synced==null?elapsedMs:synced);
}

export function validateSpriteGenManifest(manifest,{state='swing',cellSize=null,minFrames=1}={}){
  const errors=[];
  const row=rowContract(manifest,state);
  const layout=manifest?.frame_layout||{};

  if(manifest?.game_input!=='sprite-sheet-alpha.png'){
    errors.push('game_input must be "sprite-sheet-alpha.png"');
  }
  if(manifest?.degraded_static_fallback!==false){
    errors.push('degraded_static_fallback must be false for animated batter assets');
  }
  if(!row){
    errors.push(`missing animation/frame_layout row for state "${state}"`);
    return {ok:false,errors,row:null};
  }
  if(row.frameCount<minFrames){
    errors.push(`state "${state}" has ${row.frameCount} frames; expected at least ${minFrames}`);
  }

  const animationFrames=Number(manifest?.animation?.rows?.[state]?.frames);
  const layoutFrames=manifest?.frame_layout?.rows?.[state]?.length||0;
  if(!Number.isInteger(animationFrames)||animationFrames<=0){
    errors.push(`animation.frames for "${state}" must be a positive integer`);
  }else if(animationFrames!==layoutFrames){
    errors.push(`animation.frames (${animationFrames}) does not match frame_layout count (${layoutFrames})`);
  }

  const sheetWidth=Number(layout.sheetWidth);
  const sheetHeight=Number(layout.sheetHeight);
  if(!finitePositive(sheetWidth)||!finitePositive(sheetHeight)){
    errors.push('frame_layout.sheetWidth/sheetHeight must be positive numbers');
  }

  if(cellSize!=null){
    const width=Number(layout.cellWidth);
    const height=Number(layout.cellHeight);
    if(width!==cellSize||height!==cellSize){
      errors.push(`expected ${cellSize}x${cellSize} cells, received ${width}x${height}`);
    }
  }

  row.rects.forEach((rect,index)=>{
    const x=Number(rect?.x),y=Number(rect?.y),w=Number(rect?.w),h=Number(rect?.h);
    if(![x,y,w,h].every(Number.isFinite)||w<=0||h<=0){
      errors.push(`invalid frame rect at ${state}[${index}]`);
      return;
    }
    if(finitePositive(sheetWidth)&&finitePositive(sheetHeight)&&(
      x<0||y<0||x+w>sheetWidth||y+h>sheetHeight
    )){
      errors.push(`frame rect out of bounds at ${state}[${index}]`);
    }
  });

  return {ok:errors.length===0,errors,row};
}
