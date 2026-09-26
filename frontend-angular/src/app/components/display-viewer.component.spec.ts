import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { DisplayViewerComponent } from './display-viewer.component';
import { Widget, DisplayPage } from '../models/display.model';

describe('DisplayViewerComponent (Scheduling Engine & Block Layers)', () => {
  let component: DisplayViewerComponent;
  let fixture: ComponentFixture<DisplayViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DisplayViewerComponent],
      imports: [HttpClientTestingModule, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(DisplayViewerComponent);
    component = fixture.componentInstance;
  });

  it('should create display viewer component', () => {
    expect(component).toBeTruthy();
  });

  describe('isWidgetScheduledActive', () => {
    const baseWidget: Widget = {
      id: 1,
      type: 'clock',
      position: { x: 0, y: 0, width: 300, height: 200 },
      config: {}
    };

    it('should return true when schedule is not enabled or undefined', () => {
      const w: Widget = { ...baseWidget };
      expect(component.isWidgetScheduledActive(w, new Date())).toBeTrue();

      w.schedule = { enabled: false, startTime: '08:00', endTime: '17:00' };
      expect(component.isWidgetScheduledActive(w, new Date())).toBeTrue();
    });

    it('should return false if widget is hidden', () => {
      const w: Widget = { ...baseWidget, hidden: true };
      expect(component.isWidgetScheduledActive(w, new Date())).toBeFalse();
    });

    it('should correctly filter daytime hours (09:00 - 17:00)', () => {
      const w: Widget = {
        ...baseWidget,
        schedule: { enabled: true, startTime: '09:00', endTime: '17:00' }
      };

      // 12:30 PM -> Active
      const noon = new Date(2026, 8, 26, 12, 30);
      expect(component.isWidgetScheduledActive(w, noon)).toBeTrue();

      // 08:30 AM -> Inactive
      const morning = new Date(2026, 8, 26, 8, 30);
      expect(component.isWidgetScheduledActive(w, morning)).toBeFalse();

      // 19:00 PM -> Inactive
      const evening = new Date(2026, 8, 26, 19, 0);
      expect(component.isWidgetScheduledActive(w, evening)).toBeFalse();
    });

    it('should correctly filter overnight hours spanning midnight (22:00 - 06:00)', () => {
      const w: Widget = {
        ...baseWidget,
        schedule: { enabled: true, startTime: '22:00', endTime: '06:00' }
      };

      // 23:30 -> Active
      const lateNight = new Date(2026, 8, 26, 23, 30);
      expect(component.isWidgetScheduledActive(w, lateNight)).toBeTrue();

      // 03:00 AM -> Active
      const earlyMorning = new Date(2026, 8, 26, 3, 0);
      expect(component.isWidgetScheduledActive(w, earlyMorning)).toBeTrue();

      // 14:00 PM -> Inactive
      const afternoon = new Date(2026, 8, 26, 14, 0);
      expect(component.isWidgetScheduledActive(w, afternoon)).toBeFalse();
    });

    it('should correctly filter by day of week', () => {
      // Days: [1, 2, 3, 4, 5] (Monday through Friday)
      const w: Widget = {
        ...baseWidget,
        schedule: {
          enabled: true,
          startTime: '00:00',
          endTime: '23:59',
          days: [1, 2, 3, 4, 5]
        }
      };

      // 2026-09-28 is Monday (getDay() === 1) -> Active
      const monday = new Date(2026, 8, 28, 12, 0);
      expect(component.isWidgetScheduledActive(w, monday)).toBeTrue();

      // 2026-09-27 is Sunday (getDay() === 0) -> Inactive
      const sunday = new Date(2026, 8, 27, 12, 0);
      expect(component.isWidgetScheduledActive(w, sunday)).toBeFalse();
    });
  });

  describe('isPageScheduledActive', () => {
    it('should return true when page has no schedule or schedule is disabled', () => {
      const p: DisplayPage = { id: 'p1', name: 'Page 1', duration_seconds: 30 };
      expect(component.isPageScheduledActive(p, new Date())).toBeTrue();

      p.schedule = { enabled: false, startTime: '06:00', endTime: '12:00' };
      expect(component.isPageScheduledActive(p, new Date())).toBeTrue();
    });

    it('should respect page active time-of-day window', () => {
      const p: DisplayPage = {
        id: 'morning',
        name: 'Morning Routine',
        duration_seconds: 30,
        schedule: { enabled: true, startTime: '06:00', endTime: '10:00' }
      };

      const atEight = new Date(2026, 8, 26, 8, 0);
      expect(component.isPageScheduledActive(p, atEight)).toBeTrue();

      const atNoon = new Date(2026, 8, 26, 12, 0);
      expect(component.isPageScheduledActive(p, atNoon)).toBeFalse();
    });
  });
});
