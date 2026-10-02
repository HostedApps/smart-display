import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ClockService } from '../../services/clock.service';

@Component({
  selector: 'app-countdown-widget',
  template: `
    <div class="countdown-card sd-card">
      <div class="emoji-badge">{{ config.emoji || '🌴' }}</div>
      
      <h3 class="event-title">{{ config.title || 'Hawaii Vacation' }}</h3>
      
      <div class="time-blocks" *ngIf="!isCompleted; else celebrated">
        <div class="time-block">
          <span class="num">{{ days }}</span>
          <span class="label">Days</span>
        </div>
        <div class="time-sep">:</div>
        <div class="time-block">
          <span class="num">{{ hours }}</span>
          <span class="label">Hours</span>
        </div>
        <div class="time-sep">:</div>
        <div class="time-block">
          <span class="num">{{ minutes }}</span>
          <span class="label">Mins</span>
        </div>
        <div class="time-sep">:</div>
        <div class="time-block">
          <span class="num">{{ seconds }}</span>
          <span class="label">Secs</span>
        </div>
      </div>

      <ng-template #celebrated>
        <div class="celebration-box">
          <span class="celeb-text">🎉 Today is the Day! 🎉</span>
        </div>
      </ng-template>

      <div class="target-date-sub" *ngIf="targetDateObj">
        <span>Target: {{ targetDateObj | date:'mediumDate' }}</span>
      </div>
    </div>
  `,
  styles: [`
    .countdown-card {
      height: 100%;
      box-sizing: border-box;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      overflow: hidden;
      position: relative;
    }
    .emoji-badge {
      font-size: 2.2rem;
      margin-bottom: 2px;
      filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.4));
      animation: float 3s ease-in-out infinite alternate;
    }
    @keyframes float {
      0% { transform: translateY(0px); }
      100% { transform: translateY(-4px); }
    }
    .event-title {
      font-size: var(--sd-fs-title);
      font-weight: 700;
      color: var(--sd-text);
      margin: 0 0 10px 0;
      letter-spacing: -0.2px;
    }
    .time-blocks {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
    }
    .time-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: var(--sd-surface-2);
      border: var(--sd-border);
      border-radius: var(--sd-radius-sm);
      padding: 6px 8px;
      min-width: 42px;
    }
    .num {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: var(--sd-fs-lg);
      font-weight: var(--sd-weight-display);
      color: var(--sd-accent);
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .label {
      font-size: var(--sd-fs-xs);
      text-transform: uppercase;
      color: var(--sd-text-muted);
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    .time-sep {
      font-size: var(--sd-fs-lg);
      font-weight: 700;
      color: var(--sd-text-subtle);
      margin-bottom: 12px;
    }
    .celebration-box {
      background: var(--sd-success-soft);
      border: var(--sd-border-width) solid var(--sd-success);
      padding: 8px 16px;
      border-radius: var(--sd-radius-sm);
      margin-bottom: 6px;
    }
    .celeb-text {
      font-weight: 700;
      color: var(--sd-success);
      font-size: var(--sd-fs-title);
    }
    .target-date-sub {
      font-size: var(--sd-fs-sm);
      color: var(--sd-text-muted);
      font-weight: 500;
    }
  `]
})
export class CountdownWidgetComponent implements OnInit, OnDestroy {
  constructor(private clock: ClockService) {}

  @Input() config: any = {
    targetDate: '2026-12-25',
    title: 'Christmas Vacation',
    emoji: '🎄'
  };

  days: number = 0;
  hours: number = 0;
  minutes: number = 0;
  seconds: number = 0;
  isCompleted: boolean = false;
  targetDateObj?: Date;

  private timerSub?: Subscription;

  ngOnInit(): void {
    this.updateCountdown();
    this.timerSub = this.clock.tick$.subscribe(() => this.updateCountdown());
  }

  private updateCountdown(): void {
    const targetStr = this.config.targetDate || '2026-12-25';
    this.targetDateObj = new Date(targetStr + 'T00:00:00');
    const now = new Date();

    const diffMs = this.targetDateObj.getTime() - now.getTime();

    if (diffMs <= 0) {
      this.isCompleted = true;
      this.days = 0;
      this.hours = 0;
      this.minutes = 0;
      this.seconds = 0;
      return;
    }

    this.isCompleted = false;
    const totalSecs = Math.floor(diffMs / 1000);
    this.days = Math.floor(totalSecs / (3600 * 24));
    this.hours = Math.floor((totalSecs % (3600 * 24)) / 3600);
    this.minutes = Math.floor((totalSecs % 3600) / 60);
    this.seconds = totalSecs % 60;
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
  }
}
