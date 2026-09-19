import {describe,it,expect} from 'vitest';
import {stackAimConnectPreview} from '../src/duel/StackBoard.jsx';

const route=zones=>zones.map((aimZone,i)=>({id:'c'+i,order:i+1,aimZone,main:i===0}));

describe('V11 direct support aim editing',()=>{
  it('shows a zone that repairs both adjacent links without choosing it automatically',()=>{
    const steps=route([0,8,4]);
    const preview=stackAimConnectPreview(steps,'c1',1);
    expect(preview).toMatchObject({
      localConnected:2,
      localTotal:2,
      localPerfect:true,
      connectCount:2,
      delta:1,
    });
  });

  it('distinguishes partial and broken candidate zones',()=>{
    const steps=route([0,4,8]);
    const partial=stackAimConnectPreview(steps,'c1',3);
    const broken=stackAimConnectPreview(steps,'c1',2);
    expect(partial).toMatchObject({localConnected:1,localTotal:2,localPerfect:false,delta:-1});
    expect(broken).toMatchObject({localConnected:0,localTotal:2,localPerfect:false,delta:-2});
  });

  it('supports a last support card with one adjacent link',()=>{
    const steps=route([0,8]);
    const preview=stackAimConnectPreview(steps,'c1',4);
    expect(preview).toMatchObject({localConnected:1,localTotal:1,localPerfect:true,connectCount:1,delta:1});
  });

  it('never treats MAIN or invalid zones as editable support aim',()=>{
    const steps=route([0,4,8]);
    expect(stackAimConnectPreview(steps,'c0',4)).toBeNull();
    expect(stackAimConnectPreview(steps,'missing',4)).toBeNull();
    expect(stackAimConnectPreview(steps,'c1',-1)).toBeNull();
    expect(stackAimConnectPreview(steps,'c1',9)).toBeNull();
  });
});
