import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, Optional, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { RssParserService, RssItem } from '../../services/rss-parser.service';
import { environment } from '../../../environments/environment';
import { LIVE_DISPLAY } from './widget-context';

@Component({
  selector: 'app-rss-widget',
  template: `
    <div class="rss-card">
      <div class="rss-header">
        <div class="header-left">
          <svg class="rss-icon" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="6.18" cy="17.82" r="2.18"></circle>
            <path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z"></path>
          </svg>
          <h3 class="widget-title">{{ config.title || feedTitle || 'Top Stories' }}</h3>
        </div>
        <span class="refresh-indicator" *ngIf="loading">Updating...</span>
      </div>

      <app-widget-state *ngIf="isLive && fetchFailed && items.length === 0; else feedBody" kind="error" message="News feed unavailable" hint="Couldn't load this feed. Retrying automatically."></app-widget-state>

      <ng-template #feedBody>
      <div class="rss-items" *ngIf="displayItems.length > 0; else emptyState">
        <div *ngFor="let item of displayItems | slice:0:(config.maxItems || 5)" class="news-item">
          <div class="news-top">
            <span class="news-title">{{ item.title }}</span>
            <span class="news-time" *ngIf="item.pubDate">{{ item.pubDate | date:'shortTime' }}</span>
          </div>
          <p class="news-desc" *ngIf="item.description">{{ item.description }}</p>
        </div>
      </div>

      <ng-template #emptyState>
        <div class="empty-state">
          <p *ngIf="loading">Fetching news headlines...</p>
          <p *ngIf="!loading && !config.feedUrl">No RSS feed configured</p>
          <p *ngIf="!loading && config.feedUrl">Unable to load feed content</p>
        </div>
      </ng-template>
      </ng-template>
    </div>
  `,
  styles: [`
    .rss-card {
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
    .rss-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .rss-icon {
      width: 16px;
      height: 16px;
      color: #f97316;
      filter: drop-shadow(0 0 6px rgba(249, 115, 22, 0.5));
    }
    .widget-title {
      font-size: 0.95rem;
      font-weight: 600;
      margin: 0;
      color: #ffffff;
    }
    .refresh-indicator {
      font-size: 0.65rem;
      color: #94a3b8;
      font-weight: 600;
    }
    .rss-items {
      display: flex;
      flex-direction: column;
      gap: 6px;
      overflow-y: auto;
      flex: 1;
    }
    .news-item {
      padding: 6px 10px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.04);
      display: flex;
      flex-direction: column;
      gap: 2px;
      transition: background 0.2s;
    }
    .news-item:hover {
      background: rgba(255, 255, 255, 0.06);
    }
    .news-top {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
    }
    .news-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: #ffffff;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .news-time {
      font-size: 0.65rem;
      color: #94a3b8;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    .news-desc {
      font-size: 0.75rem;
      color: #cbd5e1;
      line-height: 1.3;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: #94a3b8;
      font-size: 0.85rem;
    }
  `]
})
export class RssWidgetComponent implements OnInit, OnDestroy, OnChanges {
  @Input() config: any = {
    feedUrl: '',
    title: '',
    maxItems: 5,
    refreshIntervalMinutes: 15
  };

  feedTitle: string = '';
  items: RssItem[] = [];
  loading: boolean = false;
  fetchFailed: boolean = false;
  readonly isLive: boolean;
  private pollSub?: Subscription;

  private defaultItems: RssItem[] = [
    { title: 'NASA Webb Telescope captures stunning star cluster', description: 'Astronomers explore dense gravitational regions revealing thousands of young stars.', pubDate: new Date(Date.now() - 600000) },
    { title: 'Clean energy generation hits record global highs', description: 'Solar and wind infrastructure outpaced fossil fuel additions for the third straight year.', pubDate: new Date(Date.now() - 2700000) },
    { title: 'Major breakthrough in high-density solid-state batteries', description: 'New solid electrolyte enables 1,000-mile range and sub-10 minute charging cycles.', pubDate: new Date(Date.now() - 7200000) }
  ];

  get displayItems(): RssItem[] {
    if (this.isLive) return this.items;
    return this.items.length > 0 ? this.items : this.defaultItems;
  }

  constructor(
    private http: HttpClient,
    private rssParser: RssParserService,
    @Optional() @Inject(LIVE_DISPLAY) live: boolean | null
  ) {
    this.isLive = !!live;
  }

  ngOnInit(): void {
    this.fetchFeed();
    this.setupPolling();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.fetchFeed();
      this.setupPolling();
    }
  }

  private setupPolling(): void {
    this.pollSub?.unsubscribe();
    const intervalMins = Math.max(1, Number(this.config.refreshIntervalMinutes) || 15);
    this.pollSub = interval(intervalMins * 60 * 1000).subscribe(() => this.fetchFeed());
  }

  fetchFeed(): void {
    const url = this.config.feedUrl || 'https://feeds.bbci.co.uk/news/rss.xml';
    this.loading = true;
    const proxyUrl = `${environment.apiUrl}/proxy.php?action=fetch_rss&url=${encodeURIComponent(url)}`;

    this.http.get(proxyUrl, { responseType: 'text' }).subscribe({
      next: (xmlData) => {
        this.loading = false;
        this.fetchFailed = false;
        const result = this.rssParser.parse(xmlData);
        this.feedTitle = result.title;
        this.items = result.items;
      },
      error: () => {
        this.loading = false;
        this.fetchFailed = true;
      }
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }
}
