import { Component, Input, OnInit } from '@angular/core';
import { MealPlanDay } from '../../models/display.model';

@Component({
  selector: 'app-meal-planner-widget',
  template: `
    <div class="meal-card">
      <div class="meal-header">
        <div class="title-wrap">
          <span class="chef-icon">🍽️</span>
          <h3 class="widget-title">{{ config.title || 'Weekly Menu' }}</h3>
        </div>
        <span class="today-tag">Today: {{ todayName }}</span>
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
              <span class="slot-label">Lunch:</span>
              <span class="slot-text">{{ item.lunch }}</span>
            </div>
            <div class="meal-slot" *ngIf="item.dinner">
              <span class="slot-label">Dinner:</span>
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
      height: 100%;
      box-sizing: border-box;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 14px;
      backdrop-filter: blur(8px);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .meal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .title-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .chef-icon {
      font-size: 1.1rem;
    }
    .widget-title {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
    }
    .today-tag {
      font-size: 0.75rem;
      color: #38bdf8;
      font-weight: 600;
      background: rgba(56, 189, 248, 0.15);
      padding: 2px 8px;
      border-radius: 12px;
    }
    .days-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      overflow-y: auto;
      flex: 1;
    }
    .day-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 8px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 6px;
      border: 1px solid transparent;
    }
    .day-row.active-today {
      background: rgba(56, 189, 248, 0.1);
      border-color: #38bdf8;
    }
    .day-badge {
      background: rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      padding: 2px 6px;
      min-width: 32px;
      text-align: center;
    }
    .day-row.active-today .day-badge {
      background: #38bdf8;
      color: #0f172a;
      font-weight: 700;
    }
    .day-short {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .meals-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
    }
    .meal-slot {
      display: flex;
      align-items: baseline;
      gap: 6px;
      font-size: 0.8rem;
    }
    .slot-label {
      font-size: 0.7rem;
      font-weight: 600;
      opacity: 0.65;
      text-transform: uppercase;
      width: 44px;
      flex-shrink: 0;
    }
    .slot-text {
      color: #f1f5f9;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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
