import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, Optional, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LIVE_DISPLAY } from './widget-context';
import { DataCacheService } from '../../services/data-cache.service';

const SECOND = 1000;

export interface FinancialAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  type: 'crypto' | 'stock';
  sparkline: number[];
  /** Set on live displays when no real quote could be fetched for this symbol. */
  unavailable?: boolean;
}

@Component({
  selector: 'app-stock-crypto-widget',
  template: `
    <div class="market-card sd-card">
      <div class="market-header">
        <div class="title-group">
          <svg class="market-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
          </svg>
          <h3 class="widget-title">{{ config.title || 'Markets & Stocks' }}</h3>
        </div>
        <div class="header-tags">
          <span class="view-tag" *ngIf="config.mode && config.mode !== 'all'">{{ config.mode | uppercase }}</span>
          <span class="currency-tag">{{ config.currency || 'USD' }}</span>
        </div>
      </div>

      <app-widget-state *ngIf="allUnavailable; else assetList" kind="error" message="Market data unavailable" hint="Couldn't reach the market data service. Retrying automatically."></app-widget-state>

      <ng-template #assetList>
      <div class="asset-grid" *ngIf="displayedAssets.length > 0; else noAssets">
        <div *ngFor="let asset of displayedAssets" class="asset-item">
          <div class="asset-left">
            <div class="symbol-row">
              <span class="symbol">{{ asset.symbol }}</span>
              <span class="type-badge" [class.type-crypto]="asset.type === 'crypto'">{{ asset.type === 'crypto' ? 'COIN' : 'STOCK' }}</span>
            </div>
            <span class="name">{{ asset.name }}</span>
          </div>

          <div class="sparkline-wrap" *ngIf="config.showSparklines !== false && !asset.unavailable && (!isLive || (asset.sparkline && asset.sparkline.length > 1))">
            <svg class="sparkline-svg" viewBox="0 0 60 20">
              <path 
                [attr.d]="generateSparklinePath(asset.sparkline)" 
                [style.stroke]="asset.change24h >= 0 ? 'var(--sd-success)' : 'var(--sd-danger)'" 
                fill="none" 
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>

          <div class="asset-right">
            <span class="price" *ngIf="asset.unavailable" title="Price unavailable">—</span>
            <span class="price" *ngIf="!asset.unavailable">{{ getCurrencySymbol() }}{{ asset.price | number:'1.2-2' }}</span>
            <span class="change-badge" *ngIf="!asset.unavailable" [class.positive]="asset.change24h >= 0" [class.negative]="asset.change24h < 0">
              {{ asset.change24h >= 0 ? '+' : '' }}{{ asset.change24h | number:'1.2-2' }}%
            </span>
          </div>
        </div>
      </div>

      <ng-template #noAssets>
        <div class="empty-state">
          <p>No symbols configured</p>
        </div>
      </ng-template>
      </ng-template>
    </div>
  `,
  styles: [`
    .market-card {
      height: 100%;
      box-sizing: border-box;
      padding: 14px 16px;
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
      border-bottom: var(--sd-border);
    }
    .title-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .market-icon {
      width: 16px;
      height: 16px;
      color: var(--sd-success);
    }
    .widget-title {
      font-size: var(--sd-fs-title);
      font-weight: 600;
      margin: 0;
      color: var(--sd-text);
    }
    .header-tags {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .view-tag {
      font-size: var(--sd-fs-xs);
      font-weight: 700;
      color: var(--sd-accent);
      background: var(--sd-accent-soft);
      padding: 1px 5px;
      border-radius: 4px;
    }
    .currency-tag {
      font-size: var(--sd-fs-xs);
      color: var(--sd-text-muted);
      background: var(--sd-surface-2);
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
    .asset-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-y: auto;
      flex: 1;
      padding-right: 2px;
    }
    .asset-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px;
      background: var(--sd-surface-2);
      border-radius: var(--sd-radius-sm);
      border: var(--sd-border);
      transition: all 0.2s;
    }
    .asset-item:hover {
      background: var(--sd-surface-3);
    }
    .asset-left {
      display: flex;
      flex-direction: column;
      min-width: 70px;
    }
    .symbol-row {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .symbol {
      font-weight: 700;
      font-size: var(--sd-fs-body);
      color: var(--sd-text);
      letter-spacing: 0.5px;
    }
    .type-badge {
      font-size: var(--sd-fs-xs);
      font-weight: 800;
      color: var(--sd-text-muted);
      background: var(--sd-surface-3);
      padding: 1px 4px;
      border-radius: 3px;
    }
    .type-badge.type-crypto {
      color: var(--sd-warning);
      background: var(--sd-warning-soft);
    }
    .name {
      font-size: var(--sd-fs-xs);
      color: var(--sd-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 90px;
    }
    .sparkline-wrap {
      width: 60px;
      height: 20px;
      margin: 0 8px;
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
      font-size: var(--sd-fs-body);
      font-weight: 600;
      color: var(--sd-text);
      font-variant-numeric: tabular-nums;
    }
    .change-badge {
      font-size: var(--sd-fs-xs);
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
      font-variant-numeric: tabular-nums;
      margin-top: 1px;
    }
    .change-badge.positive {
      color: var(--sd-success);
      background: var(--sd-success-soft);
    }
    .change-badge.negative {
      color: var(--sd-danger);
      background: var(--sd-danger-soft);
    }
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--sd-text-subtle);
      font-size: var(--sd-fs-sm);
    }
  `]
})
export class StockCryptoWidgetComponent implements OnInit, OnDestroy, OnChanges {
  @Input() config: any = {
    title: 'Markets & Stocks',
    symbols: ['AAPL', 'TSLA', 'NVDA', 'SPY'],
    cryptoIds: ['bitcoin', 'ethereum', 'solana'],
    mode: 'all', // 'all' | 'stocks' | 'crypto'
    currency: 'USD',
    showSparklines: true,
    refreshMinutes: 3
  };

