import { ConfigOption } from './widget-config-schema';
import { cssUrl } from '../../utils/background.util';

/**
 * Decorative frames for the Photos widget (Diwali, Christmas, …), drawn over the slideshow.
 *
 * A frame is made of up to three layers, all static SVG (nothing animates, so it costs a
 * Raspberry Pi nothing after the first paint):
 *  - band:      a 90×90 nine-slice image used as `border-image` (slice 30). The 30×30 corners stay
 *               put and the edge segments repeat, so the frame never stretches at any widget size.
 *  - toran:     an optional garland strip that repeats along the top, just inside the band.
 *  - ornaments: optional pictures pinned to corners (e.g. diyas).
 *
 * Adding a festival = add one entry to PHOTO_FRAMES. The settings dropdown and the widget pick it up.
 */

export type FrameOrnamentPosition = 'tl' | 'tr' | 'bl' | 'br' | 'bc';

export interface PhotoFrameTheme {
  id: string;
  label: string;
  /** CSS url() of the 90×90 nine-slice band */
  band: string;
  /** Solid colour painted under the band, so hairline gaps between its tiles never show */
  bandColor: string;
  /** CSS url() of the garland tile (repeats horizontally) */
  toran?: string;
  ornaments?: { at: FrameOrnamentPosition; image: string }[];
}

const svgUrl = (w: number, h: number, body: string): string =>
  cssUrl('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`));

/** The four edge-tile centres and corner centres of the 90×90 band */
const EDGES = [[45, 15], [45, 75], [15, 45], [75, 45]];
const CORNERS = [[15, 15], [75, 15], [15, 75], [75, 75]];
/** Seam points: drawn on the slice lines so neighbouring tiles join into whole shapes */
const SEAMS = [[30, 15], [60, 15], [30, 75], [60, 75], [15, 30], [15, 60], [75, 30], [75, 60]];

function band(opts: {
  bg: string; line: string;
  edge: (x: number, y: number) => string;
  corner: (x: number, y: number) => string;
  seam?: (x: number, y: number) => string;
}): string {
  const at = (pts: number[][], f?: (x: number, y: number) => string) => f ? pts.map(([x, y]) => f(x, y)).join('') : '';
  return svgUrl(90, 90,
    `<path d="M0 0H90V90H0Z M30 30V60H60V30Z" fill="${opts.bg}" fill-rule="evenodd"/>` +
    `<rect x="4" y="4" width="82" height="82" fill="none" stroke="${opts.line}" stroke-width="2"/>` +
    `<rect x="26" y="26" width="38" height="38" fill="none" stroke="${opts.line}" stroke-width="1.4"/>` +
    at(SEAMS, opts.seam) + at(EDGES, opts.edge) + at(CORNERS, opts.corner));
}

const diamond = (x: number, y: number, r: number, fill: string) =>
  `<path d="M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}Z" fill="${fill}"/>`;
const dot = (x: number, y: number, r: number, fill: string) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;

function flower(x: number, y: number, petals: string[], centre: string): string {
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += `<ellipse cx="${x}" cy="${y - 6}" rx="2.6" ry="5" fill="${petals[i % petals.length]}" transform="rotate(${i * 45} ${x} ${y})"/>`;
  }
  return out + dot(x, y, 2.6, centre);
}

