import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { RssParserService, RssItem } from '../../services/rss-parser.service';
import { environment } from '../../../environments/environment';

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
          <h3 class="widget-title">{{ config.title || feedTitle || 'News Headlines' }}</h3>
        </div>
        <span class="refresh-indicator" *ngIf="loading">Updating...</span>
      </div>

      <div class="rss-items" *ngIf="items.length > 0; else emptyState">
        <div *ngFor="let item of items | slice:0:(config.maxItems || 5)" class="news-item">
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
    </div>
  `,
  styles: [`
    .rss-card {
      height: 100%;
      box-sizing: border-box;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 16px;
      backdrop-filter: blur(8px);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .rss-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .rss-icon {
      width: 18px;
      height: 18px;
      color: #f97316;
    }
    .widget-title {
      font-size: 1.05rem;
      font-weight: 600;
      margin: 0;
      opacity: 0.9;
    }
    .refresh-indicator {
      font-size: 0.75rem;
      opacity: 0.6;
    }
    .rss-items {
      display: flex;
      flex-direction: column;
      gap: 10px;
      overflow-y: auto;
      flex: 1;
    }
    .news-item {
      padding: 8px 10px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .news-top {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
    }
    .news-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: #f1f5f9;
      line-height: 1.3;
    }
    .news-time {
      font-size: 0.75rem;
      opacity: 0.6;
      white-space: nowrap;
    }
    .news-desc {
      font-size: 0.8rem;
      opacity: 0.75;
      line-height: 1.35;
      margin: 0;
    }
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      opacity: 0.5;
      font-size: 0.9rem;
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
  private pollSub?: Subscription;

  constructor(private http: HttpClient, private rssParser: RssParserService) {}

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
        const result = this.rssParser.parse(xmlData);
        this.feedTitle = result.title;
        this.items = result.items;
      },
      error: (err) => {
        this.loading = false;
        console.error('Failed to fetch RSS feed:', err);
      }
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }
}
