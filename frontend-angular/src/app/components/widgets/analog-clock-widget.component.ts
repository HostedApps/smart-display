import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';

export interface AnalogClockConfig {
  showSeconds?: boolean;
  showNumbers?: boolean;
  accentColor?: string;
}

interface ClockTick {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isMajor: boolean;
}

interface ClockNumber {
  val: number;
  x: number;
  y: number;
}

@Component({
  selector: 'app-analog-clock-widget',
  template: `
    <div class="analog-clock-card">
      <div class="dial-container">
        <svg class="clock-svg" viewBox="0 0 200 200">
          <defs>
            <radialGradient id="faceGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="rgba(30, 41, 59, 0.5)" />
              <stop offset="100%" stop-color="rgba(15, 23, 42, 0.75)" />
            </radialGradient>
            <filter id="dialShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.4" />
            </filter>
          </defs>

          <!-- Outer Dial Face -->
          <circle 
            class="clock-face" 
            cx="100" 
            cy="100" 
            r="90" 
            fill="url(#faceGrad)" 
            stroke="rgba(255, 255, 255, 0.16)" 
            stroke-width="2" 
          />

          <!-- Inner Accent Ring -->
          <circle 
            cx="100" 
            cy="100" 
            r="86" 
            fill="none" 
            stroke="rgba(255, 255, 255, 0.05)" 
            stroke-width="1" 
          />

          <!-- 12 Tick Marks -->
          <g class="tick-marks">
            <line
              *ngFor="let tick of ticks"
              [attr.x1]="tick.x1"
              [attr.y1]="tick.y1"
              [attr.x2]="tick.x2"
              [attr.y2]="tick.y2"
              [attr.stroke]="tick.isMajor ? '#ffffff' : 'rgba(255, 255, 255, 0.45)'"
              [attr.stroke-width]="tick.isMajor ? '2.5' : '1.25'"
              stroke-linecap="round"
            />
          </g>

          <!-- Optional Numbers 1-12 -->
          <g class="clock-numbers" *ngIf="safeConfig.showNumbers">
            <text
              *ngFor="let num of numbers"
              [attr.x]="num.x"
              [attr.y]="num.y"
              class="dial-number"
            >
              {{ num.val }}
            </text>
          </g>

          <!-- Hour Hand (Short, thick) -->
          <line
            class="clock-hand hour-hand"
            x1="100"
            y1="100"
            x2="100"
            y2="54"
            [style.transform]="'rotate(' + hourAngle + 'deg)'"
          />

          <!-- Minute Hand (Longer, thinner) -->
          <line
            class="clock-hand minute-hand"
            x1="100"
            y1="100"
            x2="100"
            y2="30"
            [style.transform]="'rotate(' + minuteAngle + 'deg)'"
          />

          <!-- Second Hand (Thinnest, accent colored) -->
          <line
            *ngIf="safeConfig.showSeconds"
            class="clock-hand second-hand"
            x1="100"
            y1="116"
            x2="100"
            y2="22"
            [attr.stroke]="safeConfig.accentColor"
            [style.transform]="'rotate(' + secondAngle + 'deg)'"
          />

          <!-- Center Pivot Dots -->
          <circle cx="100" cy="100" r="4.5" fill="#ffffff" filter="url(#dialShadow)" />
          <circle 
            *ngIf="safeConfig.showSeconds" 
            cx="100" 
            cy="100" 
            r="2.2" 
            [attr.fill]="safeConfig.accentColor" 
          />
        </svg>
      </div>
    </div>
  `,
  styles: [`
    .analog-clock-card {
      height: 100%;
      box-sizing: border-box;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 12px;
      backdrop-filter: blur(16px);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }

    .dial-container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .clock-svg {
      width: 100%;
      height: 100%;
      max-height: 100%;
      max-width: 100%;
      aspect-ratio: 1 / 1;
      display: block;
      filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.45));
    }

    .dial-number {
      fill: rgba(255, 255, 255, 0.85);
      font-size: 11px;
      font-weight: 600;
      font-family: var(--font-display, 'Outfit', sans-serif);
      text-anchor: middle;
      dominant-baseline: central;
      user-select: none;
    }

    .clock-hand {
      transform-box: view-box;
      transform-origin: center;
      stroke-linecap: round;
      transition: transform 0.05s linear;
    }

    .hour-hand {
      stroke: #ffffff;
      stroke-width: 4.5px;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
    }

    .minute-hand {
      stroke: rgba(255, 255, 255, 0.9);
      stroke-width: 2.75px;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
    }

    .second-hand {
      stroke-width: 1.5px;
      filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.4));
    }
  `]
})
export class AnalogClockWidgetComponent implements OnInit, OnDestroy, OnChanges {
  @Input() config: any = {
    showSeconds: true,
    showNumbers: true,
    accentColor: '#3b82f6'
  };

  hourAngle: number = 0;
  minuteAngle: number = 0;
  secondAngle: number = 0;

  ticks: ClockTick[] = [];
  numbers: ClockNumber[] = [
    { val: 1, x: 134, y: 41 },
    { val: 2, x: 159, y: 66 },
    { val: 3, x: 168, y: 100 },
    { val: 4, x: 159, y: 134 },
    { val: 5, x: 134, y: 159 },
    { val: 6, x: 100, y: 168 },
    { val: 7, x: 66, y: 159 },
    { val: 8, x: 41, y: 134 },
    { val: 9, x: 32, y: 100 },
    { val: 10, x: 41, y: 66 },
    { val: 11, x: 66, y: 41 },
    { val: 12, x: 100, y: 32 }
  ];

  private intervalId: any;

  get safeConfig(): AnalogClockConfig {
    return {
      showSeconds: this.config?.showSeconds !== undefined ? !!this.config.showSeconds : true,
      showNumbers: this.config?.showNumbers !== undefined ? !!this.config.showNumbers : true,
      accentColor: this.config?.accentColor || '#3b82f6'
    };
  }

  ngOnInit(): void {
    this.initTicks();
    this.updateClock();
    this.intervalId = setInterval(() => {
      this.updateClock();
    }, 1000);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.updateClock();
    }
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private initTicks(): void {
    this.ticks = Array.from({ length: 12 }, (_, i) => {
      const angleDeg = i * 30;
      const isMajor = i % 3 === 0;
      const rad = (angleDeg - 90) * (Math.PI / 180);
      const outerR = 86;
      const innerR = isMajor ? 74 : 80;
      return {
        x1: Math.round((100 + outerR * Math.cos(rad)) * 10) / 10,
        y1: Math.round((100 + outerR * Math.sin(rad)) * 10) / 10,
        x2: Math.round((100 + innerR * Math.cos(rad)) * 10) / 10,
        y2: Math.round((100 + innerR * Math.sin(rad)) * 10) / 10,
        isMajor
      };
    });
  }

  private updateClock(): void {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Required formulas:
    // Hour angle: (hours % 12 + minutes/60) * 30
    // Minute angle: (minutes + seconds/60) * 6
    // Second angle: seconds * 6
    this.hourAngle = ((hours % 12) + minutes / 60) * 30;
    this.minuteAngle = (minutes + seconds / 60) * 6;
    this.secondAngle = seconds * 6;
  }
}
