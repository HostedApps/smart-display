import { DisplayBackground } from '../models/display.model';
import { backgroundCss, backgroundImageUrl, CURATED_WALLPAPER_URL, cssUrl } from './background.util';

const bg = (type: DisplayBackground['type'], value = ''): DisplayBackground => ({ type, value });

describe('Display background (editor and screen show the same thing)', () => {
  it('Curated Wallpaper shows the curated picture even though it has no URL field', () => {
    expect(backgroundImageUrl(bg('unsplash'))).toBe(CURATED_WALLPAPER_URL);
  });

  it('a colour left over from a previous background type does not black out the wallpaper', () => {
    expect(backgroundImageUrl(bg('unsplash', '#0f172a'))).toBe(CURATED_WALLPAPER_URL);
    expect(backgroundImageUrl(bg('unsplash', 'https://example.com/a.jpg'))).toBe('https://example.com/a.jpg');
  });

  it('custom image needs a URL; colours and gradients use their value', () => {
    expect(backgroundImageUrl(bg('image', 'https://example.com/b.jpg'))).toBe('https://example.com/b.jpg');
    expect(backgroundImageUrl(bg('image', '  '))).toBeNull();
    expect(backgroundImageUrl(bg('color', '#000'))).toBeNull();
    expect(backgroundCss(bg('color', '#112233'))).toBe('#112233');
    expect(backgroundCss(bg('gradient', 'linear-gradient(#000, #fff)'))).toBe('linear-gradient(#000, #fff)');
    expect(backgroundCss(bg('unsplash'))).toBeNull();
    expect(backgroundImageUrl(undefined)).toBeNull();
  });

  it('quotes URLs for CSS', () => {
    expect(cssUrl('https://x.test/a b(1).jpg')).toBe('url("https://x.test/a b(1).jpg")');
    expect(cssUrl('https://x.test/"x')).toBe('url("https://x.test/%22x")');
  });
});
