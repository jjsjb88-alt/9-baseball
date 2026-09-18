import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/gm-groundplane.css',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const plate=fs.readFileSync(new URL('../assets/gm-ground/plate.svg',import.meta.url),'utf8');
const mound=fs.readFileSync(new URL('../assets/gm-ground/mound.svg',import.meta.url),'utf8');

/* 흙 명암 단계를 센다. AGENTS.md §6은 "3단계 이상 명암"을 요구한다. */
const dirtShades=svg=>new Set((svg.match(/\.d\d\{fill:#[0-9a-f]{6}\}/g)||[]).map(r=>r.slice(-8,-1))).size;

describe('actor ground plane',()=>{
  it('gives each golden actor a ground element that never takes input',()=>{
    expect(app).toContain('{golden&&<i className="actor-ground" aria-hidden="true"/>}');
    expect(css).toContain('pointer-events:none');
    /* 스프라이트(z-index 3)와 접지 그림자(1)보다 아래에 깔린다. */
    expect(css).toContain('z-index:0');
    expect(main).toContain('import "./duel/gm-groundplane.css";');
  });

  it('binds the batter to the plate art and the pitcher to the mound art',()=>{
    expect(css).toContain(".golden-actor.sprite-batter .actor-ground{");
    expect(css).toContain("url('../../assets/gm-ground/plate.svg')");
    expect(css).toContain(".golden-actor.sprite-pitcher .actor-ground{");
    expect(css).toContain("url('../../assets/gm-ground/mound.svg')");
  });

  it('sizes the ground in container percentages so the three viewport clamps carry it',()=>{
    /* 액터 컨테이너는 뷰포트마다 clamp로 크기가 달라진다. px로 고정하면 따라가지 못한다. */
    const batter=css.split('.golden-actor.sprite-batter .actor-ground{')[1].split('}')[0];
    const pitcher=css.split('.golden-actor.sprite-pitcher .actor-ground{')[1].split('}')[0];
    for(const block of [batter,pitcher]){
      expect(block).toMatch(/width:\d+(\.\d+)?%/);
      expect(block).toMatch(/height:\d+(\.\d+)?%/);
      expect(block).not.toMatch(/width:\d+px/);
      expect(block).not.toMatch(/height:\d+px/);
    }
  });

  it('keeps both ground sheets as crisp pixel art with at least three dirt shades',()=>{
    for(const svg of [plate,mound]){
      expect(svg).toContain('shape-rendering="crispEdges"');
      expect(svg.trim().endsWith('</svg>')).toBe(true);
      expect(dirtShades(svg)).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps the plate sheet cropped to the far half the arena floor actually shows',()=>{
    /* 타자 발은 경기장 바닥에서 약 7px 위다. 앞쪽 흙은 화면 밖이라 viewBox가 먼 쪽만 담는다. */
    expect(plate).toContain('viewBox="0 9 160 19"');
  });

  it('keeps the pitching rubber on the lit top face of the mound',()=>{
    /* 상단면은 y6~13이다. 투수판이 그 밖으로 나가면 투수가 마운드 옆에 선 것처럼 보인다. */
    const rubber=mound.match(/<rect class="r"\s+x="\d+" y="(\d+)"/);
    expect(rubber).not.toBeNull();
    const y=Number(rubber[1]);
    expect(y).toBeGreaterThanOrEqual(6);
    expect(y).toBeLessThanOrEqual(13);
  });
});
