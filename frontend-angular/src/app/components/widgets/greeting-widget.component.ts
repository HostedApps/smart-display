import { Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ClockService } from '../../services/clock.service';
import { NextEventSnapshot, WeatherSnapshot, WidgetBusService } from '../../services/widget-bus.service';

export interface GreetingConfig {
  /** Comma-separated names, rotated one per message (e.g. "Emma, Lucas"); empty = no name */
  names?: string;
  /** Extra lines, one per line, mixed into the rotation */
  customMessages?: string;
  /** 'mixed' (built-in + weather/event-aware + custom) or 'custom_only' */
  mode?: 'mixed' | 'custom_only';
  /** Seconds between messages (default 30, min 10) */
  rotateSeconds?: number;
  align?: 'left' | 'center' | 'right';
  /** Show the smaller compliment line under the greeting (default true) */
  showSubline?: boolean;
}

type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

const GREETINGS: Record<DayPart, string> = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
  night: 'Good night'
};

const COMPLIMENTS: Record<DayPart, string[]> = {
  morning: [
    'Today is full of possibilities.',
    'You look ready to take on the day.',
    'A fresh start — make it a good one.',
    'Rise and shine, you\'ve got this.',
    'Coffee first, then conquer the world.',
    'Something good is going to happen today.'
  ],
  afternoon: [
    'Hope your day is going well.',
    'Keep up the great work.',
    'You\'re doing better than you think.',
    'Time for a little break and a big smile.',
    'Halfway there — keep that momentum.',
    'Don\'t forget to drink some water.'
  ],
  evening: [
    'You made it through another day.',
    'Time to unwind and relax.',
    'Hope you had a wonderful day.',
    'Be proud of what you did today.',
    'Enjoy a cozy evening at home.',
    'Good things are worth slowing down for.'
  ],
  night: [
    'Sweet dreams.',
    'Rest well — tomorrow is a new day.',
    'Time to recharge.',
    'The stars are out. So should the lights be.',
    'Sleep tight.',
    'Tomorrow will be great, too.'
  ]
};

const FADE_TICKS = 1;

@Component({
  selector: 'app-greeting-widget',
  template: `
    <div class="greeting-card sd-card" [ngClass]="'align-' + align">
      <div class="greeting-body" [class.faded]="fading">
        <div class="greeting-line">{{ greeting }}</div>
        <div class="sub-line" *ngIf="showSubline && subline">{{ subline }}</div>
      </div>
    </div>
  `,
  styles: [`
    .greeting-card {
      height: 100%;
      box-sizing: border-box;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }
    .greeting-body {
      display: flex;
      flex-direction: column;
      gap: 0.35em;
      opacity: 1;
      transition: opacity 0.8s ease;
    }
    .greeting-body.faded {
      opacity: 0;
    }
    .align-left { text-align: left; }
    .align-left .greeting-body { align-items: flex-start; }
    .align-center { text-align: center; }
    .align-center .greeting-body { align-items: center; }
    .align-right { text-align: right; }
    .align-right .greeting-body { align-items: flex-end; }
    .greeting-line {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: var(--sd-fs-xl);
      font-weight: var(--sd-weight-display);
      line-height: 1.1;
      letter-spacing: -0.5px;
      color: var(--sd-text);
      text-shadow: var(--sd-text-shadow);
      text-wrap: balance;
      overflow-wrap: anywhere;
    }
    .sub-line {
      font-size: var(--sd-fs-title);
      font-weight: 400;
      line-height: 1.35;
      color: var(--sd-text-muted);
      text-shadow: var(--sd-text-shadow);
      text-wrap: balance;
      overflow-wrap: anywhere;
    }
    @media (prefers-reduced-motion: reduce) {
      .greeting-body { transition: none; }
      .greeting-body.faded { opacity: 1; }
    }
  `]
})
export class GreetingWidgetComponent implements OnInit, OnChanges, OnDestroy {
  @Input() config: GreetingConfig = {};

  greeting = '';
  subline = '';
  fading = false;

  private weather: WeatherSnapshot | null = null;
  private nextEvent: NextEventSnapshot | null = null;
  private subs = new Subscription();
  private step = 0;
  private ticksSinceRotate = 0;
  private fadeTicksLeft = 0;
  private lastSubline = '';
  private ready = false;

  constructor(private clock: ClockService, private bus: WidgetBusService) {}

  get align(): 'left' | 'center' | 'right' {
    const a = this.config?.align;
    return a === 'left' || a === 'right' ? a : 'center';
  }

  get showSubline(): boolean {
    return this.config?.showSubline !== false;
  }

  private get rotateSeconds(): number {
    const n = Number(this.config?.rotateSeconds);
    return Number.isFinite(n) && n > 0 ? Math.max(10, Math.round(n)) : 30;
  }

