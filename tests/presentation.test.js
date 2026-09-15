import {describe,it,expect} from 'vitest';
import {presentationFor} from '../src/duel/presentation.js';

const state=(kind,label,zone=4,coverage=[])=>({
  last:{kind:kind==='skill'?'skill':'pitch',text:label,events:kind==='skill'?['중간 높이 확인']:[]},
  battle:{revealed:kind==='skill'?null:{kind,label,zone,coverage}}
});

describe('master presentation language',()=>{
  it('separates reading, contact and missing into different judgement families',()=>{
    expect(presentationFor(state('skill','릴리스 간파 · 준비 1/2'))).toMatchObject({kind:'read',title:'읽었다',cue:'read'});
    expect(presentationFor(state('hit','중전안타',4,[4]))).toMatchObject({kind:'hit',title:'맞혔다',kicker:'READ CONFIRMED'});
    expect(presentationFor(state('whiff','헛스윙',1,[4]))).toMatchObject({kind:'whiff',title:'빗나갔다',cue:'whiff'});
  });

  it('reserves a larger presentation for extra-base contact and home runs',()=>{
    expect(presentationFor(state('hit','2루타',5,[5]))).toMatchObject({kind:'extra',title:'갈랐다',cue:'extra'});
    expect(presentationFor(state('hit','홈런',3,[3]))).toMatchObject({kind:'homer',title:'넘겼다',cue:'homer'});
  });

  it('gives every non-contact judgement its own readable language',()=>{
    expect(presentationFor(state('foul','파울',2,[]))).toMatchObject({kind:'foul',title:'살아남았다'});
    expect(presentationFor(state('ball','볼',9,[]))).toMatchObject({kind:'ball',title:'골랐다'});
    expect(presentationFor(state('ball','볼넷',9,[]))).toMatchObject({kind:'ball',title:'참아냈다',cue:'walk'});
    expect(presentationFor(state('called','루킹 스트라이크',7,[]))).toMatchObject({kind:'called',title:'지켜봤다'});
    expect(presentationFor(state('called','루킹 삼진',7,[]))).toMatchObject({kind:'called',title:'굳었다',cue:'strikeout'});
    expect(presentationFor(state('sacrifice','희생 번트',6,[]))).toMatchObject({kind:'sacrifice',title:'보냈다'});
    expect(presentationFor(state('out','인플레이 아웃',6,[]))).toMatchObject({kind:'out',title:'잡혔다'});
  });

  it('distinguishes all prepare cards so reading never feels like a generic skill flash',()=>{
    expect(presentationFor(state('skill','타이밍 맞추기 · 준비 1/2')).kind).toBe('lock');
    expect(presentationFor(state('skill','코스 조정 · 준비 1/2')).kind).toBe('expand');
    expect(presentationFor(state('skill','히트앤드런 사인 · 준비 1/2')).kind).toBe('signal');
    expect(presentationFor(state('skill','호흡 고르기 · 준비 1/2')).kind).toBe('survive');
    expect(presentationFor(state('skill','작전 확인 · 준비 1/2')).kind).toBe('draw');
  });
});
