import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, Optional, Inject, LOCALE_ID } from '@angular/core';
import { formatDate } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { interval, Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ICalParserService, CalendarEvent } from '../../services/ical-parser.service';
import { environment } from '../../../environments/environment';
import { CalendarFeed } from '../../models/display.model';
import { LIVE_DISPLAY } from './widget-context';
import { DataCacheService } from '../../services/data-cache.service';
import { WidgetBusService, WeatherSnapshot, NextEventSnapshot } from '../../services/widget-bus.service';

const MINUTE = 60_000;

interface MonthDay {
  date: Date;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

type CalViewMode = 'agenda' | 'month_grid' | 'week' | 'three_day' | 'upcoming';
const VIEW_MODES: CalViewMode[] = ['agenda', 'month_grid', 'week', 'three_day', 'upcoming'];

/** One day column (week / three_day) */
interface DayColumn {
  date: Date;
  key: string;
  isToday: boolean;
  isPast: boolean;
  allDay: CalendarEvent[];
  timed: CalendarEvent[];
  hidden: number;
}

/** One future-day group in the upcoming view */
interface UpcomingGroup {
  key: string;
  label: string;
  subLabel: string;
  events: CalendarEvent[];
}

interface DayWeather { icon?: string; temp: string; condition?: string; }

/** Local yyyy-mm-dd (matches WeatherSnapshot.daily[].date) */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
/** Event overlaps [from, to) — all-day DTEND is exclusive, so a strict compare keeps it to its own days */
function endMs(ev: CalendarEvent): number {
  const s = ev.startDate.getTime();
  return Math.max(ev.endDate?.getTime?.() || s, s + 1);
}
function overlaps(ev: CalendarEvent, from: Date, to: Date): boolean {
  return ev.startDate.getTime() < to.getTime() && endMs(ev) > from.getTime();
}

@Component({
  selector: 'app-calendar-widget',
  template: `
    <div class="calendar-card sd-card" [class.grid-mode]="viewMode === 'month_grid'">
      <!-- Header -->
      <div class="calendar-header">
        <div class="header-left">
          <svg class="cal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <h3 class="widget-title">{{ config.title || (viewMode === 'month_grid' ? (currentDate | date:'MMMM yyyy') : defaultTitle) }}</h3>
        </div>

        <div class="header-right">
          <!-- Multi-Calendar Legend (only feeds that actually have events) -->
          <div class="calendar-legend" *ngIf="showLegend && legendFeeds.length > 1 && !showAddModal">
            <span *ngFor="let f of legendFeeds" class="legend-chip" [title]="f.name">
              <span class="dot" [style.backgroundColor]="f.color"></span>
              <span class="legend-name">{{ f.name }}</span>
            </span>
          </div>

          <button class="add-event-btn" (click)="openAddModal($event)" title="Add Event on Screen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="plus-icon">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Add</span>
          </button>
        </div>
      </div>

      <!-- Quick Event Creation Drawer/Modal -->
      <div class="add-event-panel" *ngIf="showAddModal" (click)="$event.stopPropagation()">
        <input 
          type="text" 
          class="event-input" 
          placeholder="Event title..." 
          [(ngModel)]="newEventTitle"
          (keyup.enter)="submitNewEvent()"
          autofocus
        />
        <div class="event-fields-row">
          <input type="date" class="date-input" [(ngModel)]="newEventDate" />
          <input type="time" class="time-input" [(ngModel)]="newEventTime" *ngIf="!newEventIsAllDay" />
          <label class="all-day-label">
            <input type="checkbox" [(ngModel)]="newEventIsAllDay" /> All Day
          </label>
        </div>
        <div class="add-panel-footer">
          <div class="category-picker">
            <button 
              type="button" 
              *ngFor="let cat of eventCategories" 
              class="cat-chip" 
              [class.active]="newEventCategory.name === cat.name"
              [style.borderColor]="newEventCategory.name === cat.name ? cat.color : 'transparent'"
              (click)="newEventCategory = cat">
              <span class="dot" [style.backgroundColor]="cat.color"></span>
              {{ cat.name }}
            </button>
          </div>
          <div class="panel-buttons">
            <button class="btn-cancel" (click)="closeAddModal()">Cancel</button>
            <button class="btn-save" (click)="submitNewEvent()" [disabled]="!newEventTitle.trim()">Save</button>
          </div>
        </div>
      </div>

      <!-- Live display with nothing real to show -->
      <app-widget-state *ngIf="calState === 'empty'" message="No calendars connected" hint="Add an iCal / Google / Outlook calendar link in the editor."></app-widget-state>
      <app-widget-state *ngIf="calState === 'error'" kind="error" message="Calendar unavailable" hint="Couldn't load your calendar feeds. Retrying automatically."></app-widget-state>

      <ng-container *ngIf="calState === 'ok'">
      <!-- VIEW MODE 1: AGENDA LIST VIEW -->
      <div class="agenda-view" *ngIf="viewMode === 'agenda'">
        <div class="events-list" *ngIf="events.length > 0; else noEvents">
          <div *ngFor="let ev of events | slice:0:(config.maxEvents || 6)" class="event-item">
            <div class="event-accent-bar" [style.backgroundColor]="ev.color || '#38bdf8'"></div>
            <div class="event-date">
              <span class="event-day">{{ ev.startDate | date:'d' }}</span>
              <span class="event-month">{{ ev.startDate | date:'MMM' }}</span>
            </div>
            <div class="event-info">
              <div class="event-title-row">
                <span class="event-title">{{ ev.title }}</span>
                <span *ngIf="ev.feedName" class="feed-tag" [style.color]="ev.color">{{ ev.feedName }}</span>
              </div>
              <div class="event-time" *ngIf="!ev.isAllDay">{{ ev.startDate | date:'shortTime' }} - {{ ev.endDate | date:'shortTime' }}</div>
              <div class="event-time" *ngIf="ev.isAllDay">All Day</div>
              <div class="event-location" *ngIf="ev.location">{{ ev.location }}</div>
            </div>
          </div>
        </div>
        <ng-template #noEvents><div class="empty-state">No upcoming events scheduled</div></ng-template>
      </div>

      <!-- VIEW MODE 2: MONTHLY WALL GRID VIEW -->
      <div class="month-grid-view" *ngIf="viewMode === 'month_grid'">
        <div class="weekdays-row">
          <span *ngFor="let day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" class="weekday-cell">{{ day }}</span>
        </div>
        <div class="days-matrix">
          <div 
            *ngFor="let cell of monthGrid" 
            class="day-matrix-cell" 
            [class.other-month]="!cell.isCurrentMonth"
            [class.today]="cell.isToday"
            (click)="openAddModal($event, cell.date)"
          >
            <span class="cell-num">{{ cell.dayNum }}</span>
            <div class="cell-events" *ngIf="cell.events.length > 0">
              <div 
                *ngFor="let ev of cell.events | slice:0:2" 
                class="cell-event-chip"
                [style.backgroundColor]="ev.color || '#38bdf8'"
                [title]="ev.title"
              >
                <span>{{ ev.title }}</span>
              </div>
              <span *ngIf="cell.events.length > 2" class="more-dots">+{{ cell.events.length - 2 }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW MODES 3 & 4: WEEK (7 columns) / THREE DAY (3 roomier columns) -->
      <div class="columns-view" *ngIf="viewMode === 'week' || viewMode === 'three_day'"
           [class.roomy]="viewMode === 'three_day'"
           [style.gridTemplateColumns]="'repeat(' + dayColumns.length + ', minmax(0, 1fr))'">
        <div *ngFor="let col of dayColumns" class="day-col" [class.today]="col.isToday" [class.past]="col.isPast"
             (click)="openAddModal($event, col.date)">
          <div class="day-col-head">
            <span class="dch-weekday">{{ col.date | date:(viewMode === 'three_day' ? 'EEEE' : 'EEE') }}</span>
            <span class="dch-date">{{ col.date | date:(viewMode === 'three_day' ? 'd MMM' : 'd') }}</span>
            <span class="day-wx" *ngIf="weatherFor(col.key) as wx" [title]="wx.condition || ''">
              <span class="wx-icon" *ngIf="wx.icon">{{ wx.icon }}</span>{{ wx.temp }}
            </span>
          </div>
          <div class="day-col-body">
            <div *ngFor="let ev of col.allDay" class="allday-chip" [style.background]="tint(ev.color)"
                 [style.borderLeftColor]="ev.color || fallbackColor" [title]="ev.title">{{ ev.title }}</div>
            <div *ngFor="let ev of col.timed" class="timed-ev" [style.borderLeftColor]="ev.color || fallbackColor" [title]="ev.title">
              <span class="tev-time">{{ (ev.startDate < col.date ? col.date : ev.startDate) | date:'shortTime' }}</span>
              <span class="tev-title">{{ ev.title }}</span>
            </div>
            <div *ngIf="col.allDay.length === 0 && col.timed.length === 0" class="col-empty">&mdash;</div>
          </div>
          <div class="col-more" *ngIf="col.hidden > 0">+{{ col.hidden }} more</div>
        </div>
      </div>

      <!-- VIEW MODE 5: UPCOMING (today + next N days, grouped) -->
      <div class="upcoming-view" *ngIf="viewMode === 'upcoming'">
        <div class="up-group">
          <div class="up-head today">
            <span class="up-head-label">Today</span>
            <span class="up-head-date">{{ currentDate | date:'EEE d MMM' }}</span>
            <span class="day-wx" *ngIf="weatherFor(todayKey) as wx" [title]="wx.condition || ''">
              <span class="wx-icon" *ngIf="wx.icon">{{ wx.icon }}</span>{{ wx.temp }}
            </span>
          </div>
          <ng-container *ngIf="upcomingToday.length > 0; else nothingToday">
            <ng-container *ngFor="let ev of upcomingToday">
              <ng-container *ngTemplateOutlet="upItem; context: { $implicit: ev }"></ng-container>
            </ng-container>
          </ng-container>
          <ng-template #nothingToday><div class="up-empty">{{ todayHadEvents ? 'Nothing else today' : 'Nothing today' }}</div></ng-template>
        </div>
        <div class="up-group" *ngFor="let g of upcomingGroups">
          <div class="up-head">
            <span class="up-head-label">{{ g.label }}</span>
            <span class="up-head-date" *ngIf="g.subLabel">{{ g.subLabel }}</span>
            <span class="day-wx" *ngIf="weatherFor(g.key) as wx" [title]="wx.condition || ''">
              <span class="wx-icon" *ngIf="wx.icon">{{ wx.icon }}</span>{{ wx.temp }}
            </span>
          </div>
          <ng-container *ngFor="let ev of g.events">
            <ng-container *ngTemplateOutlet="upItem; context: { $implicit: ev }"></ng-container>
          </ng-container>
        </div>
        <div class="col-more" *ngIf="upcomingHidden > 0">+{{ upcomingHidden }} more</div>
        <div class="up-empty" *ngIf="upcomingGroups.length === 0 && upcomingHidden === 0">No events in the next {{ upcomingDays }} days</div>

        <ng-template #upItem let-ev>
          <div class="up-item" [style.borderLeftColor]="ev.color || fallbackColor">
            <span class="up-time">{{ ev.isAllDay ? 'All day' : (ev.startDate | date:'shortTime') }}</span>
            <span class="up-title">{{ ev.title }}</span>
            <span class="up-feed" *ngIf="ev.feedName && legendFeeds.length > 1" [style.color]="ev.color">{{ ev.feedName }}</span>
          </div>
        </ng-template>
      </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .calendar-card {
      height: 100%;
      box-sizing: border-box;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: var(--sd-border);
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .cal-icon {
      width: 16px;
      height: 16px;
      color: var(--sd-accent);
    }
    .widget-title {
      font-size: var(--sd-fs-title);
      font-weight: 600;
      margin: 0;
      color: var(--sd-text);
    }
    .calendar-legend {
      display: flex;
      gap: 6px;
    }
    .legend-chip {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: var(--sd-fs-xs);
      color: var(--sd-text-muted);
      font-weight: 600;
    }
    .legend-chip .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      box-shadow: 0 0 6px currentColor;
    }

    /* Agenda View */
    .agenda-view {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }
    .events-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .event-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 10px;
      background: var(--sd-surface-2);
      border-radius: var(--sd-radius-sm);
      border: var(--sd-border);
      position: relative;
      overflow: hidden;
      transition: background 0.2s;
    }
    .event-item:hover {
      background: var(--sd-surface-3);
    }
    .event-accent-bar {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
    }
    .event-date {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--sd-surface-2);
      border-radius: 6px;
      min-width: 36px;
      padding: 3px;
    }
    .event-day {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: var(--sd-fs-title);
      font-weight: 700;
      line-height: 1;
      color: var(--sd-text);
    }
    .event-month {
      font-size: var(--sd-fs-xs);
      text-transform: uppercase;
      color: var(--sd-text-muted);
      font-weight: 600;
    }
    .event-info {
      flex: 1;
      overflow: hidden;
    }
    .event-title-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 6px;
    }
    .event-title {
      font-size: var(--sd-fs-body);
      font-weight: 600;
      color: var(--sd-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .feed-tag {
      font-size: var(--sd-fs-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .event-time {
      font-size: var(--sd-fs-sm);
      color: var(--sd-text-muted);
      margin-top: 1px;
    }
    .event-location {
      font-size: var(--sd-fs-xs);
      color: var(--sd-text-subtle);
    }

    /* Month Grid View */
    .month-grid-view {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .weekdays-row {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      text-align: center;
      font-size: var(--sd-fs-xs);
      font-weight: 700;
      color: var(--sd-text-muted);
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .days-matrix {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      grid-template-rows: repeat(5, 1fr);
      gap: 3px;
      flex: 1;
    }
    .day-matrix-cell {
      background: var(--sd-surface-2);
      border-radius: 6px;
      padding: 3px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: var(--sd-border);
    }
    .day-matrix-cell.other-month { opacity: 0.25; }
    .day-matrix-cell.today {
      background: var(--sd-accent-soft);
      border: 1px solid var(--sd-accent);
      box-shadow: 0 0 10px var(--sd-accent-border);
    }
    .cell-num {
      font-size: var(--sd-fs-sm);
      font-weight: 600;
      line-height: 1;
      color: var(--sd-text-muted);
      margin-bottom: 2px;
    }
    .today .cell-num {
      color: var(--sd-accent);
      font-weight: 700;
    }
    .cell-events {
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
    }
    .cell-event-chip {
      font-size: var(--sd-fs-xs);
      color: #0f172a;
      font-weight: 700;
      padding: 1px 3px;
      border-radius: 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .add-event-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      background: var(--sd-accent-soft);
      border: 1px solid var(--sd-accent-border);
      color: var(--sd-accent);
      border-radius: var(--sd-radius-sm);
      padding: 2px 8px;
      font-size: var(--sd-fs-sm);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .add-event-btn:hover {
      background: var(--sd-accent-border);
      border-color: var(--sd-accent);
    }
    .plus-icon {
      width: 12px;
      height: 12px;
    }
    .add-event-panel {
      background: var(--sd-surface-2);
      border: 1px solid var(--sd-accent-border);
      border-radius: var(--sd-radius-sm);
      padding: 8px 10px;
      margin-bottom: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .event-input {
      background: var(--sd-surface-3);
      border: var(--sd-border);
      border-radius: 6px;
      color: var(--sd-text);
      padding: 6px 8px;
      font-size: var(--sd-fs-sm);
      outline: none;
    }
    .event-input:focus {
      border-color: var(--sd-accent);
    }
    .event-fields-row {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .date-input, .time-input {
      background: var(--sd-surface-3);
      border: var(--sd-border);
      border-radius: 6px;
      color: var(--sd-text);
      padding: 4px 6px;
      font-size: var(--sd-fs-sm);
      outline: none;
    }
    .all-day-label {
      font-size: var(--sd-fs-sm);
      color: var(--sd-text-muted);
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
    }
    .add-panel-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 2px;
    }
    .category-picker {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }
    .cat-chip {
      background: var(--sd-surface-2);
      border: 1px solid transparent;
      color: var(--sd-text-muted);
      font-size: var(--sd-fs-xs);
      font-weight: 600;
      border-radius: 4px;
      padding: 2px 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .cat-chip.active {
      background: var(--sd-surface-3);
    }
    .cat-chip .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .panel-buttons {
      display: flex;
      gap: 6px;
    }
    .btn-cancel {
      background: none;
      border: none;
      color: var(--sd-text-muted);
      font-size: var(--sd-fs-sm);
      cursor: pointer;
      padding: 3px 6px;
    }
    .btn-save {
      background: var(--sd-accent);
      border: none;
      color: var(--sd-on-accent);
      font-size: var(--sd-fs-sm);
      font-weight: 600;
      border-radius: 5px;
      padding: 3px 10px;
      cursor: pointer;
    }
    .btn-save:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .empty-state { color: var(--sd-text-muted); font-size: var(--sd-fs-sm); margin-top: 16px; text-align: center; }

    /* Header fit at small sizes: legend shrinks / clips before the title does */
    .calendar-header { gap: 8px; min-width: 0; }
    .header-left { flex-shrink: 0; min-width: 0; }
    .header-right { flex: 1; min-width: 0; justify-content: flex-end; }
    .calendar-legend { min-width: 0; overflow: hidden; flex-wrap: nowrap; }
    .legend-chip { min-width: 0; flex-shrink: 1; }
    .legend-chip .dot { flex-shrink: 0; }
    .legend-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 9em; }
    .add-event-btn { flex-shrink: 0; }

    /* Shared weather badge on day headers */
    .day-wx {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: var(--sd-fs-xs);
      font-weight: 600;
      color: var(--sd-text-muted);
      white-space: nowrap;
    }
    .wx-icon { line-height: 1; }

    /* Week / three-day columns */
    .columns-view {
      flex: 1;
      min-height: 0;
      display: grid;
      gap: 4px;
      overflow: hidden;
    }
    .day-col {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      background: var(--sd-surface-2);
      border: var(--sd-border);
      border-radius: var(--sd-radius-sm);
      cursor: pointer;
    }
    .day-col.today {
      background: var(--sd-accent-soft);
      border-color: var(--sd-accent);
    }
    .day-col.past { opacity: 0.55; }
    .day-col-head {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      padding: 4px 2px 3px;
      border-bottom: var(--sd-border);
      text-align: center;
      min-width: 0;
    }
    .dch-weekday {
      font-size: var(--sd-fs-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--sd-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .dch-date {
      font-size: var(--sd-fs-body);
      font-weight: 700;
      line-height: 1.05;
      color: var(--sd-text);
    }
    .day-col.today .dch-weekday,
    .day-col.today .dch-date { color: var(--sd-accent); }
    .day-col-body {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 3px;
    }
    .allday-chip {
      flex-shrink: 0;
      font-size: var(--sd-fs-xs);
      font-weight: 600;
      color: var(--sd-text);
      padding: 1px 4px;
      border-radius: 3px;
      border-left: 3px solid transparent;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .timed-ev {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      min-width: 0;
      padding: 1px 0 1px 4px;
      border-left: 3px solid transparent;
    }
    .tev-time {
      font-size: var(--sd-fs-xs);
      color: var(--sd-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tev-title {
      font-size: var(--sd-fs-xs);
      font-weight: 600;
      color: var(--sd-text);
      line-height: 1.2;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow-wrap: anywhere;
    }
    .col-empty {
      font-size: var(--sd-fs-xs);
      color: var(--sd-text-subtle);
      text-align: center;
      margin-top: 4px;
    }
    .col-more {
      flex-shrink: 0;
      font-size: var(--sd-fs-xs);
      font-weight: 600;
      color: var(--sd-text-muted);
      text-align: center;
      padding: 1px 2px 3px;
    }
    .columns-view.roomy { gap: 6px; }
    .roomy .day-col-head { flex-direction: row; justify-content: center; flex-wrap: wrap; gap: 4px 6px; padding: 6px 4px; }
    .roomy .dch-weekday { font-size: var(--sd-fs-sm); }
    .roomy .dch-date { font-size: var(--sd-fs-sm); color: var(--sd-text-muted); font-weight: 600; }
    .roomy .day-col-body { gap: 5px; padding: 5px; }
    .roomy .allday-chip { font-size: var(--sd-fs-sm); padding: 2px 6px; }
    .roomy .tev-time { font-size: var(--sd-fs-xs); }
    .roomy .tev-title { font-size: var(--sd-fs-sm); -webkit-line-clamp: 3; }
    .roomy .timed-ev { padding-left: 6px; }

    /* Upcoming list */
    .upcoming-view {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .up-group { display: flex; flex-direction: column; gap: 3px; flex-shrink: 0; }
    .up-head {
      display: flex;
      align-items: baseline;
      gap: 6px;
      font-size: var(--sd-fs-sm);
      color: var(--sd-text-muted);
      border-bottom: var(--sd-border);
      padding-bottom: 2px;
      min-width: 0;
    }
    .up-head-label { font-weight: 700; color: var(--sd-text); white-space: nowrap; }
    .up-head.today .up-head-label { color: var(--sd-accent); }
    .up-head-date { font-size: var(--sd-fs-xs); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .up-head .day-wx { margin-left: auto; }
    .up-item {
      display: flex;
      align-items: baseline;
      gap: 8px;
      min-width: 0;
      padding: 2px 0 2px 6px;
      border-left: 3px solid transparent;
    }
    .up-time {
      flex-shrink: 0;
      min-width: 4.2em;
      font-size: var(--sd-fs-sm);
      color: var(--sd-text-muted);
      white-space: nowrap;
    }
    .up-title {
      flex: 1;
      min-width: 0;
      font-size: var(--sd-fs-body);
      font-weight: 600;
      color: var(--sd-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .up-feed {
      flex-shrink: 0;
      font-size: var(--sd-fs-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      max-width: 30%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .up-empty { font-size: var(--sd-fs-sm); color: var(--sd-text-subtle); padding: 2px 0 2px 9px; }
  `]
})
export class CalendarWidgetComponent implements OnInit, OnDestroy, OnChanges {
  @Input() config: any = {
    viewMode: 'agenda',
    feeds: [],
    icalUrl: '',
    title: '',
    maxEvents: 6
  };

