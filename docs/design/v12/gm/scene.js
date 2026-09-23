// V12 D1 Golden Master — portrait scene (195×422 art grid, shown at 2×). Decision-only.
/* global PK */
(async()=>{
const K=PK;K.init(document.getElementById('art'),document.getElementById('txt'));
const {px,rect,dither,glyphs,glyphW,text,disc,line,bayer}=K;
const C={ink:[20,12,14],gold:[255,210,122],goldHi:[255,241,196],goldLo:[201,138,44],goldInk:[42,23,6],
  teal:[95,214,196],tealHi:[201,255,245],tealLo:[31,127,117],tealInk:[6,37,33],cream:[246,238,219],ember:[255,150,70],
  parch:[251,243,222],parch2:[231,218,187],parch3:[205,185,143],parchInk:[74,50,28],seam:[200,57,58],
  led:[255,138,76],ledHi:[255,196,130],board:[12,23,20],boardEdge:[40,66,57],dim:[167,154,134]};
const S=await (await fetch('gm/gm-state.json')).json();
const [stadium,batterImg,pitcherImg]=await Promise.all([K.load('../../../assets/duel/stadium.png'),K.load('gm/batter-ready.png'),K.load('gm/pitcher-windup.png')]);

// 1. SPACE — the DUGOUT stadium around its outfield scoreboard, one 48-colour palette
K.blit(K.kmeans(K.resample(K.pixels(stadium,531,206,609,734),195,235,'mode'),48),0,0);
for(let k=0;k<4;k++)K.wash(0,112+k*4,195,32-k*8,[255,196,140],.035);                             // infield haze, stepped
for(let k=0;k<12;k++)K.wash(0,150+k*12,195,12,[24,11,9],Math.min(.97,(k+1)/11.5));             // clay falls into shade in bands
// light shafts from the floods just off frame: two stepped bands each, crisp edges
const rnd=K.rng(12012026);
K.poly([[-14,-6],[22,-6],[132,150],[70,156]],[255,232,186],.075);K.poly([[-4,-6],[12,-6],[112,150],[84,152]],[255,236,196],.08);
K.poly([[176,-6],[209,-6],[172,152],[118,146]],[255,232,186],.065);K.poly([[186,-6],[200,-6],[160,150],[136,148]],[255,236,196],.07);
for(let i=0;i<26;i++){const t=rnd(),left=i%2===0,x=left?Math.round(4+t*100+rnd()*16):Math.round(186-t*52-rnd()*14),y=Math.round(t*140+6);
  px(x,y,[255,244,214],.35+rnd()*.4)}                                                            // dust in the beams
for(const [x,y] of [[23,79],[161,73],[178,84],[40,86]]){px(x,y,[255,255,255]);px(x-1,y,[255,255,255],.5);px(x+1,y,[255,255,255],.5);px(x,y-1,[255,255,255],.5);px(x,y+1,[255,255,255],.5)} // camera flashes

line(0,275,80,262,[236,226,202]);line(0,276,80,263,[120,80,60]);                               // batter's box chalk
line(176,281,194,285,[236,226,202]);

// 2. OPPONENT — on the outfield scoreboard
const B={x:58,y:34,w:78,h:29};
for(const x of [B.x+6,B.x+B.w-9]){rect(x,B.y+B.h,3,26,[18,24,24]);rect(x,B.y+B.h,1,26,[46,60,58]);rect(x+2,B.y+B.h,1,26,[8,10,12])} // scoreboard posts into the stands
rect(B.x+4,B.y+B.h,B.w-8,2,[14,18,18]);
rect(B.x-1,B.y-1,B.w+2,B.h+2,C.ink);rect(B.x,B.y,B.w,B.h,C.board);rect(B.x,B.y,B.w,1,C.boardEdge);
for(let j=2;j<B.h-2;j+=2)K.wash(B.x+2,B.y+j,B.w-4,1,[255,255,255],.03);
const hpSeg=34,hpOn=Math.round(hpSeg*S.pitcher.hp/S.pitcher.maxHp);
for(let i=0;i<hpSeg;i++)rect(B.x+5+i*2,B.y+11,1,3,i<hpOn?(i%5===4?C.ledHi:C.led):[45,22,16]);
K.wash(B.x+4,B.y+10,69,5,C.led,.12);
let bx=B.x+42;for(const [l,n,on] of [['B',3,S.count.balls],['S',2,S.count.strikes],['O',2,S.count.outs]]){
  for(let i=0;i<n;i++)rect(bx+5+i*3,B.y+21,2,2,i<on?C.gold:[52,70,63]);bx+=5+n*3+3}

// 3. DUEL — pitcher far, batter near, one sunset backlight
const pitcher=K.actorPass(K.kmeans(K.resample(K.pixels(pitcherImg),40,62,'mean'),18),{ink:[26,14,16],rim:[255,214,160],rimDirs:[[0,-1],[1,0],[-1,0]],fill:{from:[.9,.88,.98],to:[.78,.76,.9],axis:'y'},rimK:.5});
for(let i=-15;i<=15;i++){const w=Math.round(Math.sqrt(1-(i/15)**2)*3);for(let j=-w;j<=w;j++)px(102+i,131+j,j>0?[124,62,36]:[176,104,64])}
K.wash(91,129,24,3,[20,8,4],.5);K.wash(94,128,18,1,[20,8,4],.3);
K.blit(pitcher,82,69);
const ball=[120,74];rect(ball[0],ball[1],2,2,[255,250,232]);
for(const [dx,dy,a] of [[-1,0,.8],[2,0,.8],[0,-1,.8],[0,2,.8],[-2,0,.45],[3,0,.45],[0,-2,.45],[0,3,.45]])px(ball[0]+dx,ball[1]+dy,[255,236,190],a);
for(let i=0;i<24;i+=2){const t=i/23;px(Math.round(121+t*9+t*t*6),Math.round(78+t*60),[255,230,170],1-t*.9)} // path fades before the zone (C5)

const batter=K.actorPass(K.kmeans(K.resample(K.pixels(batterImg),139,200,'mode'),28),{ink:[22,14,20],rim:[255,204,140],rimDirs:[[1,0],[0,-1],[1,-1]],fill:{from:[.6,.64,.86],to:[1.02,.96,.9],axis:'x'},rimK:.7});
K.blit(batter,-39,131);
for(let k=0;k<8;k++)K.wash(0,268+k*3,95,3,[12,7,6],(k+1)/8*.9);                               // legs sink into the tray
for(let k=0;k<3;k++){K.wash(k*4,14,4,274,[6,4,10],.28-k*.09);K.wash(191-k*4,14,4,274,[6,4,10],.28-k*.09)} // edge falloff
// dugout-plank tray under the hand: wood, seams and grain, then pushed back into shade
for(let k=0;k<4;k++)K.wash(0,284+k*2,195,2,[12,7,6],.25+k*.2);
for(let y=292;y<422;y++){const row=Math.floor((y-292)/7),seam=(y-292)%7===0,base=row%2?[38,25,18]:[33,22,16];rect(0,y,195,1,seam?[13,8,6]:base)}
for(let i=0;i<150;i++){const x=Math.floor(rnd()*190),y=293+Math.floor(rnd()*128);if((y-292)%7===0)continue;rect(x,y,2+Math.floor(rnd()*5),1,rnd()<.5?[48,33,24]:[24,15,11])}
for(let x=0;x<195;x+=41)for(let y=293;y<422;y+=7)px(x+((y*7)%13),y+3,[70,52,38]);                // nail heads
K.wash(0,292,195,130,[10,6,5],.35);

const I={x:130,y:82,w:55,h:24};
rect(I.x,I.y,I.w,I.h,[20,12,8],.88);rect(I.x,I.y,I.w,1,[255,196,120]);rect(I.x,I.y+I.h-1,I.w,1,[120,80,40]);
rect(I.x,I.y,1,I.h,[255,196,120]);rect(I.x+I.w-1,I.y,1,I.h,[120,80,40]);
for(let j=0;j<4;j++)rect(I.x-1-j,I.y+8+j,1,7-2*j,[255,196,120]);

// 4. 9ZONE — the signature object
const Z={x:82,y:145,w:106,h:124},G={x:Z.x+3,y:Z.y+3,cell:32,gap:2};
for(let j=0;j<20;j+=4)K.wash(Z.x+6+j,Z.y+Z.h+j-6,Z.w-12-2*j,4,[255,214,150],.14*(1-j/20));    // light onto the plate, stepped
{const x0=108,y0=271;rect(x0,y0-1,54,1,C.ink);
 for(let j=0;j<11;j++){const k=j<5?0:Math.round((j-5)*4.4);rect(x0+k,y0+j,54-2*k,1,j===0?[255,250,236]:[232,222,200]);px(x0+k-1,y0+j,C.ink);px(x0+54-k,y0+j,C.ink)}}
rect(Z.x,Z.y,Z.w,Z.h,[12,20,34],.16);
for(let r=2;r<=4;r++){const a=[0,0,.34,.16,.07][r];K.wash(Z.x-r,Z.y-r,Z.w+2*r,1,C.gold,a);K.wash(Z.x-r,Z.y+Z.h+r-1,Z.w+2*r,1,C.gold,a);
  K.wash(Z.x-r,Z.y-r+1,1,Z.h+2*r-2,C.gold,a);K.wash(Z.x+Z.w+r-1,Z.y-r+1,1,Z.h+2*r-2,C.gold,a)}
rect(Z.x-1,Z.y-1,Z.w+2,1,C.ink);rect(Z.x-1,Z.y+Z.h,Z.w+2,1,C.ink);rect(Z.x-1,Z.y,1,Z.h,C.ink);rect(Z.x+Z.w,Z.y,1,Z.h,C.ink);
rect(Z.x,Z.y,Z.w,1,C.goldHi);rect(Z.x,Z.y+Z.h-1,Z.w,1,C.gold);rect(Z.x,Z.y,1,Z.h,C.gold);rect(Z.x+Z.w-1,Z.y,1,Z.h,C.gold);
rect(Z.x+1,Z.y+1,Z.w-2,1,[255,244,214],.35);
for(const [cx,cy,sx,sy] of [[Z.x-3,Z.y-3,1,1],[Z.x+Z.w+2,Z.y-3,-1,1],[Z.x-3,Z.y+Z.h+2,1,-1],[Z.x+Z.w+2,Z.y+Z.h+2,-1,-1]])
  for(let i=0;i<8;i++){px(cx+i*sx,cy,C.gold);px(cx+i*sx,cy+sy,C.goldLo);px(cx,cy+i*sy,C.gold);px(cx+sx,cy+i*sy,C.goldLo)}
for(const t of [1,2]){const ty=G.y+t*(G.cell+G.gap)-1;rect(Z.x-7,ty,3,1,C.gold);rect(Z.x+Z.w+4,ty,3,1,C.gold)}
{const tw=glyphW('9ZONE')+12,tx=Z.x+Math.round((Z.w-tw)/2),ty=Z.y-11;
 for(let j=0;j<10;j++){const k=Math.max(0,3-Math.floor(j/2));rect(tx+k,ty+j,tw-2*k,1,j<4?C.goldHi:j<7?C.gold:C.goldLo);px(tx+k,ty+j,C.ink);px(tx+tw-k-1,ty+j,C.ink)}
 rect(tx+3,ty-1,tw-6,1,C.ink);glyphs('9ZONE',tx+6,ty+2,C.goldInk)}
const main=new Set(S.coverage.main),sup=new Set(S.coverage.supports.flatMap(x=>x.cells));
const cellXY=z=>[G.x+(z%3)*(G.cell+G.gap),G.y+Math.floor(z/3)*(G.cell+G.gap)];
for(let z=0;z<9;z++){const [x,y]=cellXY(z),c=G.cell,sh=S.read[z].shade;
  rect(x,y,c,c,[10,16,28],.2);
  if(sh)K.wash(x,y,c,c,C.ember,[0,.07,.17,.29][sh]);                                            // layer 1: read shade (level 0: 3 shades)
  rect(x,y,c,1,[246,238,219],.14);rect(x,y+c-1,c,1,[0,0,0],.3);rect(x,y,1,c,[246,238,219],.12);rect(x+c-1,y,1,c,[0,0,0],.25);
  if(main.has(z)){K.wash(x,y,c,c,C.gold,.2);K.wash(x+1,y+1,c-2,3,C.goldHi,.28);rect(x,y,c,1,C.gold);rect(x,y+c-1,c,1,C.goldLo);rect(x,y,1,c,C.gold);rect(x+c-1,y,1,c,C.goldLo)}
  if(sup.has(z)){const o=main.has(z)?1:0;for(const k of [o,o+1]){rect(x+k,y+k,c-2*k,1,C.teal);rect(x+k,y+c-1-k,c-2*k,1,C.tealLo);rect(x+k,y+k,1,c-2*k,C.teal);rect(x+c-1-k,y+k,1,c-2*k,C.tealLo)}}
  rect(x+2,y+2,9,11,[8,8,14],.7);rect(x+2,y+2,9,1,[246,238,219],.35);glyphs(String(z+1),x+4,y+4,[246,238,219]); // square coordinate badge
}
const cc=z=>{const [x,y]=cellXY(z);return [x+16,y+17]};
for(const l of S.links){const [a,b]=cc(l.fromZone),[c2,d2]=cc(l.toZone);line(a,b,c2,d2,C.tealInk,4);line(a,b,c2,d2,l.connected?C.teal:[140,140,140],2)}
for(const st of S.steps){const [x,y]=cc(st.aimZone);
  disc(x,y,8,[255,248,230],[255,248,230],[255,248,230],C.ink);
  if(st.main)disc(x,y,7,C.goldHi,C.gold,C.goldLo,C.goldInk);else disc(x,y,7,C.tealHi,C.teal,C.tealLo,C.tealInk);
}
const fy=G.y+100+3;rect(Z.x+2,fy-2,Z.w-4,1,[255,236,196],.3);
for(const fx of [Z.x+3,Z.x+54]){rect(fx,fy,49,15,[8,8,12],.85);rect(fx,fy,49,1,[246,238,219],.18)}

// 5. HAND — home-plate cards with a seam shoulder
rect(0,288,195,1,[255,210,122],.3);K.wash(0,289,195,2,[255,210,122],.08);
const cardW=34,cardH=52,cardY=315,gap=Math.floor((195-10-cardW*5)/4);
const shapeCells={point:[4],column:[1,4,7],row:[3,4,5],cross:[1,3,4,5,7],all:[0,1,2,3,4,5,6,7,8]};
const stackOf=Object.fromEntries(S.steps.map(s=>[s.id,s]));
const cardX=i=>5+i*(cardW+gap);
S.hand.forEach((h,i)=>{const st=stackOf[h.id],x=cardX(i),y=cardY-(st?6:0);
  K.plateShape(x+1,y+2,cardW,cardH,(X,Y)=>px(X,Y,[0,0,0],.45));
  K.plateShape(x,y,cardW,cardH,(X,Y,ci,cj,edge)=>{
    if(edge){px(X,Y,st?(st.main?C.goldLo:C.tealLo):C.parchInk);return}
    const t=cj/cardH;px(X,Y,t<.28?C.parch:t<.62?C.parch2:C.parch3)});
  if(st)K.plateShape(x+1,y+1,cardW-2,cardH-2,(X,Y,ci,cj,edge)=>{if(edge)px(X,Y,st.main?C.gold:C.teal,.85)});
  for(let j=5;j<34;j+=4){px(x+3,y+j,C.seam);px(x+4,y+j+1,C.seam);px(x+6,y+j+1,C.seam);px(x+7,y+j,C.seam)}   // seam stitches
  for(let k=0;k<9;k++)rect(x+11+(k%3)*5,y+15+Math.floor(k/3)*5,4,4,shapeCells[h.shape].includes(k)?[44,95,88]:[203,187,151]); // shape hint only
  if(st){const cx=x+17,cy=y+cardH-4;disc(cx,cy,5,st.main?C.goldHi:C.tealHi,st.main?C.gold:C.teal,st.main?C.goldLo:C.tealLo,st.main?C.goldInk:C.tealInk);
}
});

// 6. EXECUTE
const dark=[[44,33,26],[32,24,19],[22,16,13]];
K.hexButton(6,388,38,27,dark,[8,6,5],[70,58,46]);K.hexButton(47,388,38,27,dark,[8,6,5],[70,58,46]);
K.wash(88,387,103,29,C.gold,.10);K.wash(89,386,101,31,C.gold,.06);
K.hexButton(90,388,99,27,[[255,226,155],[240,178,76],[201,131,42]],C.goldInk,[255,246,214]);

for(let k=0;k<4;k++)K.wash(0,k*4,195,4,[8,8,16],.8-k*.2);
rect(6,4,7,9,C.gold);glyphs('9',7,5,C.goldInk);glyphs('ZONE',15,5,C.gold);

// ── 1× hard-edged text ────────────────────────────────────────────────────────
text('#7 강한결',90,8,{size:13,weight:900});text('1번 · 타석 1',154,11,{size:10,weight:700,color:C.dim});
text('1막 · 정규 승부',382,10,{size:10,weight:700,color:C.dim,align:'right'});
text(S.pitcher.name,B.x*2+8,B.y*2+5,{size:12,weight:900,color:[255,233,184]});
text('바깥쪽 제구형',(B.x+B.w)*2-6,B.y*2+6,{size:10,weight:700,color:[143,217,198],align:'right'});
let lx=(B.x+42)*2;for(const [l,n] of [['B',3],['S',2],['O',2]]){text(l,lx,B.y*2+39,{size:9,weight:900,color:[143,165,157]});lx+=(5+n*3+3)*2}
text(S.pitcher.hp+' / '+S.pitcher.maxHp+' HP',B.x*2+8,B.y*2+37,{size:11,weight:900,color:[255,207,143]});
text(S.intent,I.x*2+9,I.y*2+6,{size:12,weight:900,color:C.gold});
text('투수 의도 · 예고 아님',I.x*2+9,I.y*2+27,{size:9,weight:700,color:[214,184,147]});
text('◀ 몸쪽',Z.x*2+10,Z.y*2-21,{size:10,weight:800,color:[222,214,196]});
text('바깥쪽 ▶',(Z.x+Z.w)*2-10,Z.y*2-21,{size:10,weight:800,color:[222,214,196],align:'right'});
text('피해 효율',(Z.x+3)*2+8,fy*2+9,{size:11,weight:800,color:[221,212,194]});
text(Math.round(S.damageRate*100)+'%',(Z.x+52)*2-7,fy*2+7,{size:15,weight:900,color:C.gold,align:'right'});
text('CONNECT',(Z.x+54)*2+8,fy*2+9,{size:11,weight:800,color:[221,212,194]});
text(S.connectCount+'/'+(S.cardCount-1),(Z.x+103)*2-7,fy*2+7,{size:15,weight:900,color:C.teal,align:'right'});
text('SWING ORDER',14,584,{size:10,weight:800,color:C.dim});
text(S.cardCount+'장 · 메인 1 + 지원 '+(S.cardCount-1),100,583,{size:12,weight:900,color:C.gold});
S.hand.forEach((h,i)=>{const st=stackOf[h.id],x=cardX(i)*2,y=(cardY-(st?6:0))*2;
  text(h.name,x+cardW+3,y+9,{size:12,weight:900,color:[28,22,15],align:'center',ring:false});
  text(st?(st.main?'MAIN':'SUPPORT'):'대기',x+cardW+3,y+64,{size:9,weight:900,color:st?(st.main?[138,90,28]:[31,110,100]):[109,90,64],align:'center',ring:false})});
text('준비',50,788,{size:14,weight:900,align:'center'});text('집중·드로우',50,808,{size:9,weight:700,color:[127,138,140],align:'center'});
text('지켜보기',132,788,{size:14,weight:900,align:'center'});text('볼/스트라이크',132,808,{size:9,weight:700,color:[127,138,140],align:'center'});
text('스윙 확정',278,785,{size:18,weight:900,color:C.goldInk,align:'center',ring:false});
text(S.cardCount+'장 · 1회 실행',278,809,{size:10,weight:800,color:[107,61,16],align:'center',ring:false});

// order numerals on the tokens: crisp, heavy, same ink as the disc
for(const st of S.steps){const [x,y]=cc(st.aimZone);text(String(st.order),x*2+1,y*2-8,{size:17,weight:900,color:st.main?C.goldInk:C.tealInk,align:'center',ring:false})}
S.hand.forEach((h,i)=>{const st=stackOf[h.id];if(!st)return;text(String(st.order),(cardX(i)+17)*2+1,(cardY-6+cardH-4)*2-7,{size:14,weight:900,color:st.main?C.goldInk:C.tealInk,align:'center',ring:false})});
document.getElementById('sr').textContent='상대 '+S.pitcher.name+' HP '+S.pitcher.hp+'/'+S.pitcher.maxHp+'. 의도 '+S.intent+'. '+
  S.steps.map(s=>s.order+'번 '+s.name+' '+(s.aimZone+1)+'존').join(', ')+'. 피해 효율 '+Math.round(S.damageRate*100)+'%, CONNECT '+S.connectCount+'/'+(S.cardCount-1)+'.';
document.body.dataset.ready='1';
})().catch(e=>{document.body.dataset.error=e.message;const t=document.getElementById('txt').getContext('2d');t.fillStyle='#f66';t.font='14px sans-serif';t.fillText(e.message,10,30)});
