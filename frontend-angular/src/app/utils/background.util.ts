import { DisplayBackground } from '../models/display.model';

/** The wallpaper "Curated Wallpaper" shows (the setting has no URL field of its own) */
export const CURATED_WALLPAPER_URL = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1920&q=80';

const isWebUrl = (v: unknown): v is string => typeof v === 'string' && /^(https?:)?\/\//i.test(v.trim());

/**
 * The picture a display background shows, or null. Shared by the editor canvas and the kiosk
 * viewer so the screen always shows what the editor previewed.
 */
export function backgroundImageUrl(bg: DisplayBackground | null | undefined): string | null {
  if (!bg) return null;
  if (bg.type === 'image') {
    const v = (bg.value || '').trim();
    return v ? v : null;
  }
  if (bg.type === 'unsplash') {
    // value may still hold a colour from a previous type; only a real URL overrides the default
    return isWebUrl(bg.value) ? bg.value.trim() : CURATED_WALLPAPER_URL;
  }
  return null;
}

/** CSS `background` for colour and gradient backgrounds, or null */
export function backgroundCss(bg: DisplayBackground | null | undefined): string | null {
  if (!bg || (bg.type !== 'color' && bg.type !== 'gradient')) return null;
  const v = (bg.value || '').trim();
  return v || null;
}

/** A quoted CSS url() so URLs with spaces or brackets still load */
export function cssUrl(url: string): string {
  return `url("${url.replace(/["\\\n\r]/g, c => encodeURIComponent(c))}")`;
}
