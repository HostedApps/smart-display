import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ICalParserService, CalendarEvent } from '../../services/ical-parser.service';
import { environment } from '../../../environments/environment';
import { CalendarFeed } from '../../models/display.model';

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
    <div class="calendar-card" [class.grid-mode]="config.viewMode === 'month_grid'">
      <!-- Header -->
      <div class="calendar-header">
        <div class="header-left">
          <svg class="cal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <h3 class="widget-title">{{ config.title || (config.viewMode === 'month_grid' ? (currentDate | date:'MMMM yyyy') : 'Upcoming Events') }}</h3>
        </div>
        
        <!-- Multi-Calendar Legend Dots -->
        <div class="calendar-legend" *ngIf="activeFeeds.length > 1">
          <span *ngFor="let f of activeFeeds" class="legend-chip">
            <span class="dot" [style.backgroundColor]="f.color"></span>
            <span class="legend-name">{{ f.name }}</span>
          </span>
        </div>
      </div>

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
    </div>
  `,
  styles: [`
    .calendar-card {
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
    .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .cal-icon {
      width: 18px;
      height: 18px;
      color: #38bdf8;
    }
    .widget-title {
      font-size: 1.05rem;
      font-weight: 600;
      margin: 0;
    }
    .calendar-legend {
      display: flex;
      gap: 8px;
    }
    .legend-chip {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.7rem;
      opacity: 0.8;
    }
    .legend-chip .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
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
      gap: 8px;
    }
    .event-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      position: relative;
      overflow: hidden;
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
      background: rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      min-width: 40px;
      padding: 4px;
    }
    .event-day { font-size: 1.05rem; font-weight: 700; line-height: 1; }
    .event-month { font-size: 0.65rem; text-transform: uppercase; opacity: 0.8; }
    .event-info { flex: 1; overflow: hidden; }
    .event-title-row { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; }
    .event-title { font-size: 0.9rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .feed-tag { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; }
    .event-time { font-size: 0.75rem; opacity: 0.7; }
    .event-location { font-size: 0.7rem; opacity: 0.6; }

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
      font-size: 0.75rem;
      font-weight: 600;
      opacity: 0.7;
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
      background: rgba(255, 255, 255, 0.03);
      border-radius: 4px;
      padding: 3px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .day-matrix-cell.other-month { opacity: 0.3; }
    .day-matrix-cell.today {
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid #38bdf8;
    }
    .cell-num {
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1;
      margin-bottom: 2px;
    }
    .cell-events {
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
    }
    .cell-event-chip {
      font-size: 0.6rem;
      color: #000;
      font-weight: 600;
      padding: 1px 3px;
      border-radius: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .more-dots { font-size: 0.55rem; opacity: 0.7; line-height: 1; }
    .empty-state { opacity: 0.5; font-size: 0.85rem; margin-top: 16px; text-align: center; }
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
    return [
      { name: 'Kids', url: '', color: '#ec4899' },
      { name: 'Work', url: '', color: '#3b82f6' },
      { name: 'Family', url: '', color: '#10b981' }
    ];
  }

  constructor(private http: HttpClient, private icalParser: ICalParserService) {}

  ngOnInit(): void {
    this.fetchCalendars();
    this.buildMonthGrid();
    this.pollSub = interval(900000).subscribe(() => this.fetchCalendars());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.fetchCalendars();
      this.buildMonthGrid();
    }
  }

  fetchCalendars(): void {
    const feeds = this.activeFeeds.filter(f => !!f.url);
    if (feeds.length === 0) {
      this.events = this.defaultEvents;
      this.buildMonthGrid();
      return;
    }

    const requests = feeds.map(feed => {
      const proxyUrl = `${environment.apiUrl}/proxy.php?action=fetch_ical&url=${encodeURIComponent(feed.url)}`;
      return this.http.get(proxyUrl, { responseType: 'text' }).pipe(
        catchError(() => of(''))
      );
    });

    forkJoin(requests).subscribe(results => {
      let combined: CalendarEvent[] = [];
      results.forEach((rawIcal, idx) => {
        if (rawIcal) {
          const parsed = this.icalParser.parse(rawIcal, feeds[idx].name, feeds[idx].color);
          combined = combined.concat(parsed);
        }
      });

      combined.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      this.events = combined.length > 0 ? combined : this.defaultEvents;
      this.buildMonthGrid();
    });
  }

  buildMonthGrid(): void {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sun, 1 = Mon ...

    const grid: MonthDay[] = [];

    // Fill days (35 cells: 5 weeks)
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
