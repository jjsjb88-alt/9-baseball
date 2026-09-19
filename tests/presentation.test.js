import {describe,it,expect} from 'vitest';
import {contactGrade,presentationFor,presentationTimeline,cinemaDirector} from '../src/duel/presentation.js';

const state=(kind,label,zone=4,coverage=[],aimZone=4,context={})=>({
  last:{kind:kind==='skill'?'skill':'pitch',text:label,events:kind==='skill'?['중간 높이 확인']:[],runs:context.runs||0},
  battle:{revealed:kind==='skill'?null:{kind,label,zone,coverage,aimZone,strikesBefore:context.strikesBefore||0,ballsBefore:context.ballsBefore||0,action:context.action||'strike'}}
});

describe('master presentation language',()=>{
  it('separates reading, exact contact and a one-zone miss',()=>{
    expect(presentationFor(state('skill','릴리스 간파 · 준비 1/2'))).toMatchObject({kind:'read',title:'읽었다',cue:'read'});
    expect(presentationFor(state('hit','중전안타',4,[4],4))).toMatchObject({kind:'dead-center',grade:'dead-center',title:'정확히 맞혔다',cue:'deadCenter'});
    expect(presentationFor(state('whiff','헛스윙',1,[4],4))).toMatchObject({kind:'near-miss',grade:'near-miss',title:'한 칸 차이',cue:'nearMiss'});
  });

  it('reserves different success language for power, jammed and lucky contact',()=>{
    expect(presentationFor(state('hit','2루타',5,[5],5))).toMatchObject({kind:'extra',title:'갈랐다',cue:'extra'});
    expect(presentationFor(state('hit','홈런',3,[3],3))).toMatchObject({kind:'homer',title:'넘겼다',cue:'homer'});
    expect(presentationFor(state('hit','땅볼 안타',5,[5],4))).toMatchObject({kind:'jammed',title:'빠졌다',cue:'jammed'});
    expect(presentationFor(state('hit','바가지 안타 · 행운의 단타',2,[2],1))).toMatchObject({kind:'lucky',title:'떨어졌다',cue:'lucky'});
    expect(presentationFor(state('hit','중전안타',5,[5],4))).toMatchObject({kind:'hit',grade:'solid',title:'맞혔다'});
  });

  it('diversifies whiffs into near miss, chase and wrong read',()=>{
    expect(contactGrade(state('whiff','헛스윙',1,[4],4).battle.revealed)).toBe('near-miss');
    expect(presentationFor(state('whiff','헛스윙',9,[4],4))).toMatchObject({kind:'chase',title:'쫓았다',cue:'chase'});
    expect(presentationFor(state('whiff','헛스윙',0,[8],8))).toMatchObject({kind:'whiff',grade:'fooled',title:'속았다',cue:'fooled'});
  });

  it('lets baseball context upgrade the same raw result into a different moment',()=>{
    expect(presentationFor(state('hit','홈런',4,[4],4,{runs:4}))).toMatchObject({kind:'grand-slam',grade:'grand-slam',title:'싹쓸었다',cue:'grandSlam'});
    expect(presentationFor(state('foul','파울',1,[4],4,{strikesBefore:2}))).toMatchObject({kind:'battle-foul',grade:'battle-foul',title:'끝까지 버텼다',cue:'battleFoul'});
    expect(presentationFor(state('ball','볼넷',9,[],4,{runs:1,ballsBefore:3}))).toMatchObject({kind:'walk-rbi',grade:'walk-rbi',title:'밀어냈다',cue:'walkRbi'});
    expect(presentationFor(state('sacrifice','희생 번트',6,[],4,{runs:1}))).toMatchObject({kind:'sacrifice-run',grade:'sacrifice-run',title:'점을 만들었다'});
    expect(presentationFor(state('whiff','헛스윙 삼진',1,[4],4,{strikesBefore:2}))).toMatchObject({kind:'near-miss',grade:'near-miss-k',title:'한 칸 차이로 끝'});
    expect(presentationFor(state('whiff','헛스윙 삼진',9,[4],4,{strikesBefore:2}))).toMatchObject({kind:'chase',grade:'chase-k',title:'쫓아가다 끝'});
  });

  it('uses slow motion only for moments that benefit from anticipation',()=>{
    const near=presentationTimeline(presentationFor(state('whiff','헛스윙',1,[4],4)));
    const normal=presentationTimeline(presentationFor(state('hit','중전안타',5,[5],4)));
    const lucky=presentationTimeline(presentationFor(state('hit','바가지 안타 · 행운의 단타',2,[2],1)));
    expect(near.slowmo).toBe(380);
    expect(lucky.slowmo).toBeGreaterThan(0);
    expect(normal.slowmo).toBe(0);
    expect(near.releaseAt).toBe(near.impactAt+near.freeze+near.slowmo);
    expect(presentationTimeline(presentationFor(state('whiff','헛스윙',1,[4],4)),true)).toMatchObject({duration:60,slowmo:0});
  });

  it('directs outcomes with different ownership instead of one generic camera grammar',()=>{
    const contact=presentationFor(state('hit','중전안타',4,[4],4));
    const power=presentationFor(state('hit','홈런',4,[4],4));
    const near=presentationFor(state('whiff','헛스윙',1,[4],4));
    const strikeout=presentationFor(state('whiff','헛스윙 삼진',0,[8],8,{strikesBefore:2}));
    const scrappy=presentationFor(state('hit','땅볼 안타',5,[5],4));

    expect(contact.director).toMatchObject({key:'contact',code:1});
    expect(power.director).toMatchObject({key:'power',code:2});
    expect(near.director).toMatchObject({key:'near-miss',code:3});
    expect(strikeout.director).toMatchObject({key:'strikeout',code:4});
    expect(scrappy.director).toMatchObject({key:'scrappy',code:5});

    expect(power.director.ownership).toEqual(['pitcher','contact','ball','stadium']);
    expect(near.director.ownership).toEqual(['pitcher','passing-ball','batter']);
    expect(cinemaDirector({grade:'called-k'}).key).toBe('strikeout');
  });

  it('hands power shots to the ball sooner while near misses linger on the passing pitch',()=>{
    const homer=presentationTimeline(presentationFor(state('hit','홈런',4,[4],4)));
    const near=presentationTimeline(presentationFor(state('whiff','헛스윙',1,[4],4)));
    const solid=presentationTimeline(presentationFor(state('hit','중전안타',5,[5],4)));

    expect(homer.freeze).toBe(76);
    expect(homer.slowmo).toBe(110);
    expect(homer.releaseAt).toBe(476);
    expect(near.freeze).toBe(16);
    expect(near.slowmo).toBe(380);
    expect(near.releaseAt).toBe(641);
    expect(solid.duration).toBeLessThan(1000);
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
