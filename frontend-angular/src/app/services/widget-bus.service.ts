import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';

/** Latest weather published by any weather widget on the screen */
export interface WeatherSnapshot {
  city: string;
  temp: number;
  units: 'imperial' | 'metric';
  condition: string;
  /** Simplified bucket for widgets that react to weather */
  kind: 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog' | 'unknown';
  high?: number;
  low?: number;
  /** Daily forecast, today first: ISO date (yyyy-mm-dd) → summary */
  daily?: { date: string; high: number; low: number; icon?: string; condition?: string }[];
  updatedAt: number;
}

/** Next upcoming calendar event published by a calendar widget */
export interface NextEventSnapshot {
  title: string;
  start: number;
  allDay: boolean;
  feedName?: string;
}

export interface WidgetBusTopics {
  weather: WeatherSnapshot;
  nextEvent: NextEventSnapshot | null;
}

/**
 * Widget event bus (MagicMirror's sendNotification, typed): widgets publish what they know and
 * others react — e.g. a greeting that mentions the rain, or text placeholders like {{weather.temp}}.
 * Values are "latest state" (replayed to late subscribers), scoped to the page/app instance.
 */
@Injectable({ providedIn: 'root' })
export class WidgetBusService {
  private readonly state = new BehaviorSubject<Partial<WidgetBusTopics>>({});

  publish<K extends keyof WidgetBusTopics>(topic: K, value: WidgetBusTopics[K]): void {
    this.state.next({ ...this.state.value, [topic]: value });
  }

  /** Current value, if any widget has published it */
  snapshot<K extends keyof WidgetBusTopics>(topic: K): WidgetBusTopics[K] | undefined {
    return this.state.value[topic] as WidgetBusTopics[K] | undefined;
  }

  /** Emits the latest value now (if any) and on every change */
  select<K extends keyof WidgetBusTopics>(topic: K): Observable<WidgetBusTopics[K]> {
    return this.state.pipe(
      map(s => s[topic] as WidgetBusTopics[K] | undefined),
      filter((v): v is WidgetBusTopics[K] => v !== undefined),
      distinctUntilChanged()
    );
  }
}
