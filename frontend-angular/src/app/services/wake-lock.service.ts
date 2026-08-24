import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WakeLockService {
  private wakeLock: any = null;
  private isSupported: boolean = false;

  constructor() {
    this.isSupported = 'wakeLock' in navigator;
    
    // Re-acquire lock when page regains visibility (e.g. iPad app switch)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.requestWakeLock();
        }
      });
    }
  }

  async requestWakeLock(): Promise<void> {
    if (!this.isSupported) {
      this.activateNoSleepFallback();
      return;
    }

    try {
      this.wakeLock = await (navigator as any).wakeLock.request('screen');
      this.wakeLock.addEventListener('release', () => {
        this.wakeLock = null;
      });
    } catch (err) {
      console.warn('Wake Lock request failed, falling back to ambient video loop:', err);
      this.activateNoSleepFallback();
    }
  }

  releaseWakeLock(): void {
    if (this.wakeLock) {
      this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
    }
  }

  // Fallback for older iOS / Android TV browsers: tiny silent video loop keeps display awake
  private activateNoSleepFallback(): void {
    if (typeof document === 'undefined') return;
    let videoEl = document.getElementById('wake-lock-video') as HTMLVideoElement;
    if (!videoEl) {
      videoEl = document.createElement('video');
      videoEl.id = 'wake-lock-video';
      videoEl.setAttribute('playsinline', '');
      videoEl.setAttribute('muted', '');
      videoEl.style.position = 'fixed';
      videoEl.style.top = '-100px';
      videoEl.style.left = '-100px';
      videoEl.style.width = '1px';
      videoEl.style.height = '1px';
      videoEl.style.opacity = '0.01';
      // 1-pixel transparent webm base64 video loop
      videoEl.src = 'data:video/webm;base64,GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYUkoAk4EBq1ZfVlA5gQECGkFfVlA5gQECU4EBgQFwUkF3QECBAACBAQCBAAA=';
      videoEl.loop = true;
      videoEl.muted = true;
      document.body.appendChild(videoEl);
    }
    videoEl.play().catch(() => {});
  }
}
