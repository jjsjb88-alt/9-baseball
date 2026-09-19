import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {
  PERF_DPR_CAP,PERF_PARTICLE_SCALE,lowerPerfTier,raisePerfTier,
} from '../src/duel/useAdaptivePerformance.js';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const hook=fs.readFileSync(new URL('../src/duel/useAdaptivePerformance.js',import.meta.url),'utf8');
const arena=fs.readFileSync(new URL('../src/duel/ArenaRenderer2.jsx',import.meta.url),'utf8');
const vfx=fs.readFileSync(new URL('../src/duel/PixelVFX.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/adaptive-performance.css',import.meta.url),'utf8');

describe('adaptive 60fps background budget',()=>{
  it('has three reversible quality tiers',()=>{
    expect(lowerPerfTier('high')).toBe('balanced');
    expect(lowerPerfTier('balanced')).toBe('low');
    expect(lowerPerfTier('low')).toBe('low');
    expect(raisePerfTier('low')).toBe('balanced');
    expect(raisePerfTier('balanced')).toBe('high');
    expect(raisePerfTier('high')).toBe('high');
  });

  it('reduces WebGL pixel cost substantially before touching actors',()=>{
    expect(PERF_DPR_CAP).toEqual({high:2,balanced:1.25,low:1});
    expect(PERF_DPR_CAP.low).toBeLessThan(PERF_DPR_CAP.high);
    expect(arena).toContain('PERF_DPR_CAP[quality]');
    expect(arena).toContain("quality='high'");
    expect(arena).toContain('canvas.dataset.quality=quality');
  });

  it('reduces only noncritical VFX density',()=>{
    expect(PERF_PARTICLE_SCALE.high).toBe(1);
    expect(PERF_PARTICLE_SCALE.balanced).toBeLessThan(1);
    expect(PERF_PARTICLE_SCALE.low).toBeLessThan(PERF_PARTICLE_SCALE.balanced);
    expect(vfx).toContain('buildParticles(seed,shot,quality)');
    expect(vfx).toContain("quality='high'");
  });

  it('reacts only to sustained frame pressure, not a single long task',()=>{
    expect(hook).toContain('dt>=7&&dt<=50');
    expect(hook).toContain('ema>20.5');
    expect(hook).toContain('badMs>=720');
    expect(hook).toContain('goodMs>=6000');
    expect(hook).toContain("document.visibilityState!=='hidden'");
  });

  it('integrates quality into background renderers but never V4CanvasSprite',()=>{
    expect(app).toContain('useAdaptivePerformance(!!(showBattle&&isV10))');
    expect(app).toContain('data-perf-tier={perfTier}');
    expect(app).toContain('label="실전 WebGL 경기장" quality={perfTier}');
    expect(app).toContain('drawCore={false} quality={perfTier}');
    expect(app).not.toContain('V4CanvasSprite sheet={v4Sheet} who={who} shot={shot} playToken={playToken} quality=');
  });

  it('removes expensive decorative filters progressively',()=>{
    expect(css).toContain('.duel-combat.perf-balanced');
    expect(css).toContain('.duel-combat.perf-low');
    expect(css).toContain('.perf-low .gm-haze-band');
    expect(css).toContain('.perf-low .gm-atmosphere>i:nth-child(n+5)');
    expect(css).not.toContain('.duel-sprite');
    expect(css).not.toContain('.v4-canvas');
  });
});
