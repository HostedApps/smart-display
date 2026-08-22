import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { ICalParserService, CalendarEvent } from '../../services/ical-parser.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-calendar-widget',
  template: `
    <div class="calendar-card">
      <h3 class="widget-title">{{ config.title || 'Upcoming Events' }}</h3>
      <div class="events-list" *ngIf="events.length > 0; else noEvents">
        <div *ngFor="let ev of events | slice:0:(config.maxEvents || 5)" class="event-item">
          <div class="event-date">
            <span class="event-day">{{ ev.startDate | date:'d' }}</span>
            <span class="event-month">{{ ev.startDate | date:'MMM' }}</span>
          </div>
          <div class="event-info">
            <div class="event-title">{{ ev.title }}</div>
            <div class="event-time" *ngIf="!ev.isAllDay">{{ ev.startDate | date:'shortTime' }} - {{ ev.endDate | date:'shortTime' }}</div>
            <div class="event-time" *ngIf="ev.isAllDay">All Day</div>
            <div class="event-location" *ngIf="ev.location">{{ ev.location }}</div>
          </div>
        </div>
      </div>
      <ng-template #noEvents><div class="empty-state">No upcoming events scheduled</div></ng-template>
    </div>
  `,
  styles: [`
    .calendar-card { height: 100%; box-sizing: border-box; background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 16px; backdrop-filter: blur(8px); display: flex; flex-direction: column; }
    .widget-title { font-size: 1.1rem; margin: 0 0 12px 0; font-weight: 600; opacity: 0.9; }
    .events-list { display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }
    .event-item { display: flex; align-items: center; gap: 12px; padding: 8px; background: rgba(255, 255, 255, 0.04); border-radius: 8px; }
    .event-date { display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.1); border-radius: 6px; min-width: 42px; padding: 4px; }
    .event-day { font-size: 1.1rem; font-weight: 700; line-height: 1; }
    .event-month { font-size: 0.75rem; text-transform: uppercase; opacity: 0.8; }
    .event-info { flex: 1; }
    .event-title { font-size: 0.95rem; font-weight: 600; }
    .event-time, .event-location { font-size: 0.8rem; opacity: 0.7; }
    .empty-state { opacity: 0.5; font-size: 0.9rem; margin-top: 16px; }
  `]
})
export class CalendarWidgetComponent implements OnInit, OnDestroy {
  @Input() config: any = { icalUrl: '', maxEvents: 5 };
  events: CalendarEvent[] = [];
  private pollSub?: Subscription;

  constructor(private http: HttpClient, private icalParser: ICalParserService) {}

  ngOnInit(): void {
    this.fetchCalendar();
    this.pollSub = interval(900000).subscribe(() => this.fetchCalendar());
  }

  fetchCalendar(): void {
    if (!this.config.icalUrl) return;
    const proxyUrl = `${environment.apiUrl}/proxy.php?action=fetch_ical&url=${encodeURIComponent(this.config.icalUrl)}`;

    this.http.get(proxyUrl, { responseType: 'text' }).subscribe({
      next: (rawIcal) => { this.events = this.icalParser.parse(rawIcal); },
      error: (err) => console.error('Failed to parse iCal feed:', err)
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }
}
