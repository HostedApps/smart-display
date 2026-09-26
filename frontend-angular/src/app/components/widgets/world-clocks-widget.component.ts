import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';

interface ClockEntry {
  label: string;
  timezone: string;
  time: string;
}

@Component({
  selector: 'app-world-clocks-widget',
  template: `
    <div class="world-clocks-card">
      <div class="clocks-header">
        <div class="header-badge">
          <svg class="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span class="header-title">WORLD CLOCKS</span>
        </div>
      </div>

      <div class="clocks-list">
        <div *ngFor="let clock of clockItems" class="clock-row">
          <div class="clock-left">
            <span class="clock-dot"></span>
            <span class="clock-label">{{ clock.label }}</span>
          </div>
          <span class="clock-time">{{ clock.time }}</span>
        </div>

        <div *ngIf="clockItems.length === 0" class="no-clocks">
          <span>No timezones configured</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .world-clocks-card {
      height: 100%;
      box-sizing: border-box;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
      color: #ffffff;
    }

    .clocks-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
      flex-shrink: 0;
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 4px 10px;
      border-radius: 20px;
    }

    .header-icon {
      width: 14px;
      height: 14px;
      color: var(--accent-cyan, #06b6d4);
    }

    .header-title {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #e2e8f0;
    }

    .clocks-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
      overflow-y: auto;
      justify-content: space-evenly;
    }

    .clock-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      transition: background 0.15s ease;
    }

    .clock-row:hover {
      background: rgba(255, 255, 255, 0.07);
    }

    .clock-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .clock-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-cyan, #06b6d4);
      box-shadow: 0 0 6px var(--accent-cyan, #06b6d4);
      flex-shrink: 0;
    }

    .clock-label {
      font-family: var(--font-main, sans-serif);
      font-size: 0.95rem;
      font-weight: 500;
      color: #f1f5f9;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .clock-time {
      font-family: var(--font-display, 'Outfit', monospace);
      font-size: 1.15rem;
      font-weight: 600;
      color: #ffffff;
      letter-spacing: 0.5px;
      font-variant-numeric: tabular-nums;
      text-shadow: 0 0 12px rgba(255, 255, 255, 0.2);
      flex-shrink: 0;
      margin-left: 12px;
    }

    .no-clocks {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #94a3b8;
      font-size: 0.9rem;
      font-style: italic;
    }

    /* Custom scrollbar */
    .clocks-list::-webkit-scrollbar {
      width: 4px;
    }
    .clocks-list::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;
    }
  `]
})
export class WorldClocksWidgetComponent implements OnInit, OnChanges, OnDestroy {
  @Input() config: any = {
    clocks: [
      { label: 'New York', timezone: 'America/New_York' },
      { label: 'London', timezone: 'Europe/London' },
      { label: 'Tokyo', timezone: 'Asia/Tokyo' }
    ]
  };

  clockItems: ClockEntry[] = [];
  private timerId: any;

  ngOnInit(): void {
    this.updateClocks();
    this.timerId = setInterval(() => {
      this.updateClocks();
    }, 1000);
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.updateClocks();
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  private updateClocks(): void {
    const rawClocks = this.config?.clocks || [
      { label: 'New York', timezone: 'America/New_York' },
      { label: 'London', timezone: 'Europe/London' },
      { label: 'Tokyo', timezone: 'Asia/Tokyo' }
    ];

    const now = new Date();
    this.clockItems = rawClocks.map((c: any) => {
      const tz = c.timezone || 'UTC';
      let formattedTime = '--:--:--';
      try {
        formattedTime = now.toLocaleTimeString('en-US', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      } catch (err) {
        formattedTime = now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }

      return {
        label: c.label || tz,
        timezone: tz,
        time: formattedTime
      };
    });
  }
}
