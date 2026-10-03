import { NextEventSnapshot, WeatherSnapshot } from '../services/widget-bus.service';

export interface TemplateContext {
  now: Date;
  weather?: WeatherSnapshot;
  nextEvent?: NextEventSnapshot | null;
  locale?: string;
}

/** Placeholders users can type into text widgets, shown in the editor as help */
export const TEXT_PLACEHOLDERS: { token: string; example: string }[] = [
  { token: '{{time}}', example: '7:45 AM' },
  { token: '{{date}}', example: 'Saturday, October 3' },
  { token: '{{day}}', example: 'Saturday' },
  { token: '{{greeting}}', example: 'Good morning' },
  { token: '{{weather.temp}}', example: '72°' },
  { token: '{{weather.condition}}', example: 'Partly cloudy' },
  { token: '{{weather.high}}', example: '78°' },
  { token: '{{weather.city}}', example: 'San Jose' },
  { token: '{{next_event.title}}', example: 'Soccer practice' },
  { token: '{{next_event.time}}', example: '4:30 PM' },
  { token: '{{next_event.when}}', example: 'in 2 h' }
];

/** True if the text contains at least one {{placeholder}} */
export function hasPlaceholders(text: string | null | undefined): boolean {
  return !!text && /\{\{\s*[\w.]+\s*\}\}/.test(text);
}

/**
 * Replaces {{placeholders}} with live values. Unknown names are left untouched so typos are
 * visible; known names with no data yet render as "—". Output is plain text (caller escapes).
 */
export function renderTemplate(text: string, ctx: TemplateContext): string {
  const locale = ctx.locale || undefined;
  const deg = (n?: number) => (typeof n === 'number' && Number.isFinite(n) ? `${Math.round(n)}°` : '—');
  const hour = ctx.now.getHours();
  const ev = ctx.nextEvent || null;
  const values: Record<string, () => string> = {
    'time': () => ctx.now.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }),
    'date': () => ctx.now.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' }),
    'day': () => ctx.now.toLocaleDateString(locale, { weekday: 'long' }),
    'greeting': () => hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 22 ? 'Good evening' : 'Good night',
    'weather.temp': () => deg(ctx.weather?.temp),
    'weather.condition': () => ctx.weather?.condition || '—',
    'weather.high': () => deg(ctx.weather?.high),
    'weather.city': () => ctx.weather?.city || '—',
    'next_event.title': () => ev?.title || 'Nothing scheduled',
    'next_event.time': () => ev ? (ev.allDay ? 'All day' : new Date(ev.start).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })) : '—',
    'next_event.when': () => ev ? relativeFromNow(ev.start, ctx.now) : '—'
  };
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, name: string) => {
    const fn = values[name.toLowerCase()];
    return fn ? fn() : match;
  });
}

function relativeFromNow(ms: number, now: Date): string {
  const min = Math.round((ms - now.getTime()) / 60000);
  if (min <= 0) return 'now';
  if (min < 60) return `in ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `in ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'tomorrow' : `in ${d} days`;
}
