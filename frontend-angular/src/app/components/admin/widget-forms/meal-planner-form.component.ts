import { Component } from '@angular/core';
import { WidgetFormBase } from './widget-form-base';

@Component({
  selector: 'app-meal-planner-form',
  template: `
    <div class="widget-form">
      <div class="form-group">
        <label>Widget Title</label>
        <input type="text" [(ngModel)]="config['title']" placeholder="Weekly Menu" class="input-control" />
      </div>
      <div class="meal-days-editor">
        <div *ngFor="let day of config['days']" class="meal-day-config">
          <span class="day-label">{{ day.day }}</span>
          <input type="text" [(ngModel)]="day.lunch" placeholder="Lunch" class="input-control" [attr.aria-label]="day.day + ' lunch'" />
          <input type="text" [(ngModel)]="day.dinner" placeholder="Dinner" class="input-control" [attr.aria-label]="day.day + ' dinner'" />
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./widget-forms.css']
})
export class MealPlannerFormComponent extends WidgetFormBase {}