  events: CalendarEvent[] = [];
  monthGrid: MonthDay[] = [];
  currentDate: Date = new Date();
  readonly fallbackColor = '#38bdf8';

  /** week / three_day columns */
  dayColumns: DayColumn[] = [];
  /** upcoming view */
  upcomingToday: CalendarEvent[] = [];
  upcomingGroups: UpcomingGroup[] = [];
  upcomingHidden = 0;
  todayHadEvents = false;
  todayKey = dayKey(new Date());
  /** Feeds that actually have events (legend) */
  legendFeeds: { name: string; color: string }[] = [];

  private weatherByDate = new Map<string, DayWeather>();
  private weatherSub?: Subscription;
  private tickSub?: Subscription;
  private lastPublishedKey: string | undefined;
  /** True while `events` holds the built-in sample events (editor only) */
  private showingSamples = false;
  private pollSub?: Subscription;
  private displayToken: string = '';
  /** Live displays only: 'empty' (nothing configured) / 'error' (all feeds failed) replace the event views. */
  calState: 'ok' | 'empty' | 'error' = 'ok';
  readonly isLive: boolean;

  showAddModal: boolean = false;
  newEventTitle: string = '';
  newEventDate: string = '';
  newEventTime: string = '12:00';
  newEventIsAllDay: boolean = false;

