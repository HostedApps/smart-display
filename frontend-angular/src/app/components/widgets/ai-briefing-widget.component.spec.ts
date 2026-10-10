import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AIBriefingWidgetComponent } from './ai-briefing-widget.component';
import { WidgetBusService } from '../../services/widget-bus.service';
import { LIVE_DISPLAY } from './widget-context';
import { environment } from '../../../environments/environment';

describe('AIBriefingWidgetComponent (honest context, Gemini back-off)', () => {
  let fixture: ComponentFixture<AIBriefingWidgetComponent>;
  let component: AIBriefingWidgetComponent;
  let http: HttpTestingController;
  let bus: WidgetBusService;
  const briefingUrl = `${environment.apiUrl}/ai_briefing.php`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AIBriefingWidgetComponent],
      imports: [HttpClientTestingModule],
      providers: [WidgetBusService, { provide: LIVE_DISPLAY, useValue: true }]
    }).compileComponents();

    fixture = TestBed.createComponent(AIBriefingWidgetComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    bus = TestBed.inject(WidgetBusService);
  });

  afterEach(() => http.verify());

  it('sends no weather or location when none is known (never "Sunny, 74°F")', fakeAsync(() => {
    component.config = { userName: 'Sam', tone: 'warm' };
    component.ngOnInit();
    tick(10_000); // waits for a weather widget that never publishes

    const req = http.expectOne(briefingUrl);
    expect(req.request.body.weather).toBe('');
    expect(req.request.body.location).toBe('');
    expect(req.request.body.localHour).toBe(new Date().getHours());
    expect(req.request.body.refreshHours).toBeGreaterThanOrEqual(2);
    req.flush({ success: true, briefing: 'Good evening, Sam!', provider: 'ambient_engine' });
    expect(component.displayedText).toBe('Good evening, Sam!');
    component.ngOnDestroy();
  }));

  it('uses the weather widget on the same screen when no location is set', fakeAsync(() => {
    bus.publish('weather', {
      city: 'San Jose', temp: 69.4, units: 'imperial', condition: 'Clear Sky', kind: 'clear', high: 76, updatedAt: Date.now()
    });
    component.config = {};
    component.ngOnInit();
    tick(0);

    const req = http.expectOne(briefingUrl);
    expect(req.request.body.location).toBe('San Jose');
    expect(req.request.body.weather).toBe('clear sky and 69°F (high 76°F)');
    req.flush({ success: true, briefing: 'ok', provider: 'gemini' });
    component.ngOnDestroy();
  }));

  it('ignores weather older than two hours', fakeAsync(() => {
    bus.publish('weather', {
      city: 'San Jose', temp: 69, units: 'imperial', condition: 'Clear Sky', kind: 'clear', updatedAt: Date.now() - 3 * 3600_000
    });
    component.config = {};
    component.ngOnInit();
    tick(0);

    const req = http.expectOne(briefingUrl);
    expect(req.request.body.weather).toBe('');
    req.flush({ success: true, briefing: 'ok', provider: 'ambient_engine' });
    component.ngOnDestroy();
  }));

  it('looks up weather for its own location', fakeAsync(() => {
    component.config = { city: 'Austin, TX', units: 'metric' };
    component.ngOnInit();
    tick(0);

    http.expectOne(r => r.url.startsWith('https://geocoding-api.open-meteo.com/')).flush({
      results: [
        { name: 'Austin', admin1: 'Minnesota', country: 'United States', country_code: 'US', latitude: 43.6, longitude: -92.9 },
        { name: 'Austin', admin1: 'Texas', country: 'United States', country_code: 'US', latitude: 30.27, longitude: -97.74 }
      ]
    });
    const forecast = http.expectOne(r => r.url.startsWith('https://api.open-meteo.com/'));
    expect(forecast.request.url).toContain('latitude=30.27');
    expect(forecast.request.url).toContain('temperature_unit=celsius');
    forecast.flush({
      current: { temperature_2m: 21.6, weather_code: 61 },
      daily: { temperature_2m_max: [24], temperature_2m_min: [15], precipitation_probability_max: [70] }
    });

    const req = http.expectOne(briefingUrl);
    expect(req.request.body.location).toBe('Austin, Texas');
    expect(req.request.body.weather).toMatch(/^.+ and 22°C \(high 24°C, low 15°C, 70% chance of rain\)$/);
    req.flush({ success: true, briefing: 'ok', provider: 'gemini' });
    component.ngOnDestroy();
  }));

  it('mentions only events from today or tomorrow', fakeAsync(() => {
    const inThreeDays = Date.now() + 3 * 24 * 3600_000;
    bus.publish('nextEvent', { title: 'Dentist', start: inThreeDays, allDay: false });
    component.config = { city: '' };
    bus.publish('weather', { city: 'X', temp: 1, units: 'metric', condition: '', kind: 'unknown', updatedAt: Date.now() });
    component.ngOnInit();
    tick(0);

    const req = http.expectOne(briefingUrl);
    expect(req.request.body.events).toBe('');
    req.flush({ success: true, briefing: 'ok', provider: 'gemini' });
    component.ngOnDestroy();
  }));

  it('waits at least as long as the server asks after a rate limit', fakeAsync(() => {
    bus.publish('weather', { city: 'X', temp: 1, units: 'metric', condition: 'Clear Sky', kind: 'clear', updatedAt: Date.now() });
    component.config = {};
    component.ngOnInit();
    tick(0);

    http.expectOne(briefingUrl).flush({
      success: true, briefing: 'Earlier briefing', provider: 'gemini', stale: true,
      geminiError: 'Gemini rate limit reached (HTTP 429).', retryAfter: 45 * 60
    });
    expect(component.displayedText).toBe('Earlier briefing');
    expect(component.stale).toBeTrue();

    tick(44 * 60_000);
    http.expectNone(briefingUrl);
    tick(2 * 60_000);
    http.expectOne(briefingUrl).flush({ success: true, briefing: 'Fresh', provider: 'gemini' });
    expect(component.displayedText).toBe('Fresh');
    component.ngOnDestroy();
  }));

  it('debounces editor typing into a single request', fakeAsync(() => {
    bus.publish('weather', { city: 'X', temp: 1, units: 'metric', condition: 'Clear Sky', kind: 'clear', updatedAt: Date.now() });
    component.config = { userName: '' };
    component.ngOnInit();
    tick(0);
    http.expectOne(briefingUrl).flush({ success: true, briefing: 'ok', provider: 'gemini' });

    for (const name of ['S', 'Sa', 'Sam']) {
      component.config = { userName: name };
      component.ngDoCheck();
      tick(300);
    }
    http.expectNone(briefingUrl);
    tick(1500);
    const req = http.expectOne(briefingUrl);
    expect(req.request.body.userName).toBe('Sam');
    req.flush({ success: true, briefing: 'ok', provider: 'gemini' });
    component.ngOnDestroy();
  }));
});
