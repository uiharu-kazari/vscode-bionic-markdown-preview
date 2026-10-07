import { describe, it, expect } from 'vitest';
import { normalizeSettings } from './previewSettings';

describe('reading settings validation', () => {
  it('defaults malformed, nonfinite, and unknown values safely', () => {
    expect(normalizeSettings({ fontSize: NaN, opacity: Infinity, gradientTheme: "none';alert(1)//" })).toEqual({
      fixationPoint: 3, opacity: 0.7, gradientTheme: 'none', fontSize: 16, lineHeight: 1.8,
    });
  });
  it('clamps all settings to the documented ranges', () => {
    expect(normalizeSettings({fixationPoint: 9, opacity: -1, fontSize: 100, lineHeight: 0})).toMatchObject({
      fixationPoint: 5, opacity: 0.1, fontSize: 32, lineHeight: 1,
    });
  });
});
