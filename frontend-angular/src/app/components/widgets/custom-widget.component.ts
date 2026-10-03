import {
  AfterViewInit,
  Component,
  DoCheck,
  ElementRef,
  Inject,
  Input,
  NgZone,
  OnDestroy,
  Optional,
  ViewChild
} from '@angular/core';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { Observable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ClockService } from '../../services/clock.service';
import { NextEventSnapshot, WeatherSnapshot, WidgetBusService } from '../../services/widget-bus.service';
import { LIVE_DISPLAY } from './widget-context';

/** Config for the `custom` widget type (Widget SDK). See docs/WIDGET_SDK.md. */
export interface CustomWidgetConfig {
  /** Where the widget's code comes from. */
  source?: 'html' | 'url';
  /** Inline HTML document (source = 'html'); rendered via iframe srcdoc. */
  html?: string;
  /** https:// page to embed (source = 'url'). */
  url?: string;
  /** Optional header above the frame; hidden when empty. */
  title?: string;
  /** Reload the frame every N minutes; 0 / empty = never. */
  refreshMinutes?: number;
  /** Free-form JSON string handed to the widget as `settings` in sd:init. */
  settings?: string;
  /** Adds `allow-popups` to the sandbox (links with target=_blank). Off by default. */
  allowPopups?: boolean;
}

/** Version of the host <-> widget postMessage protocol. */
export const WIDGET_SDK_VERSION = 1;

/** Theme tokens resolved on the host and sent to widgets in sd:init. */
export const WIDGET_SDK_TOKENS = [
  '--sd-canvas-bg',
  '--sd-surface',
  '--sd-surface-2',
  '--sd-surface-3',
  '--sd-border-color',
  '--sd-border-width',
  '--sd-border',
  '--sd-radius',
  '--sd-radius-sm',
  '--sd-text',
  '--sd-text-muted',
  '--sd-text-subtle',
  '--sd-text-shadow',
  '--sd-accent',
  '--sd-on-accent',
  '--sd-accent-soft',
  '--sd-accent-border',
  '--sd-success',
  '--sd-success-soft',
  '--sd-warning',
  '--sd-warning-soft',
  '--sd-danger',
  '--sd-danger-soft',
  '--sd-info',
  '--sd-weight-display',
  '--sd-fs-xs',
  '--sd-fs-sm',
  '--sd-fs-body',
  '--sd-fs-title',
  '--sd-fs-lg',
  '--sd-fs-xl',
  '--sd-fs-hero'
] as const;

type BusTopic = 'weather' | 'nextEvent';

/**
 * Custom widget (Widget SDK): runs third-party HTML/JS inside a sandboxed iframe and talks to it
 * only through a small, versioned postMessage protocol (sd:init / sd:tick / sd:data → widget,
 * sd:ready → host). The frame gets `sandbox="allow-scripts"` and never `allow-same-origin`, so it
 * runs in an opaque origin: no access to the host DOM, cookies, storage, auth tokens or APIs.
 */
