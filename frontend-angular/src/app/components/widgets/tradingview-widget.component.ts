import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TradingViewConfig } from '../../models/display.model';

@Component({
  selector: 'app-tradingview-widget',
  template: `
    <div class="tradingview-card" [class.light-mode]="config.theme === 'light'">
      <!-- Header -->
      <div class="tv-header">
        <div class="tv-badge">
          <svg viewBox="0 0 36 28" width="16" height="13" fill="none" class="tv-icon">
            <path d="M14 22H7V6h7v16z" fill="#2962FF"/>
            <path d="M22 22h-7V11h7v11z" fill="#00E676"/>
            <path d="M30 22h-7V2h7v20z" fill="#FF5252"/>
          </svg>
          <span class="tv-symbol-name">{{ displaySymbol }}</span>
        </div>
        <div class="tv-meta">
          <span class="tv-interval-chip">{{ config.interval || '1D' }}</span>
          <span class="tv-custom-title" *ngIf="config.title">{{ config.title }}</span>
        </div>
      </div>

      <!-- TradingView Embed Iframe -->
      <div class="tv-frame-container">
        <iframe
          *ngIf="safeEmbedUrl"
          [src]="safeEmbedUrl"
          class="tv-iframe"
          frameborder="0"
          scrolling="no"
          allowtransparency="true"
        ></iframe>

        <div *ngIf="!safeEmbedUrl" class="tv-empty-state">
          <span class="tv-empty-title">TradingView Chart</span>
          <span class="tv-empty-desc">Configuring chart...</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tradingview-card {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      border-radius: 16px;
      overflow: hidden;
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(10, 15, 26, 0.85));
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .tradingview-card.light-mode {
      background: linear-gradient(135deg, rgba(248, 250, 252, 0.95), rgba(241, 245, 249, 0.9));
      border: 1px solid rgba(0, 0, 0, 0.08);
      color: #0f172a;
    }

    .tv-header {
      padding: 6px 12px;
      background: rgba(0, 0, 0, 0.35);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      height: 32px;
      box-sizing: border-box;
    }

    .light-mode .tv-header {
      background: rgba(255, 255, 255, 0.6);
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }

    .tv-badge {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .tv-symbol-name {
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #f8fafc;
    }

    .light-mode .tv-symbol-name {
      color: #0f172a;
    }

    .tv-meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tv-interval-chip {
      font-size: 0.65rem;
      font-weight: 700;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 1px 6px;
      border-radius: 6px;
    }

    .tv-custom-title {
      font-size: 0.72rem;
      color: #94a3b8;
    }

    .tv-frame-container {
      flex: 1;
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
    }

    .tv-iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }

    .tv-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #64748b;
      gap: 4px;
    }

    .tv-empty-title {
      font-weight: 600;
      font-size: 0.9rem;
      color: #94a3b8;
    }

    .tv-empty-desc {
      font-size: 0.75rem;
    }
  `]
})
export class TradingviewWidgetComponent implements OnChanges {
  @Input() config: TradingViewConfig = {
    symbol: 'NASDAQ:AAPL',
    interval: '1D',
    theme: 'dark',
    chartStyle: '1',
    showVolume: true
  };

  safeEmbedUrl: SafeResourceUrl | null = null;
  displaySymbol = 'AAPL';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    this.updateEmbedUrl();
  }

  private updateEmbedUrl(): void {
    const rawSymbol = (this.config.symbol || 'NASDAQ:AAPL').trim();
    this.displaySymbol = rawSymbol.includes(':') ? rawSymbol.split(':')[1] : rawSymbol;
    
    // Normalize interval: "1D" -> "D", "1W" -> "W", "1M" -> "M", or minutes "60", "15"
    let interval = this.config.interval || 'D';
    if (interval === '1D') interval = 'D';
    if (interval === '1W') interval = 'W';
    if (interval === '1M') interval = 'M';

    const theme = this.config.theme === 'light' ? 'light' : 'dark';
    const style = this.config.chartStyle || '1'; // 1=Candles, 2=Line, 3=Area

    // Build TradingView embed URL
    const params = new URLSearchParams({
      symbol: rawSymbol,
      interval: interval,
      theme: theme,
      style: style,
      timezone: 'exchange',
      withdateranges: '1',
      hide_side_toolbar: '1',
      allow_symbol_change: '0',
      save_image: '0',
      studies: this.config.showVolume ? '["Volume@tv-basicstudies"]' : '[]',
      locale: 'en'
    });

    const url = `https://s.tradingview.com/widgetembed/?${params.toString()}`;
    this.safeEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
