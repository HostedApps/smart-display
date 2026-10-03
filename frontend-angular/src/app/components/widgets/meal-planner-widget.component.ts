import { Component, Inject, Input, OnInit, Optional } from '@angular/core';
import { MealPlanDay } from '../../models/display.model';
import { LIVE_DISPLAY } from './widget-context';

@Component({
  selector: 'app-meal-planner-widget',
  template: `
    <div class="meal-card sd-card">
      <app-sample-badge *ngIf="isLive && showingSample"></app-sample-badge>
      <div class="meal-header">
        <div class="title-wrap">
          <span class="chef-icon">🍽️</span>
          <h3 class="widget-title">{{ config.title || 'Weekly Menu' }}</h3>
        </div>
        <span class="today-tag" *ngIf="!(isLive && showingSample)">Today: {{ todayName }}</span>
      </div>

      <div class="days-list">
        <div 
          *ngFor="let item of weeklyPlan" 
          class="day-row"
          [class.active-today]="item.day.toLowerCase() === todayName.toLowerCase()"
        >
          <div class="day-badge">
            <span class="day-short">{{ item.day.substring(0, 3) }}</span>
          </div>

          <div class="meals-info">
            <div class="meal-slot" *ngIf="item.lunch">
              <span class="slot-label">Lunch</span>
              <span class="slot-text">{{ item.lunch }}</span>
            </div>
            <div class="meal-slot" *ngIf="item.dinner">
              <span class="slot-label">Dinner</span>
              <span class="slot-text">{{ item.dinner }}</span>
            </div>
            <div class="meal-slot empty" *ngIf="!item.lunch && !item.dinner">
              <span class="slot-text">Chef's Choice / Dining Out</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .meal-card {
      position: relative;
      height: 100%;
      box-sizing: border-box;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .meal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: var(--sd-border);
    }
    .title-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .chef-icon {
      font-size: 1rem;
    }
    .widget-title {
      font-size: var(--sd-fs-title);
      font-weight: 600;
      margin: 0;
      color: var(--sd-text);
    }
    .today-tag {
      font-size: var(--sd-fs-xs);
      color: var(--sd-accent);
      font-weight: 700;
      background: var(--sd-accent-soft);
      border: 1px solid var(--sd-accent-border);
      padding: 2px 8px;
      border-radius: var(--sd-radius-sm);
      letter-spacing: 0.3px;
    }
    .days-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
      overflow-y: auto;
      flex: 1;
    }
    .day-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 8px;
      background: var(--sd-surface-2);
      border-radius: var(--sd-radius-sm);
      border: var(--sd-border);
      transition: all 0.2s;
    }
    .day-row.active-today {
      background: var(--sd-accent-soft);
      border-color: var(--sd-accent-border);
      box-shadow: 0 0 12px var(--sd-accent-soft);
    }
    .day-badge {
      background: var(--sd-surface-3);
      border-radius: 6px;
      padding: 2px 6px;
      min-width: 34px;
      text-align: center;
    }
    .day-row.active-today .day-badge {
      background: var(--sd-accent);
      color: var(--sd-on-accent);
      font-weight: 700;
    }
    .day-short {
      font-size: var(--sd-fs-sm);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meals-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1px;
      overflow: hidden;
    }
    .meal-slot {
      display: flex;
      align-items: baseline;
      gap: 6px;
      font-size: var(--sd-fs-sm);
    }
    .slot-label {
      font-size: var(--sd-fs-xs);
      font-weight: 700;
      color: var(--sd-text-muted);
      text-transform: uppercase;
      width: 44px;
      flex-shrink: 0;
    }
    .slot-text {
      color: var(--sd-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 500;
    }
    .meal-slot.empty .slot-text {
      opacity: 0.45;
      font-style: italic;
    }
  `]
})
export class MealPlannerWidgetComponent implements OnInit {
  @Input() config: any = {
    title: 'Weekly Menu',
    days: []
  };

  todayName: string = '';

  private defaultDays: MealPlanDay[] = [
    { day: 'Monday', lunch: 'Grilled Chicken Salad', dinner: 'Pasta Primavera' },
    { day: 'Tuesday', lunch: 'Turkey Avocado Wrap', dinner: 'Taco Tuesday 🌮' },
    { day: 'Wednesday', lunch: 'Minestrone Soup', dinner: 'Baked Salmon & Asparagus' },
    { day: 'Thursday', lunch: 'Quinoa Buddha Bowl', dinner: 'Homemade Pizza Night 🍕' },
    { day: 'Friday', lunch: 'BLT Sandwich', dinner: 'Thai Green Curry' },
    { day: 'Saturday', lunch: 'Leftovers / Cafe', dinner: 'BBQ Burgers 🍔' },
    { day: 'Sunday', lunch: 'Sunday Roast', dinner: 'Light Charcuterie Board' }
  ];

  readonly isLive: boolean;

  constructor(@Optional() @Inject(LIVE_DISPLAY) live: boolean | null) {
    this.isLive = !!live;
  }

  /** True when the built-in example menu is shown instead of configured days. */
  get showingSample(): boolean {
    return !(Array.isArray(this.config.days) && this.config.days.length > 0);
  }

  get weeklyPlan(): MealPlanDay[] {
    if (this.config.days && Array.isArray(this.config.days) && this.config.days.length > 0) {
      return this.config.days;
    }
    return this.defaultDays;
  }

  ngOnInit(): void {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    this.todayName = days[new Date().getDay()];
  }
}
