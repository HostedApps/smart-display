import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DisplayResponse } from '../models/display.model';

@Injectable({ providedIn: 'root' })
export class OfflineCacheService {
  private readonly CACHE_KEY_PREFIX = 'smart_display_cache_';
  private isOnlineSubject = new BehaviorSubject<boolean>(navigator.onLine);

  public isOnline$: Observable<boolean> = this.isOnlineSubject.asObservable();

  constructor() {
    window.addEventListener('online', () => this.isOnlineSubject.next(true));
    window.addEventListener('offline', () => this.isOnlineSubject.next(false));
  }

  saveDisplay(token: string, data: DisplayResponse): void {
    try {
      localStorage.setItem(this.CACHE_KEY_PREFIX + token, JSON.stringify(OfflineCacheService.withoutSecrets(data)));
    } catch (e) {
      console.warn('LocalStorage cache write error:', e);
    }
  }

  /**
   * Copy of the display without the secrets the server sent for this screen (listed per widget in
   * config._deviceSecrets). They're fetched fresh on every load and never written to storage.
   */
  static withoutSecrets(data: DisplayResponse): DisplayResponse {
    return {
      ...data,
      widgets: (data.widgets || []).map(w => {
        const secrets: string[] = Array.isArray(w.config?.['_deviceSecrets']) ? w.config['_deviceSecrets'] : [];
        if (!secrets.length) return w;
        const config = { ...w.config };
        for (const field of secrets) delete config[field];
        delete config['_deviceSecrets'];
        return { ...w, config };
      })
    };
  }

  getDisplay(token: string): DisplayResponse | null {
    try {
      const raw = localStorage.getItem(this.CACHE_KEY_PREFIX + token);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('LocalStorage cache read error:', e);
    }
    return null;
  }
}
