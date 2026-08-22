import { Component, Input, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-clock-widget',
  template: `
    <div class="clock-container">
      <div class="time">{{ currentTime | date:(config.format || 'hh:mm:ss a') }}</div>
      <div class="date" *ngIf="config.showDate">{{ currentTime | date:'fullDate' }}</div>
    </div>
  `,
  styles: [`
    .clock-container { display: flex; flex-direction: column; justify-content: center; height: 100%; }
    .time { font-size: 3.5rem; font-weight: 700; letter-spacing: -1px; line-height: 1; }
    .date { font-size: 1.2rem; opacity: 0.75; margin-top: 8px; }
  `]
})
export class ClockWidgetComponent implements OnInit, OnDestroy {
  @Input() config: any = { showDate: true };
  currentTime: Date = new Date();
  private timerId: any;

  ngOnInit(): void {
    this.timerId = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerId) clearInterval(this.timerId);
  }
}
