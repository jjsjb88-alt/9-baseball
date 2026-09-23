// V12 D1 Golden Master — scene parts shared by the portrait / landscape / desktop layouts.
// All geometry is in art-grid pixels; text is placed at 2× (CSS px). Decision-only, not runtime.
/* global PK, window */
(function(){
const K=PK,{px,rect,glyphs,glyphW,text,disc,line}=K;
const C={ink:[20,12,14],gold:[255,210,122],goldHi:[255,241,196],goldLo:[201,138,44],goldInk:[42,23,6],
  teal:[95,214,196],tealHi:[201,255,245],tealLo:[31,127,117],tealInk:[6,37,33],cream:[246,238,219],ember:[255,150,70],
  parch:[251,243,222],parch2:[231,218,187],parch3:[205,185,143],parchInk:[74,50,28],seam:[200,57,58],
  led:[255,138,76],ledHi:[255,196,130],board:[12,23,20],boardEdge:[40,66,57],dim:[167,154,134]};
const P={C};
const shapeCells={point:[4],column:[1,4,7],row:[3,4,5],cross:[1,3,4,5,7],all:[0,1,2,3,4,5,6,7,8]};

P.setup=async()=>{
  K.init(document.getElementById('art'),document.getElementById('txt'));await K.fontsReady();
  const S=await (await fetch('gm/gm-state.json')).json();
  const [stadium,batter,pitcher]=await Promise.all([K.load('../../../assets/duel/stadium.png'),K.load('gm/batter-ready.png'),K.load('gm/pitcher-windup.png')]);
  P.S=S;P.img={stadium,batter,pitcher};P.rnd=K.rng(12012026);P.stackOf=Object.fromEntries(S.steps.map(s=>[s.id,s]));
  return S;
};

// 1. SPACE: crop of the DUGOUT stadium re-sampled to the grid, then light and shade
P.stadium=({crop,x=0,y=0,w,h,palette=48})=>{K.blit(K.kmeans(K.resample(K.pixels(P.img.stadium,...crop),w,h,'mode'),palette),x,y)};
P.shade=(x,y,w,h,bands,c=[24,11,9],max=.97)=>{const bh=Math.ceil(h/bands);for(let k=0;k<bands;k++)K.wash(x,y+k*bh,w,bh,c,Math.min(max,(k+1)/(bands-.5)))};
P.shafts=list=>{for(const [pts,a] of list)K.poly(pts,[255,234,190],a)};
P.dust=(n,fn)=>{for(let i=0;i<n;i++){const [x,y]=fn(P.rnd(),P.rnd(),i);px(x,y,[255,244,214],.35+P.rnd()*.4)}};
P.flashes=list=>{for(const [x,y] of list){px(x,y,[255,255,255]);for(const [a,b] of [[-1,0],[1,0],[0,-1],[0,1]])px(x+a,y+b,[255,255,255],.5)}};
P.edges=(y,h,w)=>{for(let k=0;k<3;k++){K.wash(k*4,y,4,h,[6,4,10],.28-k*.09);K.wash(w-4-k*4,y,4,h,[6,4,10],.28-k*.09)}};
P.planks=(x,y,w,h)=>{const r=P.rnd;
  for(let yy=y;yy<y+h;yy++){const row=Math.floor((yy-y)/7),seam=(yy-y)%7===0;rect(x,yy,w,1,seam?[13,8,6]:row%2?[38,25,18]:[33,22,16])}
  for(let i=0;i<Math.round(w*h/170);i++){const gx=x+Math.floor(r()*(w-5)),gy=y+1+Math.floor(r()*(h-1));if((gy-y)%7===0)continue;rect(gx,gy,2+Math.floor(r()*5),1,r()<.5?[48,33,24]:[24,15,11])}
  for(let gx=x;gx<x+w;gx+=41)for(let gy=y+1;gy<y+h;gy+=7)px(gx+((gy*7)%13),gy+3,[70,52,38]);
  K.wash(x,y,w,h,[10,6,5],.35)};

// 2. OPPONENT on the scoreboard
P.board=(B,{posts=26}={})=>{const S=P.S;
  if(posts){for(const x of [B.x+6,B.x+B.w-9]){rect(x,B.y+B.h,3,posts,[18,24,24]);rect(x,B.y+B.h,1,posts,[46,60,58]);rect(x+2,B.y+B.h,1,posts,[8,10,12])}rect(B.x+4,B.y+B.h,B.w-8,2,[14,18,18])}
  rect(B.x-1,B.y-1,B.w+2,B.h+2,C.ink);rect(B.x,B.y,B.w,B.h,C.board);rect(B.x,B.y,B.w,1,C.boardEdge);
  for(let j=2;j<B.h-2;j+=2)K.wash(B.x+2,B.y+j,B.w-4,1,[255,255,255],.03);
  const seg=Math.floor((B.w-10)/2),on=Math.round(seg*S.pitcher.hp/S.pitcher.maxHp);
  for(let i=0;i<seg;i++)rect(B.x+5+i*2,B.y+11,1,3,i<on?(i%5===4?C.ledHi:C.led):[45,22,16]);
  K.wash(B.x+4,B.y+10,seg*2+1,5,C.led,.12);
  let bx=B.x+B.w-49;const cnt=[['B',3,S.count.balls],['S',2,S.count.strikes],['O',2,S.count.outs]];
  for(const [,n,o] of cnt){for(let i=0;i<n;i++){rect(bx+5+i*4,B.y+20,3,3,i<o?C.gold:[52,70,63]);if(i>=o)rect(bx+5+i*4,B.y+20,3,1,[70,92,84])}bx+=5+n*4+2}
  text(S.pitcher.name,B.x*2+8,B.y*2+5,{size:12,weight:900,color:[255,233,184]});
  text('바깥쪽 제구형',(B.x+B.w)*2-6,B.y*2+6,{size:10,weight:700,color:[143,217,198],align:'right'});
  let lx=(B.x+B.w-49)*2;for(const [l,n] of cnt){text(l,lx,B.y*2+38,{size:10,weight:900,color:[143,165,157]});lx+=(5+n*4+2)*2}
  text(S.pitcher.hp+' / '+S.pitcher.maxHp+' HP',B.x*2+8,B.y*2+37,{size:11,weight:900,color:[255,207,143]});
};

// 3. DUEL: pitcher (feet at fx,fy) with ball and a path that fades before the zone (C5)
P.pitcher=({fx,fy,h,path})=>{const w=Math.round(443*h/680),s=h/62;
  const img=K.actorPass(K.kmeans(K.resample(K.pixels(P.img.pitcher),w,h,'mean'),18),{ink:[26,14,16],rim:[255,196,128],rimDirs:[[0,-1],[1,0],[-1,0],[1,-1],[-1,-1]],fill:{from:[.78,.74,.88],to:[.6,.58,.74],axis:'y'},rimK:.62});
  const mr=Math.round(15*s),mx=fx,my=fy;
  for(let i=-mr;i<=mr;i++){const ww=Math.round(Math.sqrt(1-(i/mr)**2)*3*s);for(let j=-ww;j<=ww;j++)px(mx+i,my+j,j>0?[124,62,36]:[176,104,64])}
  K.wash(mx-Math.round(11*s),my-2,Math.round(24*s),3,[20,8,4],.5);
  const x=fx-Math.round(w/2),y=fy-h;K.blit(img,x,y);
  const bx=x+Math.round(38*s),by=y+Math.round(5*s);rect(bx,by,2,2,[255,250,232]);
  for(const [dx,dy,a] of [[-1,0,.8],[2,0,.8],[0,-1,.8],[0,2,.8],[-2,0,.45],[3,0,.45],[0,-2,.45],[0,3,.45]])px(bx+dx,by+dy,[255,236,190],a);
  if(path){const [tx,ty]=path;for(let i=0;i<24;i+=2){const t=i/23,qx=Math.round(bx+1+(tx-bx)*t+t*t*6),qy=Math.round(by+4+(ty-by)*t),a=1-t*.95;
    K.rect(qx-1,qy-1,4,4,[255,214,150],a*.18);K.rect(qx,qy,2,2,[255,240,200],a)}}                      // seams of light, gone before the zone (C5)
  return {x,y,w,h,ball:[bx,by]};
};
P.batter=({x,y,h})=>{const w=Math.round(509*h/730);
  K.blit(K.actorPass(K.kmeans(K.resample(K.pixels(P.img.batter),w,h,'mode'),28),{ink:[22,14,20],rim:[255,168,92],rimDirs:[[1,0],[0,-1],[1,-1]],fill:{from:[.6,.64,.86],to:[1.02,.96,.9],axis:'x'},rimK:.7,rim2:[170,210,255],rim2Dirs:[[-1,0],[-1,-1]],rim2K:.55}),x,y);
  return {x,y,w,h}};
P.intent=(I,{pointer='left'}={})=>{
  rect(I.x,I.y,I.w,I.h,[20,12,8],.88);rect(I.x,I.y,I.w,1,[255,196,120]);rect(I.x,I.y+I.h-1,I.w,1,[120,80,40]);
  rect(I.x,I.y,1,I.h,[255,196,120]);rect(I.x+I.w-1,I.y,1,I.h,[120,80,40]);
  if(pointer==='left')for(let j=0;j<4;j++)rect(I.x-1-j,I.y+8+j,1,7-2*j,[255,196,120]);
  if(pointer==='right')for(let j=0;j<4;j++)rect(I.x+I.w+j,I.y+8+j,1,7-2*j,[120,80,40]);
  text(P.S.intent,I.x*2+9,I.y*2+6,{size:12,weight:900,color:C.gold});
  text('투수 의도 · 예고 아님',I.x*2+9,I.y*2+27,{size:9,weight:700,color:[214,184,147]});
};

// 4. 9ZONE — the signature object. cell size sets the whole device.
P.zone=({x,y,cell=32,gap=2,plate=true,glass=1})=>{const S=P.S,g=3*cell+2*gap,Z={x,y,w:g+6,h:g+6+18},G={x:x+3,y:y+3};
  if(plate){for(let j=0;j<20;j+=4)K.wash(Z.x+6+j,Z.y+Z.h+j-6,Z.w-12-2*j,4,[255,214,150],.14*(1-j/20));
    const pw=Math.round(Z.w*.51),x0=Z.x+Math.round((Z.w-pw)/2),y0=Z.y+Z.h+2;rect(x0,y0-1,pw,1,C.ink);
    for(let j=0;j<11;j++){const k=j<5?0:Math.round((j-5)*pw/12.3);rect(x0+k,y0+j,pw-2*k,1,j===0?[255,250,236]:[232,222,200]);px(x0+k-1,y0+j,C.ink);px(x0+pw-k,y0+j,C.ink)}}
  rect(Z.x,Z.y,Z.w,Z.h,[12,20,34],.16*glass);
  for(let r=2;r<=4;r++){const a=[0,0,.34,.16,.07][r];K.wash(Z.x-r,Z.y-r,Z.w+2*r,1,C.gold,a);K.wash(Z.x-r,Z.y+Z.h+r-1,Z.w+2*r,1,C.gold,a);
    K.wash(Z.x-r,Z.y-r+1,1,Z.h+2*r-2,C.gold,a);K.wash(Z.x+Z.w+r-1,Z.y-r+1,1,Z.h+2*r-2,C.gold,a)}
  rect(Z.x-1,Z.y-1,Z.w+2,1,C.ink);rect(Z.x-1,Z.y+Z.h,Z.w+2,1,C.ink);rect(Z.x-1,Z.y,1,Z.h,C.ink);rect(Z.x+Z.w,Z.y,1,Z.h,C.ink);
  rect(Z.x,Z.y,Z.w,1,C.goldHi);rect(Z.x,Z.y+Z.h-1,Z.w,1,C.gold);rect(Z.x,Z.y,1,Z.h,C.gold);rect(Z.x+Z.w-1,Z.y,1,Z.h,C.gold);
  rect(Z.x+1,Z.y+1,Z.w-2,1,[255,244,214],.35);
  for(const [cx,cy,sx,sy] of [[Z.x-3,Z.y-3,1,1],[Z.x+Z.w+2,Z.y-3,-1,1],[Z.x-3,Z.y+Z.h+2,1,-1],[Z.x+Z.w+2,Z.y+Z.h+2,-1,-1]])
    for(let i=0;i<8;i++){px(cx+i*sx,cy,C.gold);px(cx+i*sx,cy+sy,C.goldLo);px(cx,cy+i*sy,C.gold);px(cx+sx,cy+i*sy,C.goldLo)}
  for(const t of [1,2]){const ty=G.y+t*(cell+gap)-1;rect(Z.x-7,ty,3,1,C.gold);rect(Z.x+Z.w+4,ty,3,1,C.gold)}
  {const tw=glyphW('9ZONE')+12,tx=Z.x+Math.round((Z.w-tw)/2),ty=Z.y-11;
   for(let j=0;j<10;j++){const k=Math.max(0,3-Math.floor(j/2));rect(tx+k,ty+j,tw-2*k,1,j<4?C.goldHi:j<7?C.gold:C.goldLo);px(tx+k,ty+j,C.ink);px(tx+tw-k-1,ty+j,C.ink)}
   rect(tx+3,ty-1,tw-6,1,C.ink);glyphs('9ZONE',tx+6,ty+2,C.goldInk)}
  const main=new Set(S.coverage.main),sup=new Set(S.coverage.supports.flatMap(v=>v.cells));
  const cellXY=z=>[G.x+(z%3)*(cell+gap),G.y+Math.floor(z/3)*(cell+gap)],c=cell;
  for(let z=0;z<9;z++){const [cx,cy]=cellXY(z),sh=S.read[z].shade;
    rect(cx,cy,c,c,[10,16,28],Math.min(.8,.2*glass));
    if(sh)K.wash(cx,cy,c,c,C.ember,[0,.07,.17,.29][sh]);                                  // read shade: level 0 = 3 shades
    rect(cx,cy,c,1,[246,238,219],.14);rect(cx,cy+c-1,c,1,[0,0,0],.3);rect(cx,cy,1,c,[246,238,219],.12);rect(cx+c-1,cy,1,c,[0,0,0],.25);
    if(main.has(z)){K.wash(cx,cy,c,c,C.gold,.2);K.wash(cx+1,cy+1,c-2,3,C.goldHi,.28);rect(cx,cy,c,1,C.gold);rect(cx,cy+c-1,c,1,C.goldLo);rect(cx,cy,1,c,C.gold);rect(cx+c-1,cy,1,c,C.goldLo)}
    if(sup.has(z)){const o=main.has(z)?1:0;for(const k of [o,o+1]){rect(cx+k,cy+k,c-2*k,1,C.teal);rect(cx+k,cy+c-1-k,c-2*k,1,C.tealLo);rect(cx+k,cy+k,1,c-2*k,C.teal);rect(cx+c-1-k,cy+k,1,c-2*k,C.tealLo)}}
    rect(cx+1,cy+1,5,7,[8,8,14],.62);K.glyphs3(String(z+1),cx+2,cy+2,[236,228,208]);          // small coordinate glyph: coverage leads
  }
  const nudge=0,cc=z=>{const [cx,cy]=cellXY(z);return [cx+Math.floor(c/2)+nudge,cy+Math.floor(c/2)+1+nudge]}; // clear the coordinate badge in small cells
  for(const l of S.links){const [a,b]=cc(l.fromZone),[e,f]=cc(l.toZone);line(a,b,e,f,C.tealInk,4);line(a,b,e,f,l.connected?C.teal:[140,140,140],2)}
  for(const st of S.steps){const [tx,ty]=cc(st.aimZone);disc(tx,ty,8,[255,248,230],[255,248,230],[255,248,230],C.ink);
    if(st.main)disc(tx,ty,7,C.goldHi,C.gold,C.goldLo,C.goldInk);else disc(tx,ty,7,C.tealHi,C.teal,C.tealLo,C.tealInk)}
  const fy=G.y+g+3,fw=Math.floor((Z.w-8)/2);rect(Z.x+2,fy-2,Z.w-4,1,[255,236,196],.3);
  for(const fx of [Z.x+3,Z.x+5+fw]){rect(fx,fy,fw,15,[8,8,12],.85);rect(fx,fy,fw,1,[246,238,219],.18)}
  text('◀ 몸쪽',Z.x*2+10,Z.y*2-21,{size:10,weight:800,color:[222,214,196]});
  text('바깥쪽 ▶',(Z.x+Z.w)*2-10,Z.y*2-21,{size:10,weight:800,color:[222,214,196],align:'right'});
  const compact=fw<46,ls=compact?9:11,ns=compact?13:15,ly=compact?11:9,ny=compact?8:7,pad=compact?6:8;
  text('피해 효율',(Z.x+3)*2+pad,fy*2+ly,{size:ls,weight:800,color:[221,212,194]});
  text(Math.round(S.damageRate*100)+'%',(Z.x+3+fw)*2-pad+1,fy*2+ny,{size:ns,weight:900,color:C.gold,align:'right'});
  text('CONNECT',(Z.x+5+fw)*2+pad,fy*2+ly,{size:ls,weight:800,color:[221,212,194]});
  text(S.connectCount+'/'+(S.cardCount-1),(Z.x+5+2*fw)*2-pad+1,fy*2+ny,{size:ns,weight:900,color:C.teal,align:'right'});
  for(const st of S.steps){const [tx,ty]=cc(st.aimZone);text(String(st.order),tx*2+1,ty*2-8,{size:17,weight:900,color:st.main?C.goldInk:C.tealInk,align:'center',ring:false})}
  return Z;
};

// 5. HAND — home-plate cards with a seam shoulder and a miniature 9ZONE
P.card=(h,x,y,{w=34,hh=52}={})=>{const st=P.stackOf[h.id];y-=st?6:0;
  K.plateShape(x+1,y+2,w,hh,(X,Y)=>px(X,Y,[0,0,0],.45));
  K.plateShape(x,y,w,hh,(X,Y,ci,cj,edge)=>{if(edge){px(X,Y,st?(st.main?C.goldLo:C.tealLo):C.parchInk);return}const t=cj/hh;px(X,Y,t<.28?C.parch:t<.62?C.parch2:C.parch3)});
  if(st)K.plateShape(x+1,y+1,w-2,hh-2,(X,Y,ci,cj,edge)=>{if(edge)px(X,Y,st.main?C.gold:C.teal,.85)});
  P._dim=!st;
  for(let j=5;j<34;j+=4){px(x+3,y+j,C.seam);px(x+4,y+j+1,C.seam);px(x+6,y+j+1,C.seam);px(x+7,y+j,C.seam)}
  rect(x+9,y+2,w-11,11,[214,196,158],.55);rect(x+9,y+12,w-11,1,[180,156,112],.7);
  const mx=x+Math.round(w/2)-6,my=y+16,on=st?(st.main?C.gold:C.teal):[60,110,100],onLo=st?(st.main?C.goldLo:C.tealLo):[40,80,72];
  rect(mx-2,my-2,18,18,[40,28,18]);rect(mx-1,my-1,16,16,[70,52,34]);
  for(let k=0;k<9;k++){const gx=mx+(k%3)*5,gy=my+Math.floor(k/3)*5,lit=shapeCells[h.shape].includes(k);rect(gx,gy,4,4,lit?on:[92,72,50]);if(lit){rect(gx,gy,4,1,[255,248,230],.55);rect(gx,gy+3,4,1,onLo)}}
  for(const [cx,cy,sx,sy] of [[mx-3,my-3,1,1],[mx+16,my-3,-1,1],[mx-3,my+16,1,-1],[mx+16,my+16,-1,-1]]){px(cx,cy,C.goldLo);px(cx+sx,cy,C.goldLo);px(cx,cy+sy,C.goldLo)}
  if(P._dim)K.plateShape(x,y,w,hh,(X,Y)=>px(X,Y,[20,12,8],.2));                               // waiting cards sit back
  const cx=x+Math.round(w/2),cy=y+hh-4;
  if(st)disc(cx,cy,5,st.main?C.goldHi:C.tealHi,st.main?C.gold:C.teal,st.main?C.goldLo:C.tealLo,st.main?C.goldInk:C.tealInk);
  text(h.name,x*2+w+3,y*2+9,{size:12,weight:900,color:[28,22,15],align:'center',ring:false});
  text(st?(st.main?'MAIN':'SUPPORT'):'대기',x*2+w+3,y*2+70,{size:9,weight:900,color:st?(st.main?[138,90,28]:[31,110,100]):[109,90,64],align:'center',ring:false});
  if(st)text(String(st.order),cx*2+1,cy*2-6,{size:12,weight:900,color:st.main?C.goldInk:C.tealInk,align:'center',ring:false});
};
// the hand reads in swing order: stacked cards 1→2→3 from the left, waiting cards after (display only)
P.handOrdered=()=>[...P.S.hand].sort((a,b)=>(P.stackOf[a.id]?.order||9)-(P.stackOf[b.id]?.order||9));
P.handLabel=(x,y)=>{const S=P.S;text('SWING ORDER',x*2,y*2,{size:10,weight:800,color:C.dim});
  text(S.cardCount+'장 · 메인 1 + 지원 '+(S.cardCount-1),x*2+86,y*2-1,{size:12,weight:900,color:C.gold})};

// 6. EXECUTE
P.buttons=({x,y,h=27,small=38,gapX=3,goW})=>{const S=P.S,dark=[[44,33,26],[32,24,19],[22,16,13]];
  K.hexButton(x,y,small,h,dark,[8,6,5],[70,58,46]);K.hexButton(x+small+gapX,y,small,h,dark,[8,6,5],[70,58,46]);
  const gx=x+2*(small+gapX);K.wash(gx-2,y-1,goW+4,h+2,C.gold,.10);K.wash(gx-1,y-2,goW+2,h+4,C.gold,.06);
  K.hexButton(gx,y+2,goW,h,[[120,70,20],[120,70,20],[90,50,14]],C.goldInk);                     // the plate's thickness
  K.hexButton(gx,y,goW,h,[[255,226,155],[240,178,76],[201,131,42]],C.goldInk,[255,246,214]);
  const mid=(bx,bw)=>(bx+bw/2)*2,ty=y*2;
  text('준비',mid(x,small),ty+12,{size:14,weight:900,align:'center'});text('집중·드로우',mid(x,small),ty+32,{size:9,weight:700,color:[127,138,140],align:'center'});
  text('지켜보기',mid(x+small+gapX,small),ty+12,{size:14,weight:900,align:'center'});text('볼/스트라이크',mid(x+small+gapX,small),ty+32,{size:9,weight:700,color:[127,138,140],align:'center'});
  text('스윙 확정',mid(gx,goW),ty+9,{size:18,weight:900,color:C.goldInk,align:'center',ring:false});
  text(S.cardCount+'장 · 1회 실행',mid(gx,goW),ty+33,{size:10,weight:800,color:[107,61,16],align:'center',ring:false});
};
P.topbar=w=>{for(let k=0;k<4;k++)K.wash(0,k*4,w,4,[8,8,16],.8-k*.2);
  rect(6,4,7,9,C.gold);glyphs('9',7,5,C.goldInk);glyphs('ZONE',15,5,C.gold);
  text('#7 강한결',90,8,{size:13,weight:900});text('1번 · 타석 1',154,11,{size:10,weight:700,color:C.dim});
  text('1막 · 정규 승부',w*2-8,10,{size:10,weight:700,color:C.dim,align:'right'})};
P.done=()=>{const S=P.S;document.getElementById('sr').textContent='상대 '+S.pitcher.name+' HP '+S.pitcher.hp+'/'+S.pitcher.maxHp+'. 의도 '+S.intent+'. '+
  S.steps.map(s=>s.order+'번 '+s.name+' '+(s.aimZone+1)+'존').join(', ')+'. 피해 효율 '+Math.round(S.damageRate*100)+'%, CONNECT '+S.connectCount+'/'+(S.cardCount-1)+'.';
  document.body.dataset.ready='1'};
P.fail=e=>{document.body.dataset.error=e.message;const t=document.getElementById('txt').getContext('2d');t.fillStyle='#f66';t.font='14px sans-serif';t.fillText(e.message,10,30)};
window.GM=P;
})();