  ngOnInit(): void {
    this.subs.add(this.bus.select('weather').subscribe(w => {
      const first = !this.weather;
      this.weather = w;
      // Show weather-aware content promptly the first time it arrives
      if (first && this.ready && !this.fading) this.render();
    }));
    this.subs.add(this.bus.select('nextEvent').subscribe(e => (this.nextEvent = e)));
    this.subs.add(this.clock.tick$.subscribe(() => this.onTick()));
    this.render();
    this.ready = true;
  }

  ngOnChanges(): void {
    this.ticksSinceRotate = 0;
    this.render();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private onTick(): void {
    if (this.fading) {
      if (--this.fadeTicksLeft <= 0) {
        this.step++;
        this.render();
        this.fading = false;
      }
      return;
    }
    if (++this.ticksSinceRotate >= this.rotateSeconds) {
      this.ticksSinceRotate = 0;
      if (this.prefersReducedMotion()) {
        this.step++;
        this.render();
      } else {
        this.fading = true;
        this.fadeTicksLeft = FADE_TICKS;
      }
    }
  }

  private render(): void {
    const now = new Date();
    const part = this.dayPart(now.getHours());
    const names = this.names();
    const name = names.length ? names[this.step % names.length] : '';
    this.greeting = name ? `${GREETINGS[part]}, ${name}` : GREETINGS[part];
    this.subline = this.pickSubline(part, now);
    this.lastSubline = this.subline;
  }

  private dayPart(h: number): DayPart {
    if (h >= 5 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 22) return 'evening';
    return 'night';
  }

  private names(): string[] {
    return (this.config?.names || '').split(',').map(s => s.trim()).filter(Boolean);
  }

  private customLines(): string[] {
    return (this.config?.customMessages || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  }

  private pickSubline(part: DayPart, now: Date): string {
    const custom = this.customLines();
    let pool: string[];
    let contextual: string[] = [];

    if (this.config?.mode === 'custom_only' && custom.length) {
      pool = custom;
    } else {
      contextual = [...this.eventLines(now), ...this.weatherLines()];
      pool = [...COMPLIMENTS[part], ...custom];
    }

    // Every other message shows something about right now (event / weather), when available
    const source = contextual.length && this.step % 2 === 0 ? contextual : pool;
    return this.pick(source, now);
  }

  /** Deterministic for a given step and day; never repeats the previous line if there's a choice */
  private pick(list: string[], now: Date): string {
    if (!list.length) return '';
    const seed = now.getFullYear() * 1000 + now.getMonth() * 40 + now.getDate();
    let idx = this.hash(seed * 31 + this.step) % list.length;
    if (list.length > 1 && list[idx] === this.lastSubline) idx = (idx + 1) % list.length;
    return list[idx];
  }

  private hash(n: number): number {
    let x = (n | 0) ^ 0x9e3779b9;
    x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    return (x ^ (x >>> 16)) >>> 0;
  }

  private eventLines(now: Date): string[] {
    const e = this.nextEvent;
    if (!e || e.allDay || !e.title) return [];
    const diff = e.start - now.getTime();
    if (diff < 0 || diff > 2 * 60 * 60 * 1000) return [];
    const time = new Date(e.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return [`Next up: ${e.title} at ${time}`];
  }

  private weatherLines(): string[] {
    const w = this.weather;
    if (!w) return [];
    const metric = w.units === 'metric';
    const t = Number(w.temp);
    const hasTemp = Number.isFinite(t);
    const hot = hasTemp && t >= (metric ? 29 : 85);
    const warm = hasTemp && t >= (metric ? 21 : 70);
    const freezing = hasTemp && t <= (metric ? 0 : 32);
    const cold = hasTemp && t <= (metric ? 5 : 41);
    const lines: string[] = [];

    switch (w.kind) {
      case 'rain':
        lines.push('Grab an umbrella — it\'s wet out there.');
        break;
      case 'snow':
        lines.push('Snow day vibes. Bundle up!');
        break;
      case 'storm':
        lines.push('Stormy outside — a perfect excuse to stay cozy.');
        break;
      case 'fog':
        lines.push('Foggy out there. Take it slow on the road.');
        break;
      case 'clear':
        if (hot) lines.push('Sunny and hot — stay hydrated!');
        else if (warm) lines.push('Beautiful weather today. Get some sunshine!');
        else lines.push('Clear skies ahead.');
        break;
      case 'cloudy':
        lines.push('A little cloudy, but you\'re the bright spot.');
        break;
    }
    if (freezing) lines.push('It\'s freezing — wear your warmest coat.');
    else if (cold) lines.push('Chilly out there. Don\'t forget a jacket.');
    else if (hot && w.kind !== 'clear') lines.push('It\'s a hot one — stay cool.');
    return lines;
  }

  private prefersReducedMotion(): boolean {
    try {
      return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }
}
