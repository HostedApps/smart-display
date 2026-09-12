import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CalendarWidgetComponent } from './calendar-widget.component';
import { ICalParserService } from '../../services/ical-parser.service';

describe('CalendarWidgetComponent (Horizon 1: AI Flyer & Direct Sync)', () => {
  let component: CalendarWidgetComponent;
  let fixture: ComponentFixture<CalendarWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CalendarWidgetComponent],
      imports: [HttpClientTestingModule],
      providers: [ICalParserService]
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarWidgetComponent);
    component = fixture.componentInstance;
  });

  it('should create the calendar widget component', () => {
    expect(component).toBeTruthy();
  });

  it('should merge AI-scanned customEvents into calendar events list', () => {
    component.config = {
      viewMode: 'agenda',
      feeds: [],
      customEvents: [
        {
          id: 'scan_1',
          title: 'Soccer Practice & Uniforms',
          startDate: '2026-09-20T16:30:00',
          endDate: '2026-09-20T18:00:00',
          isAllDay: false,
          location: 'Field 4',
          category: 'sports',
          color: '#10b981'
        }
      ]
    };

    component.fetchCalendars();
    expect(component.events.length).toBe(1);
    expect(component.events[0].title).toBe('Soccer Practice & Uniforms');
    expect(component.events[0].color).toBe('#10b981');
    expect(component.events[0].feedName).toContain('sports');
  });

  it('should build a 35-cell month grid matrix', () => {
    component.buildMonthGrid();
    expect(component.monthGrid.length).toBe(35);
  });
});
