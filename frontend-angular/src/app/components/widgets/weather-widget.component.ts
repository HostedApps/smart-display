import { Component, Input, OnInit, OnDestroy } from '@angular/core';
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
    <div class="weather-card" *ngIf="currentWeather">
      <div class="current-weather">
        <div class="temp-group">
          <img [src]="getIconUrl(currentWeather.icon)" [alt]="currentWeather.desc" class="weather-icon" />
          <span class="temp">{{ currentWeather.temp | number:'1.0-0' }}°{{ config.units === 'imperial' ? 'F' : 'C' }}</span>
        </div>
        <div class="weather-details">
          <div class="city">{{ config.city }}</div>
          <div class="desc">{{ currentWeather.desc }}</div>
          <div class="sub-details">Humidity: {{ currentWeather.humidity }}% | Wind: {{ currentWeather.wind }} {{ config.units === 'imperial' ? 'mph' : 'm/s' }}</div>
        </div>
      </div>

      <div class="forecast-row" *ngIf="config.showForecast && forecast.length > 0">
        <div *ngFor="let item of forecast" class="forecast-item">
          <div class="forecast-day">{{ item.date | date:'EEE' }}</div>
          <img [src]="getIconUrl(item.icon)" class="forecast-icon" />
          <div class="forecast-temp">{{ item.temp | number:'1.0-0' }}°</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .weather-card { display: flex; flex-direction: column; height: 100%; box-sizing: border-box; background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 16px; backdrop-filter: blur(8px); }
    .current-weather { display: flex; align-items: center; gap: 16px; }
    .temp-group { display: flex; align-items: center; }
    .weather-icon { width: 64px; height: 64px; }
    .temp { font-size: 2.8rem; font-weight: 700; line-height: 1; }
    .weather-details .city { font-size: 1.25rem; font-weight: 600; }
    .weather-details .desc { text-transform: capitalize; font-size: 0.95rem; opacity: 0.8; }
    .sub-details { font-size: 0.8rem; opacity: 0.6; margin-top: 4px; }
    .forecast-row { display: flex; justify-content: space-between; margin-top: auto; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.1); }
    .forecast-item { text-align: center; }
    .forecast-day { font-size: 0.85rem; font-weight: 500; opacity: 0.8; }
    .forecast-icon { width: 36px; height: 36px; }
    .forecast-temp { font-size: 0.9rem; font-weight: 600; }
  `]
})
export class WeatherWidgetComponent implements OnInit, OnDestroy {
  @Input() config: any = {
    apiKey: '', city: 'San Jose', units: 'imperial', showForecast: true
  };

  currentWeather: any = null;
  forecast: ForecastItem[] = [];
  private pollSub?: Subscription;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchWeatherData();
    this.pollSub = interval(900000).subscribe(() => this.fetchWeatherData());
  }

  fetchWeatherData(): void {
    if (!this.config.apiKey || !this.config.city) return;
    const units = this.config.units || 'imperial';
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(this.config.city)}&units=${units}&appid=${this.config.apiKey}`;

    this.http.get<any>(url).subscribe({
      next: (data) => {
        if (!data || !data.list || data.list.length === 0) return;
        const current = data.list[0];
        this.currentWeather = { temp: current.main.temp, desc: current.weather[0].description, icon: current.weather[0].icon, humidity: current.main.humidity, wind: current.wind.speed };

        const dailyMap = new Map<string, any>();
        for (const item of data.list) {
          const dateStr = item.dt_txt.split(' ')[0];
          if (!dailyMap.has(dateStr) && dailyMap.size < 5) {
            dailyMap.set(dateStr, { date: item.dt_txt, temp: item.main.temp, icon: item.weather[0].icon, desc: item.weather[0].description });
          }
        }
        this.forecast = Array.from(dailyMap.values());
      },
      error: (err) => console.error('Failed to fetch weather data:', err)
    });
  }

  getIconUrl(iconCode: string): string {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }
}