function star(x: number, y: number, r: number, fill: string): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(x + rad * Math.cos(a)).toFixed(1)},${(y + rad * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`;
}

/* ---------------- Diwali ---------------- */

const DIWALI_GOLD = '#f5c542';
const DIWALI_BG = '#8b1538';

/** Marigold string with a hanging mango leaf — the toran over a doorway */
const DIWALI_TORAN = svgUrl(40, 40,
  `<path d="M0 3Q20 14 40 3" fill="none" stroke="#9a3412" stroke-width="1.4"/>` +
  `<path d="M10 7v9M30 7v9" stroke="#9a3412" stroke-width="1"/>` +
  `<path d="M20 11C25 18 23 27 20 33C17 27 15 18 20 11Z" fill="#15803d"/>` +
  `<path d="M20 12V31" stroke="#4ade80" stroke-width="0.8"/>` +
  [[0, 3, '#f97316'], [10, 7.1, '#facc15'], [20, 8.5, '#f97316'], [30, 7.1, '#facc15'], [40, 3, '#f97316']]
    .map(([x, y, c]) => dot(+x, +y, 4.2, String(c)) + dot(+x, +y, 2, '#fde68a')).join('') +
  dot(10, 18, 3, '#f97316') + dot(30, 18, 3, '#f97316'));

/** Clay oil lamp with a glowing flame */
const DIYA = svgUrl(64, 64,
  `<defs>` +
  `<radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffd27a" stop-opacity=".75"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7c2"/><stop offset=".6" stop-color="#ffc233"/><stop offset="1" stop-color="#ff7a00"/></linearGradient>` +
  `<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c2410c"/><stop offset="1" stop-color="#7c2d12"/></linearGradient>` +
  `</defs>` +
  `<circle cx="32" cy="22" r="20" fill="url(#g)"/>` +
  `<path d="M32 6C38 16 38 25 32 30C26 25 26 16 32 6Z" fill="url(#f)"/>` +
  `<path d="M32 17C34 22 34 26 32 28C30 26 30 22 32 17Z" fill="#fffbe6"/>` +
  `<path d="M32 30v4" stroke="#3f1d0b" stroke-width="1.5"/>` +
  `<path d="M8 34Q32 62 56 34Q32 40 8 34Z" fill="url(#b)"/>` +
  `<ellipse cx="32" cy="34.5" rx="24" ry="3.6" fill="#9a3412" stroke="${DIWALI_GOLD}" stroke-width="1"/>` +
  dot(20, 43, 1.6, DIWALI_GOLD) + dot(32, 47, 1.6, DIWALI_GOLD) + dot(44, 43, 1.6, DIWALI_GOLD));

/* ---------------- Christmas ---------------- */

const XMAS_LIGHTS = svgUrl(40, 40,
  `<path d="M0 3Q20 14 40 3" fill="none" stroke="#14532d" stroke-width="1.6"/>` +
  [[0, 3, '#ef4444'], [10, 7.1, '#facc15'], [20, 8.5, '#3b82f6'], [30, 7.1, '#22c55e'], [40, 3, '#ef4444']]
    .map(([x, y, c]) => `<rect x="${+x - 1.6}" y="${+y}" width="3.2" height="3" fill="#475569"/>` +
      `<ellipse cx="${x}" cy="${+y + 7}" rx="3" ry="4.4" fill="${c}"/>` +
      `<ellipse cx="${+x - 1}" cy="${+y + 5.6}" rx="0.9" ry="1.6" fill="#fff" opacity=".6"/>`).join(''));

/* ---------------- Registry ---------------- */

export const PHOTO_FRAMES: readonly PhotoFrameTheme[] = [
  {
    id: 'diwali',
    label: 'Diwali (diyas, marigold toran, rangoli)',
    bandColor: DIWALI_BG,
    band: band({
      bg: DIWALI_BG, line: DIWALI_GOLD,
      edge: (x, y) => diamond(x, y, 7, DIWALI_GOLD) + dot(x, y, 2, DIWALI_BG),
      seam: (x, y) => dot(x, y, 1.8, '#fb923c'),
      corner: (x, y) => flower(x, y, ['#fb923c', '#f472b6'], DIWALI_GOLD),
    }),
    toran: DIWALI_TORAN,
    ornaments: [{ at: 'bl', image: DIYA }, { at: 'br', image: DIYA }],
  },
  {
    id: 'christmas',
    label: 'Christmas (lights, stars)',
    bandColor: '#14532d',
    band: band({
      bg: '#14532d', line: '#facc15',
      edge: (x, y) => dot(x - 3, y + 2, 2.4, '#dc2626') + dot(x + 3, y + 2, 2.4, '#dc2626') + dot(x, y - 2.5, 2.4, '#ef4444'),
      seam: (x, y) => dot(x, y, 1.4, '#f8fafc'),
      corner: (x, y) => star(x, y, 9, '#facc15'),
    }),
    toran: XMAS_LIGHTS,
  },
  {
    id: 'gold',
    label: 'Classic gold',
    bandColor: '#2a2113',
    band: band({
      bg: '#2a2113', line: '#d4a937',
      edge: (x, y) => diamond(x, y, 4, '#d4a937'),
      seam: (x, y) => dot(x, y, 1.2, '#d4a937'),
      corner: (x, y) => diamond(x, y, 6, '#d4a937') + dot(x, y, 2, '#2a2113'),
    }),
  },
];

/** Dropdown options for the Photos widget settings */
export const PHOTO_FRAME_OPTIONS: ConfigOption[] = [
  { value: 'none', label: 'None' },
  ...PHOTO_FRAMES.map(f => ({ value: f.id, label: f.label })),
];

/** The frame for a config value, or null for none / unknown ids (e.g. a theme removed later) */
export function photoFrame(id: string | null | undefined): PhotoFrameTheme | null {
  return (id && PHOTO_FRAMES.find(f => f.id === id)) || null;
}
