// V12 D1 Golden Master — landscape 844×390 (art grid 422×195 at 2×). Decision-only.
// Stadium on the left, 9ZONE top-right, hand bottom-right: one pitch is decided on one screen.
/* global GM, PK */
(async()=>{
const S=await GM.setup(),K=PK,C=GM.C,{rect,text}=K;

// 1. space — same stadium scale as portrait, wider crop
GM.stadium({crop:[372,206,1300,600],w:422,h:195});
for(let k=0;k<4;k++)K.wash(0,106+k*4,422,32-k*8,[255,196,140],.035);
GM.shade(0,142,422,53,6,[24,11,9],.8);
GM.shafts([[[[-14,-6],[24,-6],[150,150],[84,156]],.07],[[[-2,-6],[14,-6],[130,150],[100,152]],.075]]);
GM.dust(18,(t,r)=>[Math.round(6+t*120+r*16),Math.round(t*140+6)]);
GM.flashes([[28,76],[196,70],[60,82]]);

// 2–3. opponent and duel
GM.board({x:106,y:22,w:90,h:29});
GM.pitcher({fx:151,fy:133,h:62,path:[112,158]});
GM.batter({x:-34,y:36,h:200});
for(let k=0;k<6;k++)K.wash(0,165+k*5,422,5,[12,7,6],(k+1)/6*.85);
GM.edges(14,181,1000);
GM.intent({x:176,y:92,w:55,h:24});

// full bleed: no panel. The stadium runs edge to edge; a stepped scrim deepens toward the right
// so the command side stays legible, and the hand docks on dirt that falls into shade.
for(let k=0;k<30;k++)K.wash(190+k*8,0,8,195,[10,8,14],k*.022);


// 4. 9ZONE — top-right, the plate falls away because the zone is now the command device
GM.zone({x:246,y:26,cell:27,plate:false,glass:2.2});

// actions stacked beside the zone
const bx=346,dark=[[44,33,26],[32,24,19],[22,16,13]];
K.hexButton(bx,24,70,22,dark,[8,6,5],[70,58,46]);K.hexButton(bx,50,70,22,dark,[8,6,5],[70,58,46]);
K.wash(bx-2,79,74,46,C.gold,.10);K.wash(bx-1,78,72,48,C.gold,.06);
K.hexButton(bx,82,70,44,[[120,70,20],[120,70,20],[90,50,14]],C.goldInk);
K.hexButton(bx,80,70,44,[[255,226,155],[240,178,76],[201,131,42]],C.goldInk,[255,246,214]);
text('준비',(bx+35)*2,24*2+8,{size:13,weight:900,align:'center'});text('집중·드로우',(bx+35)*2,24*2+26,{size:9,weight:700,color:[127,138,140],align:'center'});
text('지켜보기',(bx+35)*2,50*2+8,{size:13,weight:900,align:'center'});text('볼/스트라이크',(bx+35)*2,50*2+26,{size:9,weight:700,color:[127,138,140],align:'center'});
text('스윙',(bx+35)*2,80*2+14,{size:18,weight:900,color:C.goldInk,align:'center',ring:false});
text('확정',(bx+35)*2,80*2+36,{size:18,weight:900,color:C.goldInk,align:'center',ring:false});
text(S.cardCount+'장 · 1회',(bx+35)*2,80*2+62,{size:10,weight:800,color:[107,61,16],align:'center',ring:false});

// 5. hand along the bottom of the panel
GM.handOrdered().forEach((h,i)=>GM.card(h,240+i*36,141,{w:32}));

GM.topbar(422);
GM.done();
})().catch(GM.fail);
