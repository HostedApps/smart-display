import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';

interface ForecastItem {
  date: string;
  temp: number;
  icon: string;
  desc: string;
}

@Component({
  selector: 'app-weather-widget',
  template: `
    <div class="weather-card">
      <div class="weather-main-row">
        <div class="weather-left">
          <div class="location-tag">
            <svg class="pin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span class="city-name">{{ config.city || 'San Jose' }}</span>
          </div>

          <div class="temp-display">
            <span class="temp-num">{{ displayWeather.temp | number:'1.0-0' }}</span>
            <span class="temp-unit">°{{ config.units === 'metric' ? 'C' : 'F' }}</span>
          </div>
          
          <span class="weather-desc">{{ displayWeather.desc }}</span>
        </div>

        <div class="weather-right">
          <div class="icon-aura">
            <img [src]="getIconUrl(displayWeather.icon)" [alt]="displayWeather.desc" class="weather-icon" />
          </div>
          
          <div class="metrics-column">
            <div class="metric-pill">
              <span class="metric-label">Humidity</span>
              <span class="metric-val">{{ displayWeather.humidity }}%</span>
            </div>
            <div class="metric-pill">
              <span class="metric-label">Wind</span>
              <span class="metric-val">{{ displayWeather.wind }} {{ config.units === 'metric' ? 'm/s' : 'mph' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 5-Day Mini Forecast -->
      <div class="forecast-section" *ngIf="config.showForecast !== false && displayForecast.length > 0">
        <div *ngFor="let item of displayForecast | slice:0:5" class="forecast-col">
          <span class="forecast-day">{{ item.date | date:'EEE' }}</span>
          <img [src]="getIconUrl(item.icon)" class="forecast-mini-icon" />
          <span class="forecast-temp">{{ item.temp | number:'1.0-0' }}°</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .weather-card {
      height: 100%;
      box-sizing: border-box;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 16px;
      backdrop-filter: blur(16px);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      position: relative;
    }
    .weather-main-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .weather-left {
      display: flex;
      flex-direction: column;
    }
    .location-tag {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 2px;
    }
    .pin-icon {
      width: 12px;
      height: 12px;
      color: var(--accent-blue, #0ea5e9);
    }
    .city-name {
      font-size: 0.8rem;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .temp-display {
      display: flex;
      align-items: baseline;
      line-height: 1;
      margin: 4px 0;
    }
    .temp-num {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: clamp(2.2rem, 5vw, 3.4rem);
      font-weight: 400;
      color: #ffffff;
      letter-spacing: -1px;
    }
    .temp-unit {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: 1.2rem;
      color: var(--accent-cyan, #06b6d4);
      font-weight: 500;
      margin-left: 2px;
    }
    .weather-desc {
      font-size: 0.85rem;
      color: #e2e8f0;
      font-weight: 500;
      text-transform: capitalize;
    }

    .weather-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }
    .icon-aura {
      width: 54px;
      height: 54px;
      background: radial-gradient(circle, rgba(14, 165, 233, 0.25) 0%, transparent 70%);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }
    .weather-icon {
      width: 52px;
      height: 52px;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
    }
    .metrics-column {
      display: flex;
      gap: 6px;
    }
    .metric-pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.07);
      padding: 3px 6px;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .metric-label {
      font-size: 0.55rem;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 600;
    }
    .metric-val {
      font-size: 0.7rem;
      font-weight: 700;
      color: #f1f5f9;
    }

    .forecast-section {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 4px;
      padding-top: 10px;
      margin-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .forecast-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: rgba(255, 255, 255, 0.03);
      padding: 4px 2px;
      border-radius: 6px;
    }
    .forecast-day {
      font-size: 0.65rem;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
    }
    .forecast-mini-icon {
      width: 26px;
      height: 26px;
      margin: 1px 0;
    }
    .forecast-temp {
      font-size: 0.75rem;
      font-weight: 700;
      color: #ffffff;
    }
  `]
})
export class WeatherWidgetComponent implements OnInit, OnDestroy, OnChanges {
  @Input() config: any = {
    apiKey: '',
    city: 'San Jose',
    units: 'imperial',
    showForecast: true
  };

  currentWeather: any = null;
  forecast: ForecastItem[] = [];
  private pollSub?: Subscription;

  private defaultWeather = {
    temp: 72,
    desc: 'Partly Cloudy',
    icon: '02d',
    humidity: 45,
    wind: 7
  };

  private defaultForecast: ForecastItem[] = [
    { date: new Date(Date.now() + 86400000).toISOString(), temp: 74, icon: '01d', desc: 'Sunny' },
    { date: new Date(Date.now() + 86400000 * 2).toISOString(), temp: 71, icon: '02d', desc: 'Partly Cloudy' },
    { date: new Date(Date.now() + 86400000 * 3).toISOString(), temp: 68, icon: '10d', desc: 'Light Rain' },
    { date: new Date(Date.now() + 86400000 * 4).toISOString(), temp: 73, icon: '01d', desc: 'Sunny' },
    { date: new Date(Date.now() + 86400000 * 5).toISOString(), temp: 75, icon: '02d', desc: 'Mostly Sunny' }
  ];

  get displayWeather(): any {
    return this.currentWeather || this.defaultWeather;
  }

  get displayForecast(): ForecastItem[] {
    return this.forecast.length > 0 ? this.forecast : this.defaultForecast;
  }

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchWeatherData();
    this.pollSub = interval(900000).subscribe(() => this.fetchWeatherData());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.fetchWeatherData();
    }
  }

  fetchWeatherData(): void {
    if (!this.config.apiKey || !this.config.city) return;
    const units = this.config.units || 'imperial';
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(this.config.city)}&units=${units}&appid=${this.config.apiKey}`;

    this.http.get<any>(url).subscribe({
      next: (data) => {
        if (!data || !data.list || data.list.length === 0) return;
        const current = data.list[0];
        this.currentWeather = {
          temp: current.main.temp,
          desc: current.weather[0].description,
          icon: current.weather[0].icon,
          humidity: current.main.humidity,
          wind: current.wind.speed
        };

        const dailyMap = new Map<string, any>();
        for (const item of data.list) {
          const dateStr = item.dt_txt.split(' ')[0];
          if (!dailyMap.has(dateStr) && dailyMap.size < 5) {
            dailyMap.set(dateStr, {
              date: item.dt_txt,
              temp: item.main.temp,
              icon: item.weather[0].icon,
              desc: item.weather[0].description
            });
          }
        }
        this.forecast = Array.from(dailyMap.values());
      },
      error: () => {}
    });
  }

  getIconUrl(iconCode: string): string {
    return `https://openweathermap.org/img/wn/${iconCode || '01d'}@2x.png`;
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }
}
