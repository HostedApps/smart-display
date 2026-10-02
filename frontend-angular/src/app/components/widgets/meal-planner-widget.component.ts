import { Component, Inject, Input, OnInit, Optional } from '@angular/core';
import { MealPlanDay } from '../../models/display.model';
import { LIVE_DISPLAY } from './widget-context';

@Component({
  selector: 'app-meal-planner-widget',
  template: `
    <div class="meal-card">
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
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 14px 16px;
      backdrop-filter: blur(16px);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
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
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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
      font-size: 0.95rem;
      font-weight: 600;
      margin: 0;
      color: #ffffff;
    }
    .today-tag {
      font-size: 0.65rem;
      color: var(--accent-blue, #0ea5e9);
      font-weight: 700;
      background: rgba(14, 165, 233, 0.15);
      border: 1px solid rgba(14, 165, 233, 0.3);
      padding: 2px 8px;
      border-radius: 12px;
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
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.04);
      transition: all 0.2s;
    }
    .day-row.active-today {
      background: rgba(14, 165, 233, 0.12);
      border-color: rgba(14, 165, 233, 0.4);
      box-shadow: 0 0 12px rgba(14, 165, 233, 0.15);
    }
    .day-badge {
      background: rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 2px 6px;
      min-width: 34px;
      text-align: center;
    }
    .day-row.active-today .day-badge {
      background: #0ea5e9;
      color: #ffffff;
      font-weight: 700;
    }
    .day-short {
      font-size: 0.7rem;
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
      font-size: 0.8rem;
    }
    .slot-label {
      font-size: 0.65rem;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      width: 44px;
      flex-shrink: 0;
    }
    .slot-text {
      color: #f1f5f9;
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
