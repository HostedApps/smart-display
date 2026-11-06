import { Component } from '@angular/core';
import { ConfigField } from '../../widgets/widget-config-schema';
import { WidgetFormBase } from './widget-form-base';

const FIELDS: readonly ConfigField[] = [
  { type: 'select', key: 'viewMode', label: 'View Mode', options: [
    { value: 'agenda', label: 'Agenda list' },
    { value: 'upcoming', label: 'Today + upcoming days' },
    { value: 'three_day', label: '3-day columns' },
    { value: 'week', label: 'Week columns' },
    { value: 'month_grid', label: 'Month grid' },
  ] },
  { type: 'select', key: 'weekStartsOn', label: 'Week Starts', showIf: c => c['viewMode'] === 'week', options: [
    { value: undefined, label: 'Today (rolling 7 days)' },
    { value: 'monday', label: 'Monday' },
    { value: 'sunday', label: 'Sunday' },
  ] },
  { type: 'number', key: 'upcomingDays', label: 'Days Ahead', min: 1, max: 31, placeholder: '7', showIf: c => c['viewMode'] === 'upcoming' },
  { type: 'number', key: 'maxPerDay', label: 'Events per Day Column', min: 1, max: 20,
    placeholder: c => (c['viewMode'] === 'week' ? '5' : '8'), showIf: c => c['viewMode'] === 'week' || c['viewMode'] === 'three_day' },
  { type: 'toggle', key: 'showLegend', label: 'Colour legend', defaultOn: true, row: 'extras' },
  { type: 'toggle', key: 'showWeather', label: 'Weather on days', defaultOn: true, row: 'extras' },
  { type: 'text', key: 'title', label: 'Title', placeholder: 'Family Calendar' },
  { type: 'text', key: 'icalUrl', label: 'Single iCal URL', placeholder: 'https://calendar.google.com/...', showIf: c => !c['feeds'] || c['feeds'].length === 0 },
];

@Component({
  selector: 'app-calendar-form',
  template: `
    <app-widget-config-form [config]="config" [fields]="fields"></app-widget-config-form>
    <div class="widget-form feeds-manager">
      <div class="section-subhead">
        <label>Family Member Feeds</label>
        <button type="button" (click)="addFeed()" class="btn-xs-action">+ Add Feed</button>
      </div>
      <div *ngFor="let feed of config['feeds']; let i = index" class="feed-config-row">
        <input type="color" [(ngModel)]="feed.color" class="color-picker-mini" aria-label="Feed colour" />
        <input type="text" [(ngModel)]="feed.name" placeholder="Name (e.g. Mom)" class="input-control feed-name-input" />
        <input type="text" [(ngModel)]="feed.url" placeholder="iCal URL (.ics)" class="input-control feed-url-input" />
        <button type="button" (click)="removeFeed(i)" class="btn-icon-danger" aria-label="Remove"><app-icon name="x" [size]="14"></app-icon></button>
      </div>
    </div>
  `,
  styleUrls: ['./widget-forms.css']
})
export class CalendarFormComponent extends WidgetFormBase {
  readonly fields = FIELDS;

  addFeed(): void {
    (this.config['feeds'] ||= []).push({ name: 'Family', url: '', color: '#ec4899' });
    this.changed();
  }

  removeFeed(i: number): void {
    this.config['feeds']?.splice(i, 1);
    this.changed();
  }
}
