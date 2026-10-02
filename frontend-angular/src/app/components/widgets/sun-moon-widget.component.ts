import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, DoCheck } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface SunMoonConfig {
  latitude?: number;
  longitude?: number;
  cityName?: string;
}

const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia'
};

@Component({
  selector: 'app-sun-moon-widget',
  template: `
    <div class="sun-moon-card sd-card">
      <!-- City & Date Header -->
      <div class="widget-header">
        <div class="city-badge">
          <svg class="loc-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"></path>
            <circle cx="12" cy="9" r="2.5"></circle>
          </svg>
          <span class="city-name">{{ displayCity }}</span>
        </div>
        <span class="header-date">{{ formattedDate }}</span>
      </div>

      <!-- Sun Row: Sunrise & Sunset -->
      <div class="sun-grid">
        <div class="sun-box sunrise-box">
          <span class="sun-icon">🌅</span>
          <div class="sun-text-col">
            <span class="sun-label">Sunrise</span>
            <span class="sun-time">{{ sunriseTime }}</span>
          </div>
        </div>

        <div class="sun-divider"></div>

        <div class="sun-box sunset-box">
          <span class="sun-icon">🌇</span>
          <div class="sun-text-col">
            <span class="sun-label">Sunset</span>
            <span class="sun-time">{{ sunsetTime }}</span>
          </div>
        </div>
      </div>

      <!-- Moon Phase Section -->
      <div class="moon-section">
        <div class="moon-emoji-wrap">
          <span class="moon-emoji">{{ moonEmoji }}</span>
        </div>
        <div class="moon-details">
          <span class="moon-phase-name">{{ moonPhaseName }}</span>
          <span class="moon-meta">{{ moonIllumination }}% illuminated</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sun-moon-card {
      height: 100%;
      box-sizing: border-box;
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      position: relative;
    }

    /* Header */
    .widget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .city-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .loc-pin {
      width: 14px;
      height: 14px;
      color: var(--sd-accent);
    }

    .city-name {
      font-size: var(--sd-fs-title);
      font-weight: 700;
      color: var(--sd-text);
      letter-spacing: -0.2px;
    }

    .header-date {
      font-size: var(--sd-fs-sm);
      font-weight: 500;
      color: var(--sd-text-muted);
      background: var(--sd-surface-2);
      padding: 2px 8px;
      border-radius: var(--sd-radius-sm);
      border: var(--sd-border);
    }

    /* Sun Grid */
    .sun-grid {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--sd-surface-2);
      border: var(--sd-border);
      border-radius: var(--sd-radius-sm);
      padding: 10px 14px;
      margin: 4px 0 10px 0;
    }

    .sun-box {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .sun-divider {
      width: 1px;
      height: 32px;
      background: var(--sd-border-color);
      margin: 0 12px;
    }

    .sun-icon {
      font-size: 1.5rem;
      line-height: 1;
      filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3));
    }

    .sun-text-col {
      display: flex;
      flex-direction: column;
    }

    .sun-label {
      font-size: var(--sd-fs-sm);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--sd-text-muted);
    }

    .sun-time {
      font-size: var(--sd-fs-title);
      font-weight: 700;
      color: var(--sd-text);
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.3px;
    }

    /* Moon Section */
    .moon-section {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 8px 12px;
      background: var(--sd-surface-2);
      border: var(--sd-border);
      border-radius: var(--sd-radius-sm);
    }

    .moon-emoji-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .moon-emoji {
      font-size: clamp(2rem, 5vw, 2.75rem);
      line-height: 1;
      filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.25));
    }

    .moon-details {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
    }

    .moon-phase-name {
      font-size: var(--sd-fs-title);
      font-weight: 700;
      color: var(--sd-text);
      letter-spacing: -0.1px;
    }

    .moon-meta {
      font-size: var(--sd-fs-sm);
      font-weight: 500;
      color: var(--sd-text-muted);
    }
  `]
})
export class SunMoonWidgetComponent implements OnInit, OnDestroy, OnChanges, DoCheck {
  @Input() config: any = {
    latitude: 37.3382,
    longitude: -121.8863,
    cityName: 'San Jose'
  };

  currentDate: Date = new Date();
  sunriseTime: string = '--:--';
  sunsetTime: string = '--:--';
  moonEmoji: string = '🌕';
  moonPhaseName: string = 'Full Moon';
  moonIllumination: number = 100;
  displayCity: string = 'San Jose';