  eventCategories = [
    { name: 'Family', color: '#10b981' },
    { name: 'Work', color: '#3b82f6' },
    { name: 'Kids', color: '#ec4899' },
    { name: 'Home', color: '#f59e0b' }
  ];
  newEventCategory = this.eventCategories[0];

  private defaultEvents: CalendarEvent[] = [
    { title: 'Soccer Practice', startDate: new Date(Date.now() + 3600000 * 4), endDate: new Date(Date.now() + 3600000 * 6), isAllDay: false, color: '#ec4899', feedName: 'Kids' },
    { title: 'Project Review Call', startDate: new Date(Date.now() + 3600000 * 24), endDate: new Date(Date.now() + 3600000 * 25), isAllDay: false, color: '#3b82f6', feedName: 'Work' },
    { title: 'Dentist Appointment', startDate: new Date(Date.now() + 3600000 * 48), endDate: new Date(Date.now() + 3600000 * 49), isAllDay: false, color: '#10b981', feedName: 'Family' },
    { title: 'Family Game Night', startDate: new Date(Date.now() + 3600000 * 72), endDate: new Date(Date.now() + 3600000 * 76), isAllDay: false, color: '#f59e0b', feedName: 'Home' }
  ];

  get activeFeeds(): CalendarFeed[] {
    if (this.config.feeds && Array.isArray(this.config.feeds) && this.config.feeds.length > 0) {
      return this.config.feeds;
    }
    if (this.config.icalUrl) {
      return [{ name: 'Calendar', url: this.config.icalUrl, color: '#38bdf8' }];
    }
    if (this.isLive) {
      return [];
    }
    return [
      { name: 'Kids', url: '', color: '#ec4899' },
      { name: 'Work', url: '', color: '#3b82f6' },
      { name: 'Family', url: '', color: '#10b981' }
    ];
  }

