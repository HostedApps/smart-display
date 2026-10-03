import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, Optional, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { interval, Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ICalParserService, CalendarEvent } from '../../services/ical-parser.service';
import { environment } from '../../../environments/environment';
import { CalendarFeed } from '../../models/display.model';
import { LIVE_DISPLAY } from './widget-context';
import { DataCacheService } from '../../services/data-cache.service';

const MINUTE = 60_000;

interface MonthDay {
  date: Date;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

@Component({
  selector: 'app-calendar-widget',
  template: `
    <div class="calendar-card sd-card" [class.grid-mode]="config.viewMode === 'month_grid'">
      <!-- Header -->
      <div class="calendar-header">
        <div class="header-left">
          <svg class="cal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <h3 class="widget-title">{{ config.title || (config.viewMode === 'month_grid' ? (currentDate | date:'MMMM yyyy') : 'Schedule') }}</h3>
        </div>
        
        <div class="header-right">
          <!-- Multi-Calendar Legend Dots -->
          <div class="calendar-legend" *ngIf="activeFeeds.length > 1 && !showAddModal">
            <span *ngFor="let f of activeFeeds" class="legend-chip">
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
      <div class="agenda-view" *ngIf="config.viewMode !== 'month_grid'">
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
      <div class="month-grid-view" *ngIf="config.viewMode === 'month_grid'">
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
    @Optional() @Inject(LIVE_DISPLAY) live: boolean | null
  ) {
    this.isLive = !!live;
  }

  ngOnInit(): void {
    this.displayToken = this.route.snapshot.paramMap.get('token') || '';
    this.fetchCalendars();
    this.buildMonthGrid();
    this.pollSub = interval(900000).subscribe(() => this.fetchCalendars());
  }

  openAddModal(e?: MouseEvent, datePrefill?: Date): void {
    if (e) e.stopPropagation();
    this.showAddModal = true;
    this.newEventTitle = '';
    const d = datePrefill || new Date();
    this.newEventDate = d.toISOString().substring(0, 10);
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
        this.events = customEvents.length > 0 ? customEvents : this.defaultEvents;
      }
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
        this.events = combined.length > 0 ? combined : (customEvents.length > 0 ? customEvents : this.defaultEvents);
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
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }
}
