import { Component, Input, OnInit } from '@angular/core';

export interface ButtonConfig {
  label?: string;
  icon?: string;
  url?: string;
  style?: 'solid' | 'outline' | 'gradient';
}

@Component({
  selector: 'app-button-widget',
  template: `
    <div class="button-card">
      <button 
        type="button"
        class="touch-action-btn"
        [class.style-gradient]="currentStyle === 'gradient'"
        [class.style-solid]="currentStyle === 'solid'"
        [class.style-outline]="currentStyle === 'outline'"
        [class.has-url]="hasUrl"
        (click)="handleClick()"
        [title]="safeConfig.url ? 'Open: ' + safeConfig.url : safeConfig.label"
      >
        <div class="btn-content">
          <span class="btn-icon" *ngIf="safeConfig.icon">{{ safeConfig.icon }}</span>
          <span class="btn-label">{{ safeConfig.label }}</span>
          <span class="btn-ext-indicator" *ngIf="hasUrl">
            <svg class="ext-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </span>
        </div>
      </button>
    </div>
  `,
  styles: [`
    .button-card {
      height: 100%;
      box-sizing: border-box;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 12px;
      backdrop-filter: blur(16px);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
      display: flex;
      align-items: stretch;
      justify-content: stretch;
      overflow: hidden;
      position: relative;
    }

    .touch-action-btn {
      width: 100%;
      height: 100%;
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      outline: none;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      padding: 16px;
      box-sizing: border-box;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .touch-action-btn:hover {
      transform: translateY(-2px) scale(1.01);
    }

    .touch-action-btn:active {
      transform: translateY(1px) scale(0.98);
    }

    /* Style variants */
    .style-gradient {
      background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
      border: 1px solid rgba(255, 255, 255, 0.25);
      box-shadow: 0 10px 25px -5px rgba(139, 92, 246, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.4);
      color: #ffffff;
    }

    .style-gradient:hover {
      box-shadow: 0 14px 28px -4px rgba(139, 92, 246, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.5);
    }

    .style-solid {
      background-color: #4f46e5;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.3);
      color: #ffffff;
    }

    .style-solid:hover {
      background-color: #4338ca;
      box-shadow: 0 14px 28px -4px rgba(79, 70, 229, 0.65);
    }

    .style-outline {
      background: rgba(255, 255, 255, 0.04);
      border: 2px solid rgba(255, 255, 255, 0.85);
      box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.3), inset 0 0 12px rgba(255, 255, 255, 0.05);
      color: #ffffff;
    }

    .style-outline:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: #ffffff;
      box-shadow: 0 12px 24px -4px rgba(255, 255, 255, 0.25);
    }

    .btn-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      text-align: center;
      z-index: 1;
    }

    .btn-icon {
      font-size: clamp(2rem, 5vw, 3.2rem);
      line-height: 1;
      filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.3));
      display: block;
      transition: transform 0.2s ease;
    }

    .touch-action-btn:hover .btn-icon {
      transform: scale(1.1);
    }

    .btn-label {
      font-size: clamp(1rem, 2.2vw, 1.35rem);
      font-weight: 700;
      letter-spacing: -0.2px;
      line-height: 1.25;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
      display: block;
      word-break: break-word;
      padding: 0 8px;
    }

    .btn-ext-indicator {
      position: absolute;
      top: 10px;
      right: 12px;
      opacity: 0.65;
      display: flex;
      align-items: center;
      transition: opacity 0.2s ease;
    }

    .touch-action-btn:hover .btn-ext-indicator {
      opacity: 1;
    }

    .ext-icon {
      width: 14px;
      height: 14px;
      stroke: currentColor;
    }
  `]
})
export class ButtonWidgetComponent implements OnInit {
  @Input() config: any = {
    label: 'Open Link',
    icon: '🔗',
    url: '',
    style: 'gradient'
  };

  get safeConfig(): ButtonConfig {
    return {
      label: this.config?.label ?? 'Open Link',
      icon: this.config?.icon ?? '🔗',
      url: this.config?.url ?? '',
      style: this.config?.style ?? 'gradient'
    };
  }

  get currentStyle(): 'solid' | 'outline' | 'gradient' {
    const s = this.safeConfig.style;
    if (s === 'solid' || s === 'outline' || s === 'gradient') {
      return s;
    }
    return 'gradient';
  }

  get hasUrl(): boolean {
    return !!this.safeConfig.url && this.safeConfig.url.trim().length > 0;
  }

  ngOnInit(): void {}

  handleClick(): void {
    const rawUrl = this.safeConfig.url?.trim();
    if (!rawUrl) return;

    let targetUrl = rawUrl;
    if (!/^https?:\/\//i.test(targetUrl) && !/^mailto:/i.test(targetUrl) && !/^tel:/i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    try {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Failed to open widget link:', err);
    }
  }
}
