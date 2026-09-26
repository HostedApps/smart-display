import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-text-widget',
  template: `
    <div class="text-card">
      <div class="header-strip"></div>

      <div class="text-inner" [style.textAlign]="textAlign">
        <h2 class="text-title" *ngIf="config?.title">{{ config.title }}</h2>
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
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      color: #ffffff;
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
      font-weight: 700;
      font-size: 1.35rem;
      letter-spacing: -0.3px;
      color: #ffffff;
      line-height: 1.25;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    }

    .text-body {
      font-family: var(--font-main, sans-serif);
      color: rgba(255, 255, 255, 0.9);
      word-break: break-word;
      flex: 1;
    }

    .text-body.size-small {
      font-size: 0.9rem;
      line-height: 1.45;
    }

    .text-body.size-medium {
      font-size: 1.1rem;
      line-height: 1.55;
    }

    .text-body.size-large {
      font-size: 1.35rem;
      line-height: 1.6;
    }

    /* Custom scrollbar for text overflow */
    .text-inner::-webkit-scrollbar {
      width: 4px;
    }
    .text-inner::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
    }
  `]
})
export class TextWidgetComponent implements OnInit, OnChanges {
  @Input() config: any = {
    title: 'Announcement',
    body: 'Welcome to the Smart Display.\nStay tuned for updates and highlights.',
    fontSize: 'medium',
    textAlign: 'left'
  };

  sanitizedBody: string = '';

  get fontSize(): 'small' | 'medium' | 'large' {
    return this.config?.fontSize || 'medium';
  }

  get textAlign(): 'left' | 'center' | 'right' {
    return this.config?.textAlign || 'left';
  }

  ngOnInit(): void {
    this.updateContent();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.updateContent();
  }

  private updateContent(): void {
    const raw = this.config?.body ?? '';
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
