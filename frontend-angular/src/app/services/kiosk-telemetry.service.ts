import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { APP_VERSION } from '../app-version';

export interface KioskState {
  pageIndex: number;
  sleeping: boolean;
  perfMode: boolean;
}

const HEARTBEAT_MS = 60_000;
const FIRST_THUMBNAIL_MS = 20_000;
const THUMBNAIL_EVERY_MS = 15 * 60_000;
const THUMBNAIL_WIDTH = 480;

/**
 * Kiosk → server telemetry for the fleet hub: a heartbeat every minute (online status, screen,
 * uptime, memory) and a small screenshot thumbnail every 15 minutes. Runs outside Angular so it
 * never triggers change detection; all failures are silent (the kiosk must keep running).
 */
@Injectable({ providedIn: 'root' })
export class KioskTelemetryService implements OnDestroy {
  private token = '';
  private getState: () => KioskState = () => ({ pageIndex: 0, sleeping: false, perfMode: false });
  private getCaptureElement: () => HTMLElement | null = () => null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private thumbTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly startedAt = Date.now();
  private capturing = false;

  constructor(private http: HttpClient, private zone: NgZone) {}

  start(token: string, getState: () => KioskState, getCaptureElement: () => HTMLElement | null): void {
    this.stop();
    this.token = token;
    this.getState = getState;
    this.getCaptureElement = getCaptureElement;
    this.zone.runOutsideAngular(() => {
      this.sendHeartbeat();
      this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), HEARTBEAT_MS);
      this.scheduleThumbnail(FIRST_THUMBNAIL_MS);
    });
  }

  stop(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.thumbTimer) clearTimeout(this.thumbTimer);
    this.heartbeatTimer = null;
    this.thumbTimer = null;
  }

  /** Capture and upload a screenshot now (remote "screenshot" command). */
  captureNow(): void {
    this.zone.runOutsideAngular(() => this.captureAndSend());
  }

  private scheduleThumbnail(delay: number): void {
    if (this.thumbTimer) clearTimeout(this.thumbTimer);
    this.thumbTimer = setTimeout(async () => {
      await this.captureAndSend();
      this.scheduleThumbnail(THUMBNAIL_EVERY_MS);
    }, delay);
  }

  private clientInfo(): Record<string, unknown> {
    const state = this.getState();
    const mem = (performance as any).memory;
    return {
      app_version: APP_VERSION,
      screen_w: window.screen?.width ?? null,
      screen_h: window.screen?.height ?? null,
      viewport_w: window.innerWidth,
      viewport_h: window.innerHeight,
      dpr: window.devicePixelRatio || 1,
      user_agent: navigator.userAgent.slice(0, 300),
      platform: (navigator as any).userAgentData?.platform || navigator.platform || '',
      uptime_s: Math.round((Date.now() - this.startedAt) / 1000),
      perf_mode: state.perfMode,
      heap_mb: mem?.usedJSHeapSize ? Math.round(mem.usedJSHeapSize / 1048576) : null,
      online: navigator.onLine,
      page_index: state.pageIndex,
      sleeping: state.sleeping
    };
  }

  private sendHeartbeat(thumbnail?: string): void {
    if (!this.token) return;
    const body: Record<string, unknown> = { token: this.token, client: this.clientInfo() };
    if (thumbnail) body['thumbnail'] = thumbnail;
    this.http.post(`${environment.apiUrl}/display_heartbeat.php`, body).subscribe({ error: () => { /* offline: try again next beat */ } });
  }

  private async captureAndSend(): Promise<void> {
    if (this.capturing || this.getState().sleeping) return;
    const el = this.getCaptureElement();
    if (!el || !el.offsetWidth) return;
    this.capturing = true;
    try {
      // Loaded on demand so the editor and admin pages never download it
      const html2canvas = (await import('html2canvas-pro')).default;
      const canvas = await html2canvas(el, {
        scale: THUMBNAIL_WIDTH / el.offsetWidth,
        useCORS: true,
        logging: false,
        backgroundColor: null
      });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      if (dataUrl.length > 20 && dataUrl.length < 400_000) {
        this.sendHeartbeat(dataUrl);
      }
    } catch (err) {
      // Cross-origin content, unsupported CSS or low memory: skip this thumbnail
      console.warn('[telemetry] thumbnail capture failed', err);
    } finally {
      this.capturing = false;
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