  constructor(private dataCache: DataCacheService, 
    private http: HttpClient, 
    private icalParser: ICalParserService,
    private route: ActivatedRoute,
    private bus: WidgetBusService,
    @Inject(LOCALE_ID) private locale: string,
    @Optional() @Inject(LIVE_DISPLAY) live: boolean | null
  ) {
    this.isLive = !!live;
  }

  ngOnInit(): void {
    this.displayToken = this.route.snapshot.paramMap.get('token') || '';
    this.fetchCalendars();
    this.buildMonthGrid();
    this.pollSub = interval(900000).subscribe(() => this.fetchCalendars());
    // Day rollover + events ending: cheap local rebuild every minute
    this.tickSub = interval(MINUTE).subscribe(() => this.buildMonthGrid());
    this.weatherSub = this.bus.select('weather').subscribe(w => this.applyWeather(w));
  }

  get viewMode(): CalViewMode {
    const m = this.config?.viewMode;
    return VIEW_MODES.includes(m) ? m : 'agenda';
  }

  get defaultTitle(): string {
    switch (this.viewMode) {
      case 'week': return 'This Week';
      case 'three_day': return 'Next 3 Days';
      case 'upcoming': return 'Upcoming';
      default: return 'Schedule';
    }
  }

  get showLegend(): boolean { return this.config?.showLegend !== false; }
  get showWeather(): boolean { return this.config?.showWeather !== false; }
  get upcomingDays(): number {
    const n = Number(this.config?.upcomingDays);
    return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), 31) : 7;
  }

  /** Translucent fill from an event colour (all-day chips) */
  tint(color?: string): string {
    return `color-mix(in srgb, ${color || this.fallbackColor} 30%, transparent)`;
  }

  weatherFor(key: string): DayWeather | null {
    if (!this.showWeather) return null;
    return this.weatherByDate.get(key) || null;
  }

  private applyWeather(w: WeatherSnapshot | undefined): void {
    const map = new Map<string, DayWeather>();
    for (const d of w?.daily || []) {
      if (!d || !d.date || typeof d.high !== 'number' || !Number.isFinite(d.high)) continue;
      const raw = String(d.icon || '').trim();
      // Bare OWM codes ('04d') and URLs/paths aren't renderable as text — show temperature only
      const icon = raw && !/^\d{2}[dn]$/i.test(raw) && !/[\/.]/.test(raw) && raw.length <= 8 ? raw : undefined;
      map.set(String(d.date).slice(0, 10), { icon, temp: `${Math.round(d.high)}°`, condition: d.condition });
    }
    this.weatherByDate = map;
  }

  openAddModal(e?: MouseEvent, datePrefill?: Date): void {
    if (e) e.stopPropagation();
    this.showAddModal = true;
    this.newEventTitle = '';
    const d = datePrefill || new Date();
    this.newEventDate = dayKey(d);
    this.newEventTime = '12:00';
    this.newEventIsAllDay = false;
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.newEventTitle = '';
  }

  submitNewEvent(): void {
    const title = this.newEventTitle.trim();
    if (!title) return;

    let start: Date;
    let end: Date;

    if (this.newEventIsAllDay) {
      start = new Date(`${this.newEventDate}T00:00:00`);
      end = new Date(`${this.newEventDate}T23:59:59`);
    } else {
      start = new Date(`${this.newEventDate}T${this.newEventTime || '12:00'}:00`);
      end = new Date(start.getTime() + 3600000);
    }

    const newEv: CalendarEvent = {
      title,
      startDate: start,
      endDate: end,
      isAllDay: this.newEventIsAllDay,
      color: this.newEventCategory.color,
      feedName: this.newEventCategory.name
    };

    this.events.push(newEv);
    this.calState = 'ok';
    this.events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    this.buildMonthGrid();
    this.closeAddModal();

    if (this.displayToken) {
      this.http.post(`${environment.apiUrl}/calendar_sync.php`, {
        action: 'add',
        token: this.displayToken,
        title,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        isAllDay: this.newEventIsAllDay,
        color: this.newEventCategory.color,
        feedName: this.newEventCategory.name
      }).subscribe({
        next: () => {},
        error: () => {}
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.fetchCalendars();
      this.buildMonthGrid();
    }
  }

  fetchCalendars(): void {
    const customEvents: CalendarEvent[] = (this.config.customEvents && Array.isArray(this.config.customEvents))
      ? this.config.customEvents.map((ev: any) => ({
          title: ev.title,
          startDate: new Date(ev.startDate),
          endDate: ev.endDate ? new Date(ev.endDate) : new Date(new Date(ev.startDate).getTime() + 3600000),
          isAllDay: !!ev.isAllDay,
          location: ev.location,
          description: ev.description,
          color: ev.color || '#38bdf8',
          feedName: ev.feedName || (ev.category ? `AI: ${ev.category}` : 'Flyer Event')
        }))
      : [];

    const feeds = this.activeFeeds.filter(f => !!f.url);
    if (feeds.length === 0) {
      if (this.isLive) {
        // Never show sample events on a live display
        this.calState = customEvents.length > 0 ? 'ok' : 'empty';
        this.events = customEvents;
      } else {
        this.events = customEvents.length > 0 ? customEvents : [...this.defaultEvents];
      }
      this.showingSamples = !this.isLive && customEvents.length === 0;
      this.events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      this.buildMonthGrid();
      return;
    }

    const requests = feeds.map(feed => {
      const proxyUrl = `${environment.apiUrl}/proxy.php?action=fetch_ical&url=${encodeURIComponent(feed.url)}`;
      return this.dataCache.getText(proxyUrl, 2 * MINUTE).pipe(
        catchError(() => of(''))
      );
    });

    forkJoin(requests).subscribe(results => {
      let combined: CalendarEvent[] = [...customEvents];
      let loadedFeeds = 0;
      results.forEach((rawIcal, idx) => {
        if (rawIcal) {
          loadedFeeds++;
          const parsed = this.icalParser.parse(rawIcal, feeds[idx].name, feeds[idx].color);
          combined = combined.concat(parsed);
        }
      });

      combined.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      if (this.isLive) {
        // Real events only; error state when every feed failed and there is nothing else to show
        this.events = combined;
        this.calState = (loadedFeeds === 0 && customEvents.length === 0) ? 'error' : 'ok';
      } else {
        this.events = combined.length > 0 ? combined : (customEvents.length > 0 ? customEvents : [...this.defaultEvents]);
        this.showingSamples = combined.length === 0 && customEvents.length === 0;
      }
      this.buildMonthGrid();
    });
  }

  buildMonthGrid(): void {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();

    const grid: MonthDay[] = [];

    for (let i = 0; i < 35; i++) {
      const cellDate = new Date(year, month, 1 - startDayOfWeek + i);
      const isCurrentMonth = cellDate.getMonth() === month;
      const isToday = cellDate.toDateString() === now.toDateString();

      const dayEvents = this.events.filter(ev => {
        const evDate = new Date(ev.startDate);
        return evDate.getFullYear() === cellDate.getFullYear() &&
               evDate.getMonth() === cellDate.getMonth() &&
               evDate.getDate() === cellDate.getDate();
      });

      grid.push({
        date: cellDate,
        dayNum: cellDate.getDate(),
        isCurrentMonth,
        isToday,
        events: dayEvents
      });
    }

    this.monthGrid = grid;
    this.currentDate = now;
    this.todayKey = dayKey(now);
    this.buildLegend();
    this.buildDayColumns(now);
    this.buildUpcoming(now);
    this.publishNextEvent(now);
  }

  private buildLegend(): void {
    const seen = new Map<string, string>();
    for (const ev of this.events) {
      const name = (ev.feedName || '').trim();
      if (name && !seen.has(name)) seen.set(name, ev.color || this.fallbackColor);
    }
    this.legendFeeds = [...seen].map(([name, color]) => ({ name, color }));
  }

  private buildDayColumns(now: Date): void {
    const mode = this.viewMode;
    if (mode !== 'week' && mode !== 'three_day') { this.dayColumns = []; return; }
    const count = mode === 'week' ? 7 : 3;
    const today = startOfDay(now);
    let first = today;
    if (mode === 'week') {
      const ws = this.config?.weekStartsOn;
      if (ws === 'monday') first = addDays(today, -((today.getDay() + 6) % 7));
      else if (ws === 'sunday') first = addDays(today, -today.getDay());
    }
    const n = Number(this.config?.maxPerDay);
    const cap = Number.isFinite(n) && n >= 1 ? Math.floor(n) : (mode === 'week' ? 5 : 8);

    const cols: DayColumn[] = [];
    for (let i = 0; i < count; i++) {
      const date = addDays(first, i);
      const next = addDays(first, i + 1);
      const dayEvents = this.events.filter(ev => overlaps(ev, date, next));
      const allDay = dayEvents.filter(ev => ev.isAllDay);
      const timed = dayEvents.filter(ev => !ev.isAllDay);
      const shownAllDay = allDay.slice(0, cap);
      const shownTimed = timed.slice(0, Math.max(0, cap - shownAllDay.length));
      cols.push({
        date,
        key: dayKey(date),
        isToday: date.getTime() === today.getTime(),
        isPast: date.getTime() < today.getTime(),
        allDay: shownAllDay,
        timed: shownTimed,
        hidden: dayEvents.length - shownAllDay.length - shownTimed.length
      });
    }
    this.dayColumns = cols;
  }

  private buildUpcoming(now: Date): void {
    if (this.viewMode !== 'upcoming') {
      this.upcomingToday = []; this.upcomingGroups = []; this.upcomingHidden = 0;
      return;
    }
    const max = Math.max(1, Number(this.config?.maxEvents) || 8);
    const today = startOfDay(now);
    const tomorrow = addDays(today, 1);
    let budget = max;
    let hidden = 0;

    const todayAll = this.events.filter(ev => overlaps(ev, today, tomorrow));
    this.todayHadEvents = todayAll.length > 0;
    // Remaining today: all-day events stay for the whole day, timed ones until they end
    const remaining = todayAll.filter(ev => ev.isAllDay || endMs(ev) > now.getTime());
    remaining.sort((a, b) => (Number(b.isAllDay) - Number(a.isAllDay)) || (a.startDate.getTime() - b.startDate.getTime()));
    this.upcomingToday = remaining.slice(0, budget);
    hidden += remaining.length - this.upcomingToday.length;
    budget -= this.upcomingToday.length;

    const groups: UpcomingGroup[] = [];
    for (let i = 1; i <= this.upcomingDays; i++) {
      const date = addDays(today, i);
      const next = addDays(today, i + 1);
      // Future days list events by start day (multi-day events aren't repeated)
      const evs = this.events.filter(ev => ev.startDate >= date && ev.startDate < next);
      if (evs.length === 0) continue;
      evs.sort((a, b) => (Number(b.isAllDay) - Number(a.isAllDay)) || (a.startDate.getTime() - b.startDate.getTime()));
      const shown = evs.slice(0, Math.max(0, budget));
      hidden += evs.length - shown.length;
      budget -= shown.length;
      if (shown.length === 0) continue;
      groups.push({
        key: dayKey(date),
        label: i === 1 ? 'Tomorrow' : formatDate(date, 'EEEE', this.locale),
        subLabel: formatDate(date, i === 1 ? 'EEE d MMM' : 'd MMM', this.locale),
        events: shown
      });
    }
    this.upcomingGroups = groups;
    this.upcomingHidden = hidden;
  }

  /** Share the soonest not-yet-ended event (real data only on live displays) */
  private publishNextEvent(now: Date): void {
    if (this.isLive && (this.calState === 'error' || this.showingSamples)) return;
    const t = now.getTime();
    let next: CalendarEvent | undefined;
    for (const ev of this.events) {
      if (endMs(ev) <= t) continue;
      if (!next || ev.startDate.getTime() < next.startDate.getTime()) next = ev;
    }
    const value: NextEventSnapshot | null = next
      ? { title: next.title, start: next.startDate.getTime(), allDay: !!next.isAllDay, feedName: next.feedName }
      : null;
    const key = JSON.stringify(value);
    if (key === this.lastPublishedKey) return;
    this.lastPublishedKey = key;
    this.bus.publish('nextEvent', value);
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.tickSub?.unsubscribe();
    this.weatherSub?.unsubscribe();
  }
}
