// V12 D1 Golden Master — desktop 1440×900 (art grid 480×300 at 3×). Decision-only.
// Not an enlarged phone: the whole authored stadium opens up, both floodlight towers in frame,
// the duel runs corner to centre, and the 9ZONE stands on the plate between them.
/* global GM, PK */
(async()=>{
const S=await GM.setup(),K=PK,C=GM.C;

// 1. space — the full DUGOUT stadium, towers and all
GM.stadium({crop:[0,0,1672,941],w:480,h:270,palette:56});
K.rect(0,270,480,30,[16,9,8]);
for(let k=0;k<4;k++)K.wash(0,150+k*4,480,34-k*8,[255,196,140],.035);
GM.shade(0,178,480,92,10,[24,11,9],.9);
// the towers' own lamps throw the shafts now
GM.shafts([[[[62,24],[82,24],[250,176],[170,182]],.06],[[[68,24],[78,24],[228,176],[196,178]],.065],
  [[[402,24],[422,24],[330,180],[252,176]],.055],[[[408,24],[416,24],[306,178],[276,177]],.06]]);
GM.dust(40,(t,r,i)=>i%2===0?[Math.round(70+t*150+r*20),Math.round(24+t*150)]:[Math.round(410-t*110-r*20),Math.round(24+t*150)]);
GM.flashes([[30,120],[118,116],[372,114],[452,121],[330,118]]);
K.line(4,272,150,262,[236,226,202]);K.line(4,273,150,263,[120,80,60]);

// 2–3. opponent and duel
GM.board({x:195,y:76,w:90,h:29},{posts:14});
GM.pitcher({fx:240,fy:177,h:56,path:[276,226]});
for(let r=0;r<3;r++)K.wash(18+r*6,280+r,110-r*12,6-r*2,[10,4,2],.28);                        // contact shadow
GM.batter({x:22,y:118,h:168});
GM.edges(14,236,480);
GM.intent({x:150,y:120,w:55,h:24},{pointer:'right'});

// 4. 9ZONE on the plate, right of the duel line
GM.zone({x:318,y:96,cell:34});

// 5. hand + actions on the dugout rail along the bottom
for(let k=0;k<4;k++)K.wash(150,228+k*2,330,2,[12,7,6],.25+k*.2);
GM.planks(150,236,330,64);
K.rect(150,235,330,1,[255,210,122],.3);
GM.handLabel(158,229);
S.hand.forEach((h,i)=>GM.card(h,158+i*37,247,{w:34}));
GM.buttons({x:348,y:258,small:34,gapX:3,goW:56});

GM.topbar(480);
GM.done();
})().catch(GM.fail);