  private pollSub?: Subscription;

  stockAssets: FinancialAsset[] = [];
  cryptoAssets: FinancialAsset[] = [];

  readonly isLive: boolean;

  constructor(private dataCache: DataCacheService, private http: HttpClient, @Optional() @Inject(LIVE_DISPLAY) live: boolean | null) {
    this.isLive = !!live;
  }

  /** True when every displayed symbol failed to load (live displays only). */
  get allUnavailable(): boolean {
    const assets = this.displayedAssets;
    return assets.length > 0 && assets.every(a => a.unavailable);
  }

  get displayedAssets(): FinancialAsset[] {
    const mode = this.config.mode || 'all';
    if (mode === 'stocks') return this.stockAssets;
    if (mode === 'crypto') return this.cryptoAssets;
    return [...this.stockAssets, ...this.cryptoAssets];
  }

  getCurrencySymbol(): string {
    const c = (this.config.currency || 'USD').toUpperCase();
    switch (c) {
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'CAD': return 'CA$';
      case 'INR': return '₹';
      case 'JPY': return '¥';
      default: return '$';
    }
  }

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
    const intervalMins = Math.max(1, Number(this.config.refreshMinutes) || 3);
    this.pollSub = interval(intervalMins * 60 * 1000).subscribe(() => this.fetchMarketData());
  }

  fetchMarketData(): void {
    this.fetchStocks();
    this.fetchCrypto();
  }

  private fetchStocks(): void {
    let syms: string[] = [];
    if (Array.isArray(this.config.symbols)) {
      syms = this.config.symbols;
    } else if (typeof this.config.symbols === 'string' && this.config.symbols.trim()) {
      syms = this.config.symbols.split(',').map((s: string) => s.trim().toUpperCase()).filter((s: string) => !!s);
    } else {
      syms = ['AAPL', 'TSLA', 'NVDA', 'SPY'];
    }

    if (syms.length === 0) {
      this.stockAssets = [];
      return;
    }

    const url = `${environment.apiUrl}/proxy.php?action=fetch_stocks&symbols=${encodeURIComponent(syms.join(','))}`;
    this.dataCache.get<any>(url, 30 * SECOND)
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (res && res.success && Array.isArray(res.stocks)) {
          this.stockAssets = res.stocks;
        } else if (this.isLive) {
          // Never fabricate prices on a live display: mark each symbol unavailable
          this.stockAssets = syms.map(sym => this.unavailableAsset(sym, sym, 'stock'));
        } else {
          // Fallback mock representation if network drops
          this.stockAssets = syms.map(sym => ({
            symbol: sym,
            name: `${sym} Equity`,
            price: 150.0 + (sym.charCodeAt(0) * 1.5),
            change24h: 1.25,
            type: 'stock',
            sparkline: [148, 149, 151, 150, 152]
          }));
        }
      });
  }

  private fetchCrypto(): void {
    let coins: string[] = [];
    if (Array.isArray(this.config.cryptoIds)) {
      coins = this.config.cryptoIds;
    } else if (typeof this.config.cryptoIds === 'string' && this.config.cryptoIds.trim()) {
      coins = this.config.cryptoIds.split(',').map((s: string) => s.trim().toLowerCase()).filter((s: string) => !!s);
    } else {
      coins = ['bitcoin', 'ethereum', 'solana'];
    }

    if (coins.length === 0) {
      this.cryptoAssets = [];
      return;
    }

    const url = `${environment.apiUrl}/proxy.php?action=fetch_crypto&coins=${encodeURIComponent(coins.join(','))}&currencies=usd`;
    this.dataCache.get<any>(url, 30 * SECOND)
      .pipe(catchError(() => of(null)))
      .subscribe(data => {
        const cryptoMeta: { [key: string]: { symbol: string; name: string } } = {
          bitcoin: { symbol: 'BTC', name: 'Bitcoin' },
          ethereum: { symbol: 'ETH', name: 'Ethereum' },
          solana: { symbol: 'SOL', name: 'Solana' },
          dogecoin: { symbol: 'DOGE', name: 'Dogecoin' },
          cardano: { symbol: 'ADA', name: 'Cardano' },
          ripple: { symbol: 'XRP', name: 'XRP' }
        };

        if (!data) {
          if (this.isLive) {
            this.cryptoAssets = coins.map(coin => {
              const meta = cryptoMeta[coin] || { symbol: coin.toUpperCase().substring(0, 4), name: coin };
              return this.unavailableAsset(meta.symbol, meta.name, 'crypto');
            });
          }
          return;
        }

        this.cryptoAssets = coins.map(coin => {
          const coinData = data[coin];
          const meta = cryptoMeta[coin] || { symbol: coin.toUpperCase().substring(0, 4), name: coin };
          if (this.isLive && (coinData?.usd === undefined || coinData?.usd === null)) {
            return this.unavailableAsset(meta.symbol, meta.name, 'crypto');
          }
          const price = coinData?.usd || 0;
          const change = coinData?.usd_24h_change || 0;
          return {
            symbol: meta.symbol,
            name: meta.name,
            price: price,
            change24h: change,
            type: 'crypto',
            // No price history is fetched, so this sparkline is illustrative only: omit it on live
            sparkline: this.isLive ? [] : [price * 0.98, price * 0.99, price * 1.01, price * 1.0, price]
          } as FinancialAsset;
        });
      });
  }

  private unavailableAsset(symbol: string, name: string, type: 'crypto' | 'stock'): FinancialAsset {
    return { symbol, name, price: 0, change24h: 0, type, sparkline: [], unavailable: true };
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