@Component({
  selector: 'app-custom-widget',
  template: `
    <div class="custom-card sd-card">
      <div class="custom-header" *ngIf="config?.title">
        <span class="custom-title">{{ config.title }}</span>
      </div>

      <div class="custom-body">
        <app-widget-state
          *ngIf="mode === 'empty'"
          kind="empty"
          message="No custom code yet"
          hint="Paste HTML or an https link in the editor."
        ></app-widget-state>

        <app-widget-state
          *ngIf="mode === 'error'"
          kind="error"
          message="Only https:// links can be embedded"
          [hint]="errorHint"
        ></app-widget-state>

        <!--
          sandbox / referrerpolicy are static attributes on purpose: Angular forbids binding them on
          <iframe>, and a static value can't be widened by config. Hence one element per
          (source x popups) variant; switching variants re-creates the frame, which is also required
          because sandbox flags only apply on navigation. src and srcdoc are never bound to null
          (that would load the literal "null"). The *ngFor over [frameKey] re-creates the iframe
          whenever the source changes or the periodic refresh fires.
        -->
        <ng-container *ngIf="mode === 'frame'">
          <ng-container *ngFor="let k of [frameKey]">
            <ng-container *ngIf="safeHtml">
              <iframe *ngIf="!popups" #frame class="custom-frame" sandbox="allow-scripts"
                referrerpolicy="no-referrer" [attr.title]="frameTitle" [srcdoc]="safeHtml"
                (load)="onFrameLoad()"></iframe>
              <iframe *ngIf="popups" #frame class="custom-frame" sandbox="allow-scripts allow-popups"
                referrerpolicy="no-referrer" [attr.title]="frameTitle" [srcdoc]="safeHtml"
                (load)="onFrameLoad()"></iframe>
            </ng-container>
            <ng-container *ngIf="safeUrl">
              <iframe *ngIf="!popups" #frame class="custom-frame" sandbox="allow-scripts"
                referrerpolicy="no-referrer" [attr.title]="frameTitle" [src]="safeUrl"
                (load)="onFrameLoad()"></iframe>
              <iframe *ngIf="popups" #frame class="custom-frame" sandbox="allow-scripts allow-popups"
                referrerpolicy="no-referrer" [attr.title]="frameTitle" [src]="safeUrl"
                (load)="onFrameLoad()"></iframe>
            </ng-container>
          </ng-container>
        </ng-container>

        <div class="settings-warning" *ngIf="settingsError && !isLive" role="status">
          Settings JSON is invalid and was ignored: {{ settingsError }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .custom-card {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .custom-header {
      padding: 6px 12px;
      border-bottom: var(--sd-border);
      flex-shrink: 0;
    }
    .custom-title {
      display: block;
      font-size: var(--sd-fs-sm);
      font-weight: 700;
      color: var(--sd-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .custom-body {
      position: relative;
      flex: 1;
      min-height: 0;
      display: flex;
    }
    .custom-frame {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: 0;
      background: transparent;
      /* Must match the framed document's default scheme, or browsers paint an opaque backdrop */
      color-scheme: normal;
    }
    .settings-warning {
      position: absolute;
      left: 6px;
      right: 6px;
      bottom: 6px;
      padding: 4px 8px;
      font-size: var(--sd-fs-xs);
      color: var(--sd-warning);
      background: var(--sd-warning-soft);
      border: var(--sd-border-width) solid var(--sd-warning);
      border-radius: var(--sd-radius-sm);
      pointer-events: none;
    }
  `]
})
export class CustomWidgetComponent implements DoCheck, AfterViewInit, OnDestroy {
  @Input() config: CustomWidgetConfig = {};

  @ViewChild('frame') frameRef?: ElementRef<HTMLIFrameElement>;

  mode: 'empty' | 'error' | 'frame' = 'empty';
  popups = false;
  safeHtml: SafeHtml | null = null;
  safeUrl: SafeResourceUrl | null = null;
  errorHint = '';
  settingsError = '';
  /** Bumped to re-create the iframe (source change or periodic refresh). */
  frameKey = 0;

  readonly isLive: boolean;

  get frameTitle(): string {
    return this.config?.title || 'Custom widget';
  }

  private settings: unknown = {};
  private frameSig = '';
  private settingsRaw: string | undefined | null = null;
  private refreshMinutes = -1;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private frameLoaded = false;
  private lastThemeSig = '';
  private busValues: Partial<Record<BusTopic, unknown>> = {};
  private themeObserver: MutationObserver | null = null;
  private subs = new Subscription();
  private readonly onMessage = (event: MessageEvent) => this.handleMessage(event);

