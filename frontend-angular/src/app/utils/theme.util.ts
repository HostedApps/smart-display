export type ThemePreset = 'glass' | 'paper' | 'solid' | 'mirror' | 'ambient' | 'contrast';

export interface ThemePresetInfo {
  id: ThemePreset;
  name: string;
  description: string;
  /** Preview swatch colours for the theme picker */
  swatch: { canvas: string; card: string; text: string; accent: string };
}

export const THEME_PRESETS: ThemePresetInfo[] = [
  { id: 'glass', name: 'Glass', description: 'Frosted cards on deep slate (default)', swatch: { canvas: '#080c14', card: '#1b2230', text: '#f8fafc', accent: '#38bdf8' } },
  { id: 'paper', name: 'Paper', description: 'Light, calm and print-like for bright rooms', swatch: { canvas: '#eef2f7', card: '#ffffff', text: '#0f172a', accent: '#0284c7' } },
  { id: 'solid', name: 'Solid', description: 'Opaque cards, no blur — smoothest on Raspberry Pi', swatch: { canvas: '#0b1120', card: '#162033', text: '#f8fafc', accent: '#38bdf8' } },
  { id: 'mirror', name: 'Mirror', description: 'Pure black, no cards, light type — for smart mirrors & OLED', swatch: { canvas: '#000000', card: '#000000', text: '#ffffff', accent: '#e5e5e5' } },
  { id: 'ambient', name: 'Ambient', description: 'Photo-first with soft dark scrims — pair with an image background', swatch: { canvas: '#3b4a5c', card: '#1d2530', text: '#ffffff', accent: '#38bdf8' } },
  { id: 'contrast', name: 'High Contrast', description: 'Maximum legibility with bold outlines', swatch: { canvas: '#000000', card: '#000000', text: '#ffffff', accent: '#ffd60a' } }
];

const LEGACY_THEMES: Record<string, ThemePreset> = {
  dark: 'glass',
  light: 'paper',
  minimal: 'paper',
  oled: 'mirror'
};

/** Maps any stored theme value (including legacy dark/light/oled) to a preset. */
export function resolveTheme(theme?: string | null): ThemePreset {
  if (theme && THEME_PRESETS.some(t => t.id === theme)) {
    return theme as ThemePreset;
  }
  return LEGACY_THEMES[theme || ''] || 'glass';
}

/** Classes a canvas needs so widgets pick up the theme tokens. */
export function themeClasses(theme?: string | null): string[] {
  return ['sd-themed', `sd-theme-${resolveTheme(theme)}`];
}
