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
      localStorage.setItem(this.CACHE_KEY_PREFIX + token, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage cache write error:', e);
    }
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