  constructor(
    private sanitizer: DomSanitizer,
    private host: ElementRef<HTMLElement>,
    private zone: NgZone,
    private clock: ClockService,
    private bus: WidgetBusService,
    @Optional() @Inject(LIVE_DISPLAY) live: boolean | null
  ) {
    this.isLive = !!live;

    // sd:tick on minute boundaries only (ClockService ticks every second)
    this.subs.add(
      this.clock.tick$
        .pipe(filter(d => d.getSeconds() === 0))
        .subscribe(d => this.post({ type: 'sd:tick', now: d.toISOString() }))
    );

    // sd:data whenever a bus topic changes (BehaviorSubject replays the current value)
    this.subscribeTopic('weather', this.bus.select('weather'));
    this.subscribeTopic('nextEvent', this.bus.select('nextEvent'));
  }

  // The editor mutates config in place (ngModel), so ngOnChanges alone would miss edits.
  ngDoCheck(): void {
    const c = this.config || {};
    const source = c.source === 'url' ? 'url' : 'html';
    const popups = !!c.allowPopups;
    const body = source === 'url' ? (c.url || '').trim() : (c.html || '');
    const sig = `${source}\u0000${popups}\u0000${body}`;

    if (sig !== this.frameSig) {
      this.frameSig = sig;
      this.popups = popups;
      this.buildSource(source, body);
    }

    if (c.settings !== this.settingsRaw) {
      this.settingsRaw = c.settings;
      this.parseSettings(c.settings);
      this.sendInit();
    }

    const minutes = Math.max(0, Number(c.refreshMinutes) || 0);
    if (minutes !== this.refreshMinutes) {
      this.refreshMinutes = minutes;
      this.setupRefresh(minutes);
    }
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => window.addEventListener('message', this.onMessage));
    this.observeTheme();
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.onMessage);
    this.themeObserver?.disconnect();
    this.subs.unsubscribe();
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  onFrameLoad(): void {
    this.frameLoaded = true;
    this.sendInit();
  }

  // ---------------------------------------------------------------- source

  private buildSource(source: 'html' | 'url', body: string): void {
    this.frameLoaded = false;
    this.safeHtml = null;
    this.safeUrl = null;
    this.errorHint = '';

    if (!body.trim()) {
      this.mode = 'empty';
      return;
    }

    if (source === 'html') {
      // bypassSecurityTrustHtml is acceptable ONLY because this markup never touches the host
      // document: it is rendered as the srcdoc of an iframe whose sandbox is "allow-scripts" without
      // "allow-same-origin", i.e. an opaque, unique origin. Scripts there cannot read the host DOM,
      // cookies, localStorage, or make credentialed same-origin requests, and cannot navigate the top
      // window. Never reuse this value anywhere else (e.g. [innerHTML]).
      this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(body);
      this.mode = 'frame';
      this.frameKey++;
      return;
    }

    let parsed: URL | null = null;
    try {
      parsed = new URL(body);
    } catch {
      parsed = null;
    }
    if (!parsed || parsed.protocol !== 'https:') {
      this.mode = 'error';
      this.errorHint = parsed ? `"${parsed.protocol}" links are not allowed.` : 'That does not look like a valid link.';
      return;
    }
    // Validated https URL, embedded in the same sandboxed (opaque-origin) iframe.
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(parsed.href);
    this.mode = 'frame';
    this.frameKey++;
  }

  private setupRefresh(minutes: number): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = null;
    if (minutes > 0) {
      this.refreshTimer = setInterval(() => {
        if (this.mode === 'frame') {
          this.frameLoaded = false;
          this.frameKey++;
        }
      }, minutes * 60_000);
    }
  }

  private parseSettings(raw: unknown): void {
    this.settingsError = '';
    if (raw === undefined || raw === null || (typeof raw === 'string' && !raw.trim())) {
      this.settings = {};
      return;
    }
    if (typeof raw !== 'string') {
      // Tolerate an object stored directly in config; clone so the widget can't share references
      this.settings = this.cloneJson(raw);
      return;
    }
    try {
      this.settings = JSON.parse(raw);
    } catch (e) {
      this.settings = {};
      this.settingsError = e instanceof Error ? e.message : 'parse error';
    }
  }

  // ---------------------------------------------------------------- protocol

  private sendInit(): void {
    if (!this.frameLoaded) return;
    const theme = this.readTheme();
    this.lastThemeSig = JSON.stringify(theme);
    this.post({
      type: 'sd:init',
      version: WIDGET_SDK_VERSION,
      settings: this.settings,
      theme,
      isLive: this.isLive,
      locale: navigator.language || 'en-US',
      timeZone: this.timeZone()
    });
    // Replay the latest bus values right after init
    (Object.keys(this.busValues) as BusTopic[]).forEach(topic =>
      this.post({ type: 'sd:data', topic, value: this.busValues[topic] })
    );
  }

  private subscribeTopic(topic: BusTopic, source$: Observable<WeatherSnapshot | NextEventSnapshot | null>): void {
    this.subs.add(
      source$.subscribe(value => {
        this.busValues[topic] = this.cloneJson(value);
        this.post({ type: 'sd:data', topic, value: this.busValues[topic] });
      })
    );
  }

  /** Posts only to this widget's own frame. targetOrigin '*' is required: the frame's origin is opaque ("null"). */
  private post(message: Record<string, unknown>): void {
    if (!this.frameLoaded) return;
    const win = this.frameRef?.nativeElement.contentWindow;
    if (!win) return;
    try {
      win.postMessage(message, '*');
    } catch {
      /* non-cloneable payload or frame gone: drop it */
    }
  }

  private handleMessage(event: MessageEvent): void {
    const win = this.frameRef?.nativeElement.contentWindow;
    // Accept messages from our own frame only — never from other frames, windows or the host.
    if (!win || event.source !== win) return;
    const data = event.data;
    if (!data || typeof data !== 'object' || typeof data.type !== 'string') return;

    switch (data.type) {
      case 'sd:ready':
        // The widget may be ready before/after the load event; either way reply with init.
        this.frameLoaded = true;
        this.sendInit();
        break;
      case 'sd:resize-request':
        // Reserved for a future version: the host decides layout, widgets cannot resize themselves.
        break;
      default:
        // Unknown messages are ignored. Nothing a widget sends is ever evaluated or navigated to.
        break;
    }
  }

  // ---------------------------------------------------------------- theme

  private themeElement(): HTMLElement | null {
    return this.host.nativeElement.closest<HTMLElement>('[class*="sd-theme-"]');
  }

  private readTheme(): { name: string; tokens: Record<string, string>; fontFamily: string } {
    const el = this.host.nativeElement;
    const themed = this.themeElement();
    const match = themed ? /(?:^|\s)sd-theme-([a-z0-9-]+)/.exec(themed.className) : null;
    const style = getComputedStyle(el);
    const tokens: Record<string, string> = {};
    for (const name of WIDGET_SDK_TOKENS) {
      const value = style.getPropertyValue(name).trim();
      if (value) tokens[name] = value;
    }
    return { name: match ? match[1] : 'glass', tokens, fontFamily: style.fontFamily };
  }

  /** Re-send sd:init when the canvas theme (class) or accent override (inline style) changes. */
  private observeTheme(): void {
    const target = this.themeElement();
    if (!target || typeof MutationObserver === 'undefined') return;
    this.zone.runOutsideAngular(() => {
      this.themeObserver = new MutationObserver(() => {
        if (!this.frameLoaded) return;
        if (JSON.stringify(this.readTheme()) !== this.lastThemeSig) this.sendInit();
      });
      this.themeObserver.observe(target, { attributes: true, attributeFilter: ['class', 'style'] });
    });
  }

  // ---------------------------------------------------------------- utils

  private timeZone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }

  private cloneJson(value: unknown): unknown {
    try {
      return value === undefined ? null : JSON.parse(JSON.stringify(value));
    } catch {
      return null;
    }
  }
}
