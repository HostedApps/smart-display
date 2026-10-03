import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Observable, Subject, share } from 'rxjs';

/**
 * One shared, second-aligned clock for the whole app.
 *
 * Widgets used to run their own setInterval(1000) each; every one of those ticks
 * triggered a full change-detection pass, so six clocks meant six passes per second.
 * This service runs a single timer outside Angular and re-enters the zone once per
 * tick, so all subscribers update together in one pass.
 */
@Injectable({ providedIn: 'root' })
export class ClockService implements OnDestroy {
  private readonly tickSubject = new Subject<Date>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private subscribers = 0;

  /** Emits the current time at the start of every second while anyone is subscribed. */
  readonly tick$: Observable<Date> = new Observable<Date>(observer => {
    const sub = this.tickSubject.subscribe(observer);
    if (this.subscribers++ === 0) this.start();
    return () => {
      sub.unsubscribe();
      if (--this.subscribers === 0) this.stop();
    };
  }).pipe(share());

  constructor(private zone: NgZone) {}

  private start(): void {
    this.zone.runOutsideAngular(() => this.schedule());
  }

  private schedule(): void {
    // Align to the next whole second so every clock flips at the same moment
    const delay = 1000 - (Date.now() % 1000) + 5;
    this.timer = setTimeout(() => {
      this.zone.run(() => this.tickSubject.next(new Date()));
      this.schedule();
    }, delay);
  }

  private stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
