export interface PreviewSettings {
  fixationPoint: number;
  opacity: number;
  gradientTheme: string;
  fontSize: number;
  lineHeight: number;
}

export const GRADIENT_NAMES = ['none', 'ocean', 'sunset', 'forest', 'berry', 'lavender', 'autumn', 'mint', 'twilight', 'coffee', 'monochrome'];

/** Clamp workspace configuration before embedding it in HTML or applying it as CSS. */
export function normalizeSettings(input: Partial<PreviewSettings>): PreviewSettings {
  const number = (value: unknown, fallback: number, min: number, max: number, integer = false) => {
    const safe = typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
    return integer ? Math.round(safe) : safe;
  };
  return {
    fixationPoint: number(input.fixationPoint, 3, 1, 5, true),
    opacity: number(input.opacity, 0.7, 0.1, 1),
    gradientTheme: typeof input.gradientTheme === 'string' && GRADIENT_NAMES.includes(input.gradientTheme) ? input.gradientTheme : 'none',
    fontSize: number(input.fontSize, 16, 10, 32, true),
    lineHeight: number(input.lineHeight, 1.8, 1, 3),
  };
}
