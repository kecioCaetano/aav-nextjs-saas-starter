export const FONT_SCALES = ['normal', 'large', 'extra-large'] as const;

export type FontScale = (typeof FONT_SCALES)[number];

export const DEFAULT_FONT_SCALE: FontScale = 'normal';

export function isFontScale(value: string): value is FontScale {
  return FONT_SCALES.some((scale) => scale === value);
}
