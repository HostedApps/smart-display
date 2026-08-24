import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FinancialAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  type: 'crypto' | 'stock';
  sparkline: number[];
}

@Component({
  selector: 'app-stock-crypto-widget',
  template: `
    <div class="market-card">
      <div class="market-header">
        <div class="title-group">
          <svg class="market-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
          </svg>
          <h3 class="widget-title">Markets</h3>
        </div>
        <span class="currency-tag">{{ config.currency || 'USD' }}</span>
      </div>

      <div class="asset-grid">
        <div *ngFor="let asset of assetList" class="asset-item">
          <div class="asset-left">
            <span class="symbol">{{ asset.symbol }}</span>
            <span class="name">{{ asset.name }}</span>
          </div>

          <div class="sparkline-wrap" *ngIf="config.showSparklines !== false">
            <svg class="sparkline-svg" viewBox="0 0 60 20">
              <path 
                [attr.d]="generateSparklinePath(asset.sparkline)" 
                [attr.stroke]="asset.change24h >= 0 ? '#10b981' : '#ef4444'" 
                fill="none" 
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>

          <div class="asset-right">
            <span class="price">\${{ asset.price | number:'1.2-2' }}</span>
            <span class="change-badge" [class.positive]="asset.change24h >= 0" [class.negative]="asset.change24h < 0">
              {{ asset.change24h >= 0 ? '+' : '' }}{{ asset.change24h | number:'1.2-2' }}%
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .market-card {
      height: 100%;
      box-sizing: border-box;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 14px 16px;
      backdrop-filter: blur(16px);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .market-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .title-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .market-icon {
      width: 16px;
      height: 16px;
      color: #10b981;
    }
    .widget-title {
      font-size: 0.95rem;
      font-weight: 600;
      margin: 0;
      color: #ffffff;
    }
    .currency-tag {
      font-size: 0.65rem;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.06);
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .asset-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
      overflow-y: auto;
      flex: 1;
    }
    .asset-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.04);
      transition: background 0.2s;
    }
    .asset-item:hover {
      background: rgba(255, 255, 255, 0.06);
    }
    .asset-left {
      display: flex;
      flex-direction: column;
      width: 75px;
    }
    .symbol {
      font-size: 0.9rem;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.2px;
    }
    .name {
      font-size: 0.65rem;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sparkline-wrap {
      width: 55px;
      height: 18px;
    }
    .sparkline-svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .asset-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .price {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: 0.95rem;
      font-weight: 600;
      color: #ffffff;
      font-variant-numeric: tabular-nums;
    }
    .change-badge {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 4px;
      font-variant-numeric: tabular-nums;
      margin-top: 1px;
    }
    .change-badge.positive {
      color: #34d399;
      background: rgba(16, 185, 129, 0.15);
    }
    .change-badge.negative {
      color: #f87171;
      background: rgba(239, 68, 68, 0.15);
    }
  `]
})
export class StockCryptoWidgetComponent implements OnInit, OnDestroy, OnChanges {
  @Input() config: any = {
    cryptoIds: ['bitcoin', 'ethereum', 'solana'],
    symbols: ['AAPL', 'NVDA'],
    currency: 'USD',
    showSparklines: true,
    refreshMinutes: 5
  };

  private pollSub?: Subscription;

  assetList: FinancialAsset[] = [
    { symbol: 'BTC', name: 'Bitcoin', price: 68420.50, change24h: 3.42, type: 'crypto', sparkline: [10, 12, 11, 14, 13, 16, 18] },
    { symbol: 'ETH', name: 'Ethereum', price: 3540.20, change24h: -1.15, type: 'crypto', sparkline: [18, 16, 17, 14, 15, 13, 11] },
    { symbol: 'SOL', name: 'Solana', price: 178.90, change24h: 5.80, type: 'crypto', sparkline: [10, 11, 13, 12, 15, 17, 19] },
    { symbol: 'AAPL', name: 'Apple Inc.', price: 224.23, change24h: 1.05, type: 'stock', sparkline: [12, 13, 14, 13, 15, 16, 17] },
    { symbol: 'NVDA', name: 'Nvidia Corp.', price: 128.60, change24h: 4.25, type: 'stock', sparkline: [11, 13, 12, 15, 14, 18, 20] }
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchMarketData();
    this.startPolling();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.fetchMarketData();
      this.startPolling();
    }
  }

  private startPolling(): void {
    this.pollSub?.unsubscribe();
    const intervalMins = Math.max(1, Number(this.config.refreshMinutes) || 5);
    this.pollSub = interval(intervalMins * 60 * 1000).subscribe(() => this.fetchMarketData());
  }

  fetchMarketData(): void {
    const cryptoCoins = (this.config.cryptoIds || ['bitcoin', 'ethereum', 'solana']).join(',');
    const url = `${environment.apiUrl}/proxy.php?action=fetch_crypto&coins=${encodeURIComponent(cryptoCoins)}&currencies=usd`;

    this.http.get<any>(url).subscribe({
      next: (data) => {
        if (!data) return;
        if (data.bitcoin) {
          this.updateAsset('BTC', data.bitcoin.usd, data.bitcoin.usd_24h_change);
        }
        if (data.ethereum) {
          this.updateAsset('ETH', data.ethereum.usd, data.ethereum.usd_24h_change);
        }
        if (data.solana) {
          this.updateAsset('SOL', data.solana.usd, data.solana.usd_24h_change);
        }
      },
      error: () => {}
    });
  }

  private updateAsset(symbol: string, price: number, change: number): void {
    const item = this.assetList.find(a => a.symbol === symbol);
    if (item && price) {
      item.price = price;
      item.change24h = change || 0;
    }
  }

  generateSparklinePath(data: number[]): string {
    if (!data || data.length < 2) return 'M 0 10 L 60 10';
    const width = 60;
    const height = 20;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = (max - min) || 1;

    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)} ${y.toFixed(1)}`;
    });

    return `M ${points.join(' L ')}`;
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }
}
