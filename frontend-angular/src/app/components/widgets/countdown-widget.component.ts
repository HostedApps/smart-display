import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-countdown-widget',
  template: `
    <div class="countdown-card">
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
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(168, 85, 247, 0.1));
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 16px;
      backdrop-filter: blur(8px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      overflow: hidden;
    }
    .emoji-badge {
      font-size: 2.2rem;
      margin-bottom: 4px;
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
    }
    .event-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 10px 0;
      letter-spacing: 0.2px;
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
      background: rgba(0, 0, 0, 0.35);
      border-radius: 6px;
      padding: 4px 8px;
      min-width: 38px;
    }
    .num {
      font-size: 1.25rem;
      font-weight: 700;
      color: #38bdf8;
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
    }
    .label {
      font-size: 0.6rem;
      text-transform: uppercase;
      opacity: 0.7;
      letter-spacing: 0.5px;
    }
    .time-sep {
      font-size: 1.1rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.4);
      margin-bottom: 12px;
    }
    .celebration-box {
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid #10b981;
      padding: 8px 16px;
      border-radius: 8px;
      margin-bottom: 6px;
    }
    .celeb-text {
      font-weight: 700;
      color: #34d399;
      font-size: 1rem;
    }
    .target-date-sub {
      font-size: 0.7rem;
      opacity: 0.6;
    }
  `]
})
export class CountdownWidgetComponent implements OnInit, OnDestroy {
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
    this.timerSub = interval(1000).subscribe(() => this.updateCountdown());
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
