import { Component, Input, OnInit, OnChanges, OnDestroy, DoCheck, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { ClockService } from '../../services/clock.service';
import { WidgetBusService } from '../../services/widget-bus.service';
import { hasPlaceholders, renderTemplate } from '../../utils/text-template.util';

@Component({
  selector: 'app-text-widget',
  template: `
    <div class="text-card sd-card">
      <div class="header-strip"></div>

      <div class="text-inner" [style.textAlign]="textAlign">
        <h2 class="text-title" *ngIf="renderedTitle">{{ renderedTitle }}</h2>
        <div 
          class="text-body" 
          [class.size-small]="fontSize === 'small'"
          [class.size-medium]="fontSize === 'medium'"
          [class.size-large]="fontSize === 'large'"
          [innerHTML]="sanitizedBody"
        ></div>
      </div>
    </div>
  `,
  styles: [`
    .text-card {
      height: 100%;
      box-sizing: border-box;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .header-strip {
      height: 4px;
      width: 100%;
      flex-shrink: 0;
      background: linear-gradient(90deg, #06b6d4, #3b82f6, #8b5cf6, #ec4899);
      opacity: 0.85;
    }

    .text-inner {
      flex: 1;
      padding: 20px 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }

    .text-title {
      margin: 0 0 12px 0;
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-weight: var(--sd-weight-display);
      font-size: var(--sd-fs-lg);
      letter-spacing: -0.3px;
      color: var(--sd-text);
      line-height: 1.25;
      text-shadow: var(--sd-text-shadow);
    }

    .text-body {
      font-family: var(--font-main, sans-serif);
      color: var(--sd-text);
      word-break: break-word;
      flex: 1;
    }

    .text-body.size-small {
      font-size: var(--sd-fs-body);
      line-height: 1.45;
    }

    .text-body.size-medium {
      font-size: var(--sd-fs-title);
      line-height: 1.55;
    }

    .text-body.size-large {
      font-size: var(--sd-fs-lg);
      line-height: 1.6;
    }

    /* Custom scrollbar for text overflow */
    .text-inner::-webkit-scrollbar {
      width: 4px;
    }
    .text-inner::-webkit-scrollbar-thumb {
      background: var(--sd-surface-3);
      border-radius: 4px;
    }
  `]
})
export class TextWidgetComponent implements OnInit, OnChanges, DoCheck, OnDestroy {
  @Input() config: any = {
    title: 'Announcement',
    body: 'Welcome to the Smart Display.\nStay tuned for updates and highlights.',
    fontSize: 'medium',
    textAlign: 'left'
  };

  sanitizedBody: string = '';
  /** Title after {{placeholders}} are filled in */
  renderedTitle: string = '';
  private lastSource = '';
  private lastMinute = -1;
  private subs: Subscription[] = [];

  constructor(private clock: ClockService, private bus: WidgetBusService) {}

  get fontSize(): 'small' | 'medium' | 'large' {
    return this.config?.fontSize || 'medium';
  }

  get textAlign(): 'left' | 'center' | 'right' {
    return this.config?.textAlign || 'left';
  }

  ngOnInit(): void {
    this.updateContent();
    // Live placeholders: refresh on each new minute and whenever shared weather/event data changes
    this.subs.push(
      this.clock.tick$.subscribe(now => {
        if (now.getMinutes() !== this.lastMinute && this.usesPlaceholders) this.updateContent();
      }),
      this.bus.select('weather').subscribe(() => this.usesPlaceholders && this.updateContent()),
      this.bus.select('nextEvent').subscribe(() => this.usesPlaceholders && this.updateContent())
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.updateContent();
  }

  /** The editor edits config in place, so compare the text cheaply to keep the preview live */
  ngDoCheck(): void {
    const source = `${this.config?.title ?? ''}\u0000${this.config?.body ?? ''}`;
    if (source !== this.lastSource) this.updateContent();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private get usesPlaceholders(): boolean {
    return hasPlaceholders(this.config?.body) || hasPlaceholders(this.config?.title);
  }

  private updateContent(): void {
    this.lastSource = `${this.config?.title ?? ''}\u0000${this.config?.body ?? ''}`;
    const now = new Date();
    this.lastMinute = now.getMinutes();
    const ctx = { now, weather: this.bus.snapshot('weather'), nextEvent: this.bus.snapshot('nextEvent') };
    this.renderedTitle = this.config?.title ? renderTemplate(String(this.config.title), ctx) : '';
    const raw = renderTemplate(String(this.config?.body ?? ''), ctx);
    // Sanitize special HTML characters to prevent XSS before transforming newlines to <br>
    const escaped = String(raw)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    this.sanitizedBody = escaped.replace(/\r?\n/g, '<br>');
  }
}
