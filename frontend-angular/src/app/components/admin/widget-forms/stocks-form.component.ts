import { Component } from '@angular/core';
import { ConfigField } from '../../widgets/widget-config-schema';
import { WidgetFormBase } from './widget-form-base';

const DISPLAY_FIELDS: readonly ConfigField[] = [
  { type: 'select', key: 'mode', label: 'Display Mode', row: 'display', options: [
    { value: 'all', label: 'Combined (Stocks & Crypto)' },
    { value: 'stocks', label: 'Stocks Only' },
    { value: 'crypto', label: 'Crypto Only' },
  ] },
  { type: 'select', key: 'currency', label: 'Currency', row: 'display', options: [
    { value: 'USD', label: 'USD ($)' }, { value: 'EUR', label: 'EUR (€)' }, { value: 'GBP', label: 'GBP (£)' },
    { value: 'CAD', label: 'CAD ($)' }, { value: 'INR', label: 'INR (₹)' },
  ] },
  { type: 'toggle', key: 'showSparklines', label: 'Show Mini Trend Sparklines' },
];

/** Comma-separated text ⇄ array, normalised (stock symbols upper case, crypto ids lower case) */
function toList(value: unknown, normalise: (s: string) => string): string[] {
  if (Array.isArray(value)) return value;
  return typeof value === 'string' ? value.split(',').map(s => normalise(s.trim())).filter(Boolean) : [];
}

@Component({
  selector: 'app-stocks-form',
  template: `
    <div class="widget-form">
      <div class="form-group">
        <label>Widget Title</label>
        <input type="text" [(ngModel)]="config['title']" placeholder="Markets & Stocks" class="input-control" />
      </div>
      <div class="form-group">
        <label>Stock Symbols (comma separated)</label>
        <input type="text" [ngModel]="text('symbols')" (ngModelChange)="setSymbols($event)" placeholder="AAPL, TSLA, NVDA, SPY, MSFT, GOOGL" class="input-control" />
        <div class="quick-tags-row">
          <span class="quick-tag-label">Quick Add:</span>
          <button *ngFor="let s of quickStocks" type="button" (click)="addStock(s)" class="tag-pill">+ {{ s }}</button>
        </div>
      </div>
      <div class="form-group">
        <label>Crypto IDs (comma separated)</label>
        <input type="text" [ngModel]="text('cryptoIds')" (ngModelChange)="setCrypto($event)" placeholder="bitcoin, ethereum, solana, dogecoin" class="input-control" />
        <div class="quick-tags-row">
          <span class="quick-tag-label">Quick Add:</span>
          <button *ngFor="let c of quickCrypto" type="button" (click)="addCrypto(c.id)" class="tag-pill">+ {{ c.label }}</button>
        </div>
      </div>
    </div>
    <app-widget-config-form [config]="config" [fields]="fields"></app-widget-config-form>
  `,
  styleUrls: ['./widget-forms.css']
})
export class StocksFormComponent extends WidgetFormBase {
  readonly fields = DISPLAY_FIELDS;
  readonly quickStocks = ['AAPL', 'TSLA', 'NVDA', 'SPY', 'MSFT'];
  readonly quickCrypto = [{ id: 'bitcoin', label: 'BTC' }, { id: 'ethereum', label: 'ETH' }, { id: 'solana', label: 'SOL' }];

  text(key: 'symbols' | 'cryptoIds'): string {
    const v = this.config[key];
    if (!v) return '';
    return Array.isArray(v) ? v.join(', ') : String(v);
  }

  setSymbols(text: string): void {
    this.config['symbols'] = text.split(',').map(s => s.trim().toUpperCase()).filter(s => !!s);
  }

  setCrypto(text: string): void {
    this.config['cryptoIds'] = text.split(',').map(s => s.trim().toLowerCase()).filter(s => !!s);
  }

  addStock(sym: string): void {
    const list = [...toList(this.config['symbols'], s => s.toUpperCase())];
    if (!list.includes(sym)) this.config['symbols'] = [...list, sym];
  }

  addCrypto(id: string): void {
    const list = [...toList(this.config['cryptoIds'], s => s.toLowerCase())];
    if (!list.includes(id)) this.config['cryptoIds'] = [...list, id];
  }
}
