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
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(168, 85, 247, 0.12));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 16px;
      backdrop-filter: blur(16px);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
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
      font-size: 1.15rem;
      font-weight: 700;
      color: #ffffff;
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
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 6px 8px;
      min-width: 42px;
    }
    .num {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: 1.35rem;
      font-weight: 700;
      color: #38bdf8;
      line-height: 1;
      font-variant-numeric: tabular-nums;
      text-shadow: 0 0 12px rgba(56, 189, 248, 0.4);
    }
    .label {
      font-size: 0.6rem;
      text-transform: uppercase;
      color: #94a3b8;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    .time-sep {
      font-size: 1.2rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.3);
      margin-bottom: 12px;
    }
    .celebration-box {
      background: rgba(16, 185, 129, 0.25);
      border: 1px solid #10b981;
      padding: 8px 16px;
      border-radius: 10px;
      margin-bottom: 6px;
    }
    .celeb-text {
      font-weight: 700;
      color: #34d399;
      font-size: 1rem;
    }
    .target-date-sub {
      font-size: 0.7rem;
      color: #94a3b8;
      font-weight: 500;
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
