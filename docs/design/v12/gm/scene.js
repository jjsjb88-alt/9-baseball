// V12 D1 Golden Master — portrait 390×844 (art grid 195×422 at 2×). Decision-only.
/* global GM, PK */
(async()=>{
const S=await GM.setup(),K=PK;

// 1. space
GM.stadium({crop:[531,206,609,734],w:195,h:235});
for(let k=0;k<4;k++)K.wash(0,112+k*4,195,32-k*8,[255,196,140],.035);                   // infield haze
for(let k=0;k<12;k++)K.wash(0,150+k*12,195,12,[24,11,9],Math.min(.97,(k+1)/11.5));   // clay falls into shade
GM.shafts([[[[-14,-6],[22,-6],[132,150],[70,156]],.075],[[[-4,-6],[12,-6],[112,150],[84,152]],.08],
  [[[176,-6],[209,-6],[172,152],[118,146]],.065],[[[186,-6],[200,-6],[160,150],[136,148]],.07]]);
GM.dust(26,(t,r,i)=>i%2===0?[Math.round(4+t*100+r*16),Math.round(t*140+6)]:[Math.round(186-t*52-r*14),Math.round(t*140+6)]);
GM.flashes([[23,79],[161,73],[178,84],[40,86]]);
K.line(0,275,80,262,[236,226,202]);K.line(0,276,80,263,[120,80,60]);K.line(176,281,194,285,[236,226,202]);

// 2–3. opponent and duel
GM.board({x:52,y:34,w:90,h:29});
GM.pitcher({fx:102,fy:131,h:62,path:[129,134]});
GM.batter({x:-39,y:131,h:200});
for(let k=0;k<8;k++)K.wash(0,268+k*3,95,3,[12,7,6],(k+1)/8*.9);
GM.edges(14,274,195);
for(let k=0;k<4;k++)K.wash(0,284+k*2,195,2,[12,7,6],.25+k*.2);
GM.planks(0,292,195,130);
GM.intent({x:130,y:82,w:55,h:24});

// 4. 9ZONE
GM.zone({x:82,y:145,cell:32});

// 5. hand
K.rect(0,288,195,1,[255,210,122],.3);K.wash(0,289,195,2,[255,210,122],.08);
GM.handLabel(7,292);
GM.handOrdered().forEach((h,i)=>GM.card(h,5+i*37,318,{hh:56}));

// 6. execute + top strip
GM.buttons({x:6,y:386,goW:101});
GM.topbar(195);
GM.done();
})().catch(GM.fail);
