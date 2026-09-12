import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { WeatherWidgetComponent } from './weather-widget.component';

describe('WeatherWidgetComponent (Horizon 1: AQI, UV & Severe Alerts)', () => {
  let component: WeatherWidgetComponent;
  let fixture: ComponentFixture<WeatherWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WeatherWidgetComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(WeatherWidgetComponent);
    component = fixture.componentInstance;
  });

  it('should create weather widget component', () => {
    expect(component).toBeTruthy();
  });

  it('should compute correct AQI level and color scale', () => {
    component.config = { aqi: 42 };
    expect(component.displayAqi).toBe(42);
    expect(component.aqiLevel).toBe('Good');
    expect(component.aqiColor).toBe('#4ade80');

    component.config = { aqi: 120 };
    expect(component.displayAqi).toBe(120);
    expect(component.aqiLevel).toBe('Sensitive');
    expect(component.aqiColor).toBe('#fb923c');

    component.config = { aqi: 175 };
    expect(component.displayAqi).toBe(175);
    expect(component.aqiLevel).toBe('Unhealthy');
    expect(component.aqiColor).toBe('#f87171');
  });

  it('should compute correct UV index rating levels', () => {
    component.config = { uvIndex: 1 };
    expect(component.uvLevel).toBe('Low');

    component.config = { uvIndex: 5 };
    expect(component.uvLevel).toBe('Mod');

    component.config = { uvIndex: 8 };
    expect(component.uvLevel).toBe('V.High');

    component.config = { uvIndex: 11 };
    expect(component.uvLevel).toBe('Extreme');
  });

  it('should display active severe weather alert banner', () => {
    component.config = { alert: '⚡ Severe Thunderstorm Warning until 7:00 PM' };
    component.ngOnInit();
    expect(component.activeAlert).toBe('⚡ Severe Thunderstorm Warning until 7:00 PM');
  });
});