  private refreshTimer: any;
  private lastGeocodedCity: string = '';
  private prevCitySnapshot: string = '';
  private debounceTimer: any;
  private geocoding: boolean = false;

  constructor(private http: HttpClient) {}

  get safeConfig(): SunMoonConfig {
    return {
      latitude: typeof this.config?.latitude === 'number' ? this.config.latitude : 37.3382,
      longitude: typeof this.config?.longitude === 'number' ? this.config.longitude : -121.8863,
      cityName: this.config?.cityName || 'San Jose'
    };
  }

  get formattedDate(): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[this.currentDate.getDay()]}, ${months[this.currentDate.getMonth()]} ${this.currentDate.getDate()}`;
  }

  ngOnInit(): void {
    this.displayCity = this.safeConfig.cityName || 'San Jose';
    this.geocodeAndCalculate();
    // Update every 10 minutes
    this.refreshTimer = setInterval(() => {
      this.currentDate = new Date();
      this.calculateEphemeris();
    }, 600000);
  }

  ngDoCheck(): void {
    const currentCity = (this.config?.cityName || '').trim();
    if (currentCity !== this.prevCitySnapshot) {
      this.prevCitySnapshot = currentCity;
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.geocodeAndCalculate();
      }, 400);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.geocodeAndCalculate();
    }
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    clearTimeout(this.debounceTimer);
  }

  private geocodeAndCalculate(): void {
    const cityName = (this.config?.cityName || '').trim();
    if (!cityName) {
      this.displayCity = 'San Jose';
      this.calculateEphemeris();
      return;
    }

    // If coordinates are manually set and city hasn't changed, just calculate
    if (cityName === this.lastGeocodedCity) {
      this.calculateEphemeris();
      return;
    }

    // Parse city and region hint (e.g. "Austin, TX" -> "Austin" + "TX")
    let queryCity = cityName;
    let regionHint: string | null = null;
    if (cityName.includes(',')) {
      const parts = cityName.split(',');
      queryCity = parts[0].trim();
      regionHint = parts[1].trim();
    }

    this.geocoding = true;
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryCity)}&count=10&language=en&format=json`;

    this.http.get<any>(geocodeUrl).pipe(
      catchError(() => of(null))
    ).subscribe(geoRes => {
      if (geoRes && geoRes.results && geoRes.results.length > 0) {
        const best = this.findBestGeocodeResult(geoRes.results, regionHint);
        this.applyGeoResult(cityName, best);
      } else if (cityName !== queryCity) {
        // Fallback: try raw query
        const rawUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=5&language=en&format=json`;
        this.http.get<any>(rawUrl).pipe(
          catchError(() => of(null))
        ).subscribe(fallbackRes => {
          if (fallbackRes && fallbackRes.results && fallbackRes.results.length > 0) {
            this.applyGeoResult(cityName, fallbackRes.results[0]);
          } else {
            this.displayCity = queryCity;
            this.geocoding = false;
            this.calculateEphemeris();
          }
        });
      } else {
        this.displayCity = queryCity;
        this.geocoding = false;
        this.calculateEphemeris();
      }
    });
  }

  private findBestGeocodeResult(results: any[], regionHint: string | null): any {
    if (!regionHint || results.length === 1) {
      return results[0];
    }
    const hintLower = regionHint.toLowerCase();
    const resolvedState = US_STATES[regionHint.toUpperCase()]?.toLowerCase();

    // Match on admin1 (e.g. "Texas" or "California")
    const matchAdmin = results.find((item: any) => {
      const admin = (item.admin1 || '').toLowerCase();
      return admin === hintLower || (resolvedState && admin === resolvedState);
    });
    if (matchAdmin) return matchAdmin;

    // Match country or country_code
    const matchCountry = results.find((item: any) => {
      const cCode = (item.country_code || '').toLowerCase();
      const country = (item.country || '').toLowerCase();
      return cCode === hintLower || country === hintLower;
    });
    if (matchCountry) return matchCountry;

    return results[0];
  }

  private applyGeoResult(query: string, item: any): void {
    this.lastGeocodedCity = query;
    this.config.latitude = item.latitude;
    this.config.longitude = item.longitude;
    this.displayCity = item.admin1 ? `${item.name}, ${item.admin1}` : (item.country ? `${item.name}, ${item.country}` : item.name);
    this.geocoding = false;
    this.calculateEphemeris();
  }

  calculateEphemeris(): void {
    const lat = this.safeConfig.latitude ?? 37.3382;
    const lng = this.safeConfig.longitude ?? -121.8863;
    const now = new Date();
    this.currentDate = now;

    // 1. Sunrise / Sunset calculation
    this.calculateSunTimes(lat, lng, now);

    // 2. Moon Phase calculation
    this.calculateMoonPhase();
  }

  private calculateSunTimes(lat: number, lng: number, date: Date): void {
    try {
      const startOfYear = new Date(date.getFullYear(), 0, 0);
      const diff = date.getTime() - startOfYear.getTime();
      const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

      const rad = Math.PI / 180;
      const deg = 180 / Math.PI;

      // Solar declination
      const declination = -23.44 * Math.cos(rad * (360 / 365) * (dayOfYear + 10));

      // Equation of time in minutes
      const b = rad * (360 / 365) * (dayOfYear - 81);
      const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);

      // Hour angle calculation with horizon refraction (-0.833 deg)
      const latRad = lat * rad;
      const decRad = declination * rad;
      const cosH = (Math.sin(-0.833 * rad) - Math.sin(latRad) * Math.sin(decRad)) /
                   (Math.cos(latRad) * Math.cos(decRad));

      const clampedCosH = Math.max(-1, Math.min(1, cosH));
      const hourAngleDeg = Math.acos(clampedCosH) * deg;
      const hourAngleHours = hourAngleDeg / 15;

      // Local timezone offset in hours
      const tzOffsetHours = -date.getTimezoneOffset() / 60;
      const solarNoon = 12 + (tzOffsetHours - lng / 15) - (eot / 60);

      const sunriseDecimal = solarNoon - hourAngleHours;
      const sunsetDecimal = solarNoon + hourAngleHours;

      this.sunriseTime = this.formatSolarTime(sunriseDecimal);
      this.sunsetTime = this.formatSolarTime(sunsetDecimal);
    } catch {
      this.sunriseTime = '06:30 AM';
      this.sunsetTime = '07:30 PM';
    }
  }

  private formatSolarTime(decimalHours: number): string {
    if (isNaN(decimalHours)) return '--:--';
    const totalMinutes = Math.round(((decimalHours % 24) + 24) % 24 * 60);
    const h24 = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    const period = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 || 12;
    const mStr = m < 10 ? '0' + m : '' + m;
    return `${h12}:${mStr} ${period}`;
  }

  private calculateMoonPhase(): void {
    // Formula specified:
    // const daysSinceNew = ((Date.now() / 86400000) - 10.7) % 29.53;
    // const phase = daysSinceNew / 29.53;
    const rawDays = ((Date.now() / 86400000) - 10.7) % 29.53;
    const daysSinceNew = ((rawDays % 29.53) + 29.53) % 29.53;
    const phase = daysSinceNew / 29.53;

    // Illumination approximate percentage
    this.moonIllumination = Math.round((1 - Math.cos(phase * 2 * Math.PI)) / 2 * 100);

    // 8 lunar phase segments of 0.125
    if (phase < 0.0625 || phase >= 0.9375) {
      this.moonEmoji = '🌑';
      this.moonPhaseName = 'New Moon';
    } else if (phase < 0.1875) {
      this.moonEmoji = '🌒';
      this.moonPhaseName = 'Waxing Crescent';
    } else if (phase < 0.3125) {
      this.moonEmoji = '🌓';
      this.moonPhaseName = 'First Quarter';
    } else if (phase < 0.4375) {
      this.moonEmoji = '🌔';
      this.moonPhaseName = 'Waxing Gibbous';
    } else if (phase < 0.5625) {
      this.moonEmoji = '🌕';
      this.moonPhaseName = 'Full Moon';
    } else if (phase < 0.6875) {
      this.moonEmoji = '🌖';
      this.moonPhaseName = 'Waning Gibbous';
    } else if (phase < 0.8125) {
      this.moonEmoji = '🌗';
      this.moonPhaseName = 'Last Quarter';
    } else {
      this.moonEmoji = '🌘';
      this.moonPhaseName = 'Waning Crescent';
    }
  }
}
