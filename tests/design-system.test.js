import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIT=path.join(ROOT, 'docs/design/v12/audit-static-and-engine.mjs');

// Historical P0-4 observation after tokens.css was added.
// Keep this as evidence of the starting point. Do not turn these numbers into
// pass/fail migration thresholds and do not rewrite them merely to match later work.
const RECORDED_P0_STATIC = Object.freeze({
  files: 22,
  newlines: 5332,
  importantOccurrences: 2266,
  importantLines: 1024,
  colorOccurrences: 2513,
  distinctColorStrings: 2107,
  fixedPxFontSizesBelow11: 433,
  fixedPxFontSizesBelow12: 493,
});

function readCurrentStaticAudit() {
  const output=execFileSync(process.execPath, [AUDIT], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return JSON.parse(output).static;
}

describe('V12 P0-4 design-system baseline scaffold', () => {
  it('records current CSS source metrics without enforcing migration thresholds', () => {
    const current=readCurrentStaticAudit();

    // This output is diagnostic evidence only. Deliberately no equality,
    // maximum, minimum, regression budget, or "must decrease" assertion.
    console.info('[V12 P0-4 design-system baseline]', JSON.stringify({
      recorded: RECORDED_P0_STATIC,
      current,
    }));

    // Only keep the recorder itself healthy: the shared audit must keep
    // returning the documented metric schema as finite, non-negative counts.
    expect(Object.keys(current).sort()).toEqual(Object.keys(RECORDED_P0_STATIC).sort());
    for (const value of Object.values(current)) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }

    // Mathematical relationships, not product-quality thresholds.
    expect(current.importantLines).toBeLessThanOrEqual(current.importantOccurrences);
    expect(current.distinctColorStrings).toBeLessThanOrEqual(current.colorOccurrences);
    expect(current.fixedPxFontSizesBelow11).toBeLessThanOrEqual(current.fixedPxFontSizesBelow12);
  });
});
